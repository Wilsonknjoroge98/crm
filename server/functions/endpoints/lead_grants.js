const express = require('express');
const logger = require('firebase-functions/logger');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { supabaseService } = require('../services/supabase');

// Free leads an admin gives an agent, from the Refunds page.
//
// One Firestore transaction in GSQ's project adds the leads to the agent's
// balance (the same counters a purchase fills) and writes a lead_grants/{id}
// marker holding the whole grant, so leads are never added without a record.
// Then the grant is upserted into Supabase's lead_grants under the same id.
//
// The browser picks the id and keeps it until it gets a final answer, so a
// retry (double click, timeout, a 500 after the credit) sends the same id:
// the marker is already there, nothing is added again, and the Supabase row
// is filled in. Retrying is always safe.

// lead type -> the GSQ ledger collection, the counter that must already be
// there, the fields to increment, and the name used in the 409 message.
// Keep the keys in step with LEAD_TYPES in client/src/components/LeadGrants.jsx
// and the lead_type check in server/sql/add_lead_grants.sql.
const LEAD_TYPES = {
  gsq_verified: {
    collection: 'agents',
    counter: 'outstandingLeads',
    fields: ['verified', 'outstandingLeads'],
    product: 'web lead',
  },
  gsq_unverified: {
    collection: 'agents',
    counter: 'outstandingLeads',
    fields: ['unverified', 'outstandingLeads'],
    product: 'web lead',
  },
  // Keyley's pool, the one Keyley's lead routing draws from (gsq
  // functions/keyley/shared.js); every Keyley lead is verified
  keyley_verified: {
    collection: 'keyley',
    counter: 'outstandingKeyley',
    fields: ['outstandingKeyley'],
    product: 'Keyley lead',
  },
  gsq_instant_form: {
    collection: 'instant_forms',
    counter: 'outstandingInstantForms',
    fields: ['outstandingInstantForms'],
    product: 'instant form',
  },
  gsq_live_transfer: {
    collection: 'live_transfers',
    counter: 'outstandingLiveTransfers',
    fields: ['outstandingLiveTransfers'],
    product: 'live transfer',
  },
};

// GSQ Firestore collection holding one marker per grant, keyed by grant id
const MARKER_COLLECTION = 'lead_grants';

// a retried id must carry the grant it was first used for
const isSameGrant = (marker, grant) =>
  marker.agentEmail === grant.agentEmail &&
  marker.leadType === grant.leadType &&
  marker.quantity === grant.quantity;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LIST_FIELDS =
  'id,created_at,agent_id,agent_email,lead_type,quantity,reason,given_by,' +
  'agent:agents!lead_grants_agent_id_fkey(first_name,last_name,email),' +
  'given_by_agent:agents!lead_grants_given_by_fkey(first_name,last_name,email)';

const defaultCreateFirestore = () =>
  new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Forbidden' });

// Returns an error message, or null when the body is valid.
const validate = ({ id, agentId, leadType, quantity, reason } = {}) => {
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return 'Missing grant id; reload the page and try again';
  }
  if (typeof agentId !== 'string' || !UUID_RE.test(agentId)) {
    return 'Pick an agent';
  }
  if (!LEAD_TYPES[leadType]) return 'Pick a lead type';
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    return 'How many must be a whole number from 1 to 100';
  }
  const trimmed = typeof reason === 'string' ? reason.trim() : '';
  if (trimmed.length < 1 || trimmed.length > 500) {
    return 'A reason of 1 to 500 characters is required';
  }
  return null;
};

const createLeadGrantsRouter = ({
  supabase = supabaseService,
  createFirestore = defaultCreateFirestore,
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();

  // the newest 100 free lead grants with the agent's and giver's names
  router.get('/', requireAdmin, async (req, res) => {
    const { data, error } = await supabase
      .from('lead_grants')
      .select(LIST_FIELDS)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      logger.error('Failed to fetch lead grants', { error });
      return res.status(500).json({ error: 'Failed to fetch free leads' });
    }
    return res.status(200).json({ data });
  });

  router.post('/', requireAdmin, async (req, res) => {
    const invalid = validate(req.body);
    if (invalid) return res.status(400).json({ error: invalid });
    const { id, agentId, leadType, quantity } = req.body;
    const reason = req.body.reason.trim();
    const type = LEAD_TYPES[leadType];

    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id,email')
      .eq('id', agentId)
      .maybeSingle();
    if (agentError) {
      logger.error('Lead grant agent lookup failed', { error: agentError });
      return res.status(500).json({ error: 'Could not look up the agent' });
    }
    // an unknown agent is a 404; an agent with no email has no GSQ ledger
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    const email = agent.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'This agent has no email' });
    }

    const grant = {
      agentId: agent.id,
      agentEmail: email,
      leadType,
      quantity,
      reason,
      givenBy: req.agent?.id ?? null,
    };

    // add the leads and write the marker in one transaction; a missing
    // ledger doc is never created here (the funnel makes it on the first
    // purchase). A marker that is already there means this grant was
    // credited before: nothing is added again.
    let replay = false;
    try {
      const firestore = createFirestore();
      const markerRef = firestore.doc(`${MARKER_COLLECTION}/${id}`);
      const ledgerRef = firestore.doc(`${type.collection}/${email}`);
      const outcome = await firestore.runTransaction(async (tx) => {
        const [marker, ledger] = await Promise.all([
          tx.get(markerRef),
          tx.get(ledgerRef),
        ]);
        if (marker.exists) {
          return isSameGrant(marker.data(), grant) ? 'replay' : 'conflict';
        }
        if (!ledger.exists || typeof ledger.get(type.counter) !== 'number') {
          return 'no-balance';
        }
        tx.update(
          ledgerRef,
          Object.fromEntries(
            type.fields.map((field) => [field, FieldValue.increment(quantity)]),
          ),
        );
        tx.create(markerRef, {
          ...grant,
          createdAt: FieldValue.serverTimestamp(),
        });
        return 'credited';
      });
      if (outcome === 'no-balance') {
        return res.status(409).json({
          error: `This agent has no GSQ ${type.product} balance yet`,
        });
      }
      if (outcome === 'conflict') {
        return res.status(409).json({
          error: 'This grant id was already used for a different grant',
        });
      }
      replay = outcome === 'replay';
    } catch (error) {
      logger.error('Lead grant GSQ credit failed', { id, email, error });
      return res
        .status(502)
        .json({ error: 'Could not add the leads; nothing was given' });
    }

    // the same id every time, so a retry fills in a missing row and never
    // makes a second one
    const { data: row, error: upsertError } = await supabase
      .from('lead_grants')
      .upsert(
        {
          id,
          agent_id: grant.agentId,
          agent_email: grant.agentEmail,
          lead_type: grant.leadType,
          quantity: grant.quantity,
          reason: grant.reason,
          given_by: grant.givenBy,
        },
        { onConflict: 'id' },
      )
      .select()
      .single();
    if (upsertError) {
      logger.error('Lead grant credited but not recorded in Supabase', {
        id,
        email,
        leadType,
        quantity,
        error: upsertError,
      });
      return res.status(500).json({
        error:
          'The leads were added but the record did not save. Press Retry to finish; it will not add them again.',
      });
    }
    return res.status(replay ? 200 : 201).json({ data: row });
  });

  return router;
};

module.exports = createLeadGrantsRouter();
module.exports.createLeadGrantsRouter = createLeadGrantsRouter;
