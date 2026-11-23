const express = require('express');
const logger = require('firebase-functions/logger');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { supabaseService } = require('../services/supabase');

// Free leads an admin gives an agent, from the Refunds page. The leads are
// added to the agent's GSQ balance (the same counters a purchase fills),
// then one lead_grants row records who gave what and why.

// lead type -> the GSQ ledger collection, the counter that must already be
// there, the fields to increment, and the name used in the 409 message
const LEAD_TYPES = {
  web_verified: {
    collection: 'agents',
    counter: 'outstandingLeads',
    fields: ['verified', 'outstandingLeads'],
    product: 'web lead',
  },
  web_unverified: {
    collection: 'agents',
    counter: 'outstandingLeads',
    fields: ['unverified', 'outstandingLeads'],
    product: 'web lead',
  },
  instant_form: {
    collection: 'instant_forms',
    counter: 'outstandingInstantForms',
    fields: ['outstandingInstantForms'],
    product: 'instant form',
  },
  live_transfer: {
    collection: 'live_transfers',
    counter: 'outstandingLiveTransfers',
    fields: ['outstandingLiveTransfers'],
    product: 'live transfer',
  },
};

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
const validate = ({ agentId, leadType, quantity, reason } = {}) => {
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
    const { agentId, leadType, quantity } = req.body;
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

    // add the leads to the GSQ ledger in one update; a missing ledger doc is
    // never created here (the funnel makes it on the first purchase)
    try {
      const ref = createFirestore().doc(`${type.collection}/${email}`);
      const snapshot = await ref.get();
      if (!snapshot.exists || typeof snapshot.get(type.counter) !== 'number') {
        return res.status(409).json({
          error: `This agent has no GSQ ${type.product} balance yet`,
        });
      }
      await ref.update(
        Object.fromEntries(
          type.fields.map((field) => [field, FieldValue.increment(quantity)]),
        ),
      );
    } catch (error) {
      logger.error('Lead grant GSQ credit failed', { email, error });
      return res
        .status(502)
        .json({ error: 'Could not add the leads; nothing was given' });
    }

    const { data: row, error: insertError } = await supabase
      .from('lead_grants')
      .insert({
        agent_id: agent.id,
        agent_email: email,
        lead_type: leadType,
        quantity,
        reason,
        given_by: req.agent?.id ?? null,
      })
      .select()
      .single();
    if (insertError) {
      logger.error('Lead grant credited but not recorded', {
        email,
        leadType,
        quantity,
        error: insertError,
      });
      return res.status(500).json({
        error:
          'The leads were added but could not be recorded. Do not give them again; tell Wilson.',
      });
    }
    return res.status(201).json({ data: row });
  });

  return router;
};

module.exports = createLeadGrantsRouter();
module.exports.createLeadGrantsRouter = createLeadGrantsRouter;
