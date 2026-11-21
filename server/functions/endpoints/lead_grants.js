const express = require('express');
const logger = require('firebase-functions/logger');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { supabaseService } = require('../services/supabase');

// Free leads an admin gives an agent (review bounties, make-goods for bad
// leads, comps, the owner's own use), from the Refunds page. Same shape as a
// refund approval: one row in lead_grants is the record, and the credit is a
// FieldValue.increment on the agent's GSQ ledger, the same counters a Stripe
// purchase fills. Before this, free leads were typed straight into those
// counters in the GSQ console and nothing recorded them.

const GRANT_PRODUCTS = Object.freeze(['web', 'instant_form', 'live_transfer']);
const GRANT_REASONS = Object.freeze([
  'review_bounty',
  'bad_lead_make_good',
  'comp',
  'owner_use',
  'other',
]);
const MAX_GRANT_QUANTITY = 100;
const MAX_NOTE_LENGTH = 500;
const DEFAULT_LIST_LIMIT = 100;
const MAX_LIST_LIMIT = 500;

// granted_by and agent_id both reference agents, so each join needs its alias
const GRANT_AGENT = 'agent:agents!lead_grants_agent_id_fkey';
const GRANTED_BY = 'granted_by_agent:agents!lead_grants_granted_by_fkey';
const GRANT_FIELDS =
  'id,created_at,agent_id,agent_email,brand,product,verified_count,' +
  'unverified_count,quantity,reason,note,granted_by,status,credited_at,error';
const GRANT_LIST_FIELDS =
  `${GRANT_FIELDS},${GRANT_AGENT}(first_name,last_name,email),` +
  `${GRANTED_BY}(first_name,last_name,email)`;

// The GSQ ledger doc each product credits. Docs are keyed by lowercased
// email. A grant never creates a ledger doc: the funnel creates each one on
// the agent's first purchase of that product with fields the dialler and the
// instant form pool depend on, so a missing doc is a 409, not a half-made doc.
const LEDGERS = {
  web: {
    collection: 'agents',
    missing: (email) =>
      `${email} has no GSQ agent account to credit. They need a GSQ purchase first.`,
    increments: ({ verified, unverified }) => ({
      verified: FieldValue.increment(verified),
      unverified: FieldValue.increment(unverified),
      outstandingLeads: FieldValue.increment(verified + unverified),
    }),
  },
  instant_form: {
    collection: 'instant_forms',
    missing: (email) =>
      `${email} has no GSQ instant form ledger. It is created on their first instant form purchase.`,
    increments: ({ quantity }) => ({
      outstandingInstantForms: FieldValue.increment(quantity),
    }),
  },
  live_transfer: {
    collection: 'live_transfers',
    missing: (email) =>
      `${email} has no GSQ live transfer ledger. It is created on their first live transfer purchase.`,
    increments: ({ quantity }) => ({
      outstandingLiveTransfers: FieldValue.increment(quantity),
    }),
  },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const defaultCreateFirestore = () =>
  new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Forbidden' });

const fail = (req, res, message, error) => {
  logger.error(message, {
    route: req.originalUrl,
    requesterId: req.agent?.id,
    error,
  });
  return res.status(500).json({ error: message });
};

const isAbsent = (value) => value === undefined || value === null;
const isCount = (value) =>
  Number.isInteger(value) && value >= 0 && value <= MAX_GRANT_QUANTITY;

// Returns { error } or { grant } with the counts, reason and note to record.
const validateGrant = (body) => {
  const {
    requestId,
    agentId,
    product,
    verified,
    unverified,
    count,
    reason,
    note,
  } = body || {};

  if (!isAbsent(requestId) && !(typeof requestId === 'string' && UUID_RE.test(requestId))) {
    return { error: 'requestId must be a UUID' };
  }
  if (typeof agentId !== 'string' || !agentId) {
    return { error: 'agentId is required' };
  }
  if (!GRANT_PRODUCTS.includes(product)) {
    return { error: 'product must be web, instant_form or live_transfer' };
  }

  let verifiedCount = 0;
  let unverifiedCount = 0;
  let quantity;
  if (product === 'web') {
    if (!isAbsent(count)) {
      return { error: 'Web leads take verified and unverified, not count' };
    }
    const v = isAbsent(verified) ? 0 : verified;
    const u = isAbsent(unverified) ? 0 : unverified;
    if (!isCount(v) || !isCount(u)) {
      return {
        error: `verified and unverified must be whole numbers from 0 to ${MAX_GRANT_QUANTITY}`,
      };
    }
    verifiedCount = v;
    unverifiedCount = u;
    quantity = v + u;
  } else {
    // instant forms are all verified and live transfers have no split
    if (!isAbsent(verified) || !isAbsent(unverified)) {
      return {
        error: 'Verified and unverified apply only to web leads, send count',
      };
    }
    if (!isCount(count)) {
      return {
        error: `count must be a whole number from 1 to ${MAX_GRANT_QUANTITY}`,
      };
    }
    quantity = count;
  }
  if (quantity < 1) {
    return { error: 'Give at least 1 lead' };
  }
  if (quantity > MAX_GRANT_QUANTITY) {
    return { error: `At most ${MAX_GRANT_QUANTITY} leads per grant` };
  }

  if (!GRANT_REASONS.includes(reason)) {
    return { error: 'reason is not valid' };
  }
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  if (!trimmedNote) {
    return { error: 'A note is required' };
  }
  if (trimmedNote.length > MAX_NOTE_LENGTH) {
    return { error: `The note must be ${MAX_NOTE_LENGTH} characters or fewer` };
  }

  return {
    grant: {
      requestId: requestId || null,
      agentId,
      product,
      verifiedCount,
      unverifiedCount,
      quantity,
      reason,
      note: trimmedNote,
    },
  };
};

const errorText = (error) =>
  String(error?.message || error || 'Unknown error').slice(0, 500);

const createLeadGrantsRouter = ({
  supabase = supabaseService,
  createFirestore = defaultCreateFirestore,
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();

  // newest first; ?limit= caps how many (default 100, at most 500)
  router.get('/', requireAdmin, async (req, res) => {
    const requested = Number.parseInt(req.query.limit, 10);
    const limit =
      Number.isInteger(requested) && requested > 0
        ? Math.min(requested, MAX_LIST_LIMIT)
        : DEFAULT_LIST_LIMIT;
    try {
      const { data, error } = await supabase
        .from('lead_grants')
        .select(GRANT_LIST_FIELDS)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return res.status(200).json({ data });
    } catch (error) {
      return fail(req, res, 'Failed to fetch lead grants', error);
    }
  });

  // record the grant (pending), credit the gsq ledger in one atomic update,
  // then mark it credited. a failed ledger write credits nothing and the row
  // is kept as failed with the error, so every attempt is on record.
  router.post('/', requireAdmin, async (req, res) => {
    const { error: invalid, grant } = validateGrant(req.body);
    if (invalid) return res.status(400).json({ error: invalid });

    try {
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id,first_name,last_name,email')
        .eq('id', grant.agentId)
        .maybeSingle();
      if (agentError) throw agentError;
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      const email = agent.email?.trim().toLowerCase();
      if (!email) {
        return res
          .status(400)
          .json({ error: 'This agent has no email to credit in GSQ' });
      }

      const ledger = LEDGERS[grant.product];
      const firestore = createFirestore();
      const ref = firestore.doc(`${ledger.collection}/${email}`);
      if (!(await ref.get()).exists) {
        return res.status(409).json({ error: ledger.missing(email) });
      }

      const { data: pending, error: insertError } = await supabase
        .from('lead_grants')
        .insert({
          ...(grant.requestId && { id: grant.requestId }),
          agent_id: agent.id,
          agent_email: email,
          brand: 'gsq',
          product: grant.product,
          verified_count: grant.verifiedCount,
          unverified_count: grant.unverifiedCount,
          quantity: grant.quantity,
          reason: grant.reason,
          note: grant.note,
          granted_by: req.agent?.id ?? null,
          status: 'pending',
        })
        .select(GRANT_FIELDS)
        .single();
      if (insertError) {
        // the same requestId twice is a double submit of one grant
        if (insertError.code === '23505') {
          return res
            .status(409)
            .json({ error: 'This grant was already submitted' });
        }
        throw insertError;
      }

      try {
        await ref.update(
          ledger.increments({
            verified: grant.verifiedCount,
            unverified: grant.unverifiedCount,
            quantity: grant.quantity,
          }),
        );
      } catch (firestoreError) {
        const { error: markError } = await supabase
          .from('lead_grants')
          .update({ status: 'failed', error: errorText(firestoreError) })
          .eq('id', pending.id)
          .eq('status', 'pending');
        logger.error(
          markError
            ? 'GSQ lead grant write failed and marking it failed also failed, row is stuck pending'
            : 'GSQ lead grant write failed, grant marked failed',
          { grantId: pending.id, email, error: firestoreError, markError },
        );
        return res.status(502).json({
          error: 'Failed to credit the agent in GSQ. Nothing was credited.',
          data: { id: pending.id, status: 'failed' },
        });
      }

      const creditedAt = new Date().toISOString();
      const { data: credited, error: creditError } = await supabase
        .from('lead_grants')
        .update({ status: 'credited', credited_at: creditedAt })
        .eq('id', pending.id)
        .eq('status', 'pending')
        .select(GRANT_FIELDS)
        .maybeSingle();
      if (creditError || !credited) {
        // the leads are in the agent's ledger; only the record lags. never
        // retry the grant, that would credit twice.
        logger.error(
          'GSQ lead grant credited but the row could not be marked credited',
          { grantId: pending.id, email, error: creditError },
        );
        return res.status(201).json({
          data: { ...pending, status: 'credited', credited_at: creditedAt },
          warning:
            'The leads were credited, but the record still says pending. Do not give them again.',
        });
      }
      return res.status(201).json({ data: credited });
    } catch (error) {
      return fail(req, res, 'Failed to give free leads', error);
    }
  });

  return router;
};

module.exports = createLeadGrantsRouter();
module.exports.createLeadGrantsRouter = createLeadGrantsRouter;
module.exports.validateGrant = validateGrant;
module.exports.GRANT_PRODUCTS = GRANT_PRODUCTS;
module.exports.GRANT_REASONS = GRANT_REASONS;
module.exports.MAX_GRANT_QUANTITY = MAX_GRANT_QUANTITY;
