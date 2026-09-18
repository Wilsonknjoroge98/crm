const express = require('express');
const logger = require('firebase-functions/logger');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { supabaseService } = require('../services/supabase');
const { SUPERUSER_ID } = require('./business_access');
const {
  getRealContact: defaultGetRealContact,
} = require('../integrations/trestle');
const {
  GSQ_PLATFORM_EMAIL,
  SUPER_ADMIN_EMAIL,
} = require('../integrations/GSQ');

// Refunds only make sense for GSQ leads — crediting a refund means crediting
// the agent's outstandingLeads/unverified counters in GSQ's own Firestore,
// which only exists for leads that actually came from GSQ.
const GSQ_LEAD_VENDOR_ID = '1043bc55-a8cd-485f-bddc-46bcfc06d4ba';

// requester/reviewer come through fks on refund_requested_by/refund_reviewed_by,
// leads has several fks to agents so each needs its own alias
const REQUESTED_BY = 'requested_by:agents!leads_refund_requested_by_fkey';
const REVIEWED_BY = 'reviewed_by:agents!leads_refund_reviewed_by_fkey';
const REFUND_LIST_FIELDS =
  'id,first_name,last_name,email,phone,contact_grade,activity_score,' +
  'name_match,refund_status,refund_requested_at,refund_reviewed_at,' +
  `refund_denial_reason,${REQUESTED_BY}(first_name,last_name,email),` +
  `${REVIEWED_BY}(first_name,last_name,email)`;

// Every outcome is terminal, so each lead has at most one review cycle —
// these columns on `leads` are the complete history, nothing more to keep.
const REFUND_STATUS_FILTERS = new Set(['requested', 'approved', 'denied', 'all']);

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

const createRefundsRouter = ({
  supabase = supabaseService,
  createFirestore = defaultCreateFirestore,
  getRealContact = defaultGetRealContact,
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();

  // agent asks for a refund on one of their unverified leads; an admin can
  // also file one on an agent's behalf (the credit always goes to whoever
  // the crm shows as the owning agent, never to the admin's own account)
  router.post('/', async (req, res) => {
    const agentId = req.agent?.id;
    const { leadId } = req.body || {};
    if (!agentId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }
    if (typeof leadId !== 'string' || !leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    try {
      let query = supabase
        .from('leads')
        .select(
          'id,first_name,last_name,email,phone,verified,sold,refund_status,agent_id,gsq_id,lead_vendor_id',
        )
        .eq('id', leadId);
      if (agentId !== SUPERUSER_ID) query = query.eq('agent_id', agentId);
      const { data: lead, error } = await query.maybeSingle();
      if (error) throw error;
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.lead_vendor_id !== GSQ_LEAD_VENDOR_ID) {
        return res
          .status(400)
          .json({ error: 'Only GSQ leads are eligible for a refund' });
      }
      // strict false, null means a non gsq lead that was never verified either way
      if (lead.verified !== false || lead.sold) {
        return res
          .status(400)
          .json({ error: 'Only unverified, unsold leads can be refunded' });
      }
      // Every outcome is terminal — no double jeopardy. A denied request
      // stays denied permanently; it is not re-submittable.
      if (lead.refund_status) {
        return res.status(409).json({
          error:
            lead.refund_status === 'denied'
              ? 'This refund was already denied'
              : 'Refund already requested',
        });
      }

      const creditAgentId = agentId === SUPERUSER_ID ? lead.agent_id : agentId;
      if (!creditAgentId) {
        return res
          .status(400)
          .json({ error: 'Lead has no owning agent to credit' });
      }

      // fexdigital resells aged leads to other agents and the crm row moves with them, but
      // the gsq doc keeps the agent it was first issued to. only that agent gets a refund,
      // an aged buyer paid a fraction of a fresh lead and these credits are fresh leads.
      // admins bypass this check and file on behalf of whoever the crm currently shows
      // as the owning agent.
      if (agentId !== SUPERUSER_ID) {
        const gsqLead = lead.gsq_id
          ? (await createFirestore().doc(`leads/${lead.gsq_id}`).get()).data()
          : null;
        let issuedTo = gsqLead?.issuedTo?.trim().toLowerCase();
        // house leads keep the platform email in gsq, matching the rewrite
        // ingestion applies when resolving which crm agent owns them
        if (issuedTo === GSQ_PLATFORM_EMAIL.toLowerCase()) {
          issuedTo = SUPER_ADMIN_EMAIL.toLowerCase();
        }
        if (!issuedTo || issuedTo !== req.agent.email?.trim().toLowerCase()) {
          return res.status(400).json({
            error:
              'Only the agent this lead was first issued to can request a refund',
          });
        }
      }

      // Claim the request first, guarded so a double click is a 409, not
      // two writes. Trestle is called only after the claim succeeds so a
      // double click never bills it twice.
      const { data: claimed, error: claimError } = await supabase
        .from('leads')
        .update({
          refund_status: 'requested',
          refund_requested_by: creditAgentId,
          refund_requested_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .is('refund_status', null)
        .select('id,refund_status,refund_requested_at')
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        return res.status(409).json({ error: 'Refund already requested' });
      }

      // trestle failing (no key, quota, timeout) must not block the agent, admin sees dashes
      let contact = {
        contact_grade: null,
        activity_score: null,
        name_match: null,
      };
      try {
        contact = await getRealContact({
          name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
          phone: lead.phone,
          email: lead.email,
        });
      } catch (trestleError) {
        logger.error('Trestle real contact lookup failed', {
          leadId,
          status: trestleError?.response?.status,
          error: trestleError?.message,
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from('leads')
        .update(contact)
        .eq('id', leadId)
        .select('id,refund_status,contact_grade,activity_score,name_match')
        .maybeSingle();
      if (updateError) throw updateError;
      return res.status(201).json({ data: { ...claimed, ...updated } });
    } catch (error) {
      return fail(req, res, 'Failed to request refund', error);
    }
  });

  // status defaults to the action queue (pending); pass ?status=approved,
  // denied, or all to browse resolved requests as a historical record
  router.get('/', requireAdmin, async (req, res) => {
    const status =
      typeof req.query.status === 'string' ? req.query.status : 'requested';
    if (!REFUND_STATUS_FILTERS.has(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }
    try {
      let query = supabase.from('leads').select(REFUND_LIST_FIELDS);
      query =
        status === 'all'
          ? query.not('refund_status', 'is', null)
          : query.eq('refund_status', status);
      // pending requests queue oldest-first (fifo, for who's waiting
      // longest); resolved ones and "all" show most recent activity first
      const { data, error } =
        status === 'requested'
          ? await query.order('refund_requested_at', {
              ascending: true,
              nullsFirst: true,
            })
          : await query.order('refund_requested_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ data });
    } catch (error) {
      return fail(req, res, 'Failed to fetch refund requests', error);
    }
  });

  // flip the lead first with a guard so a double click cant credit twice, then credit gsq
  router.post('/:leadId/approve', requireAdmin, async (req, res) => {
    const { leadId } = req.params;
    const reviewerId = req.agent?.id ?? null;
    try {
      const { data: lead, error } = await supabase
        .from('leads')
        .select(`refund_status,${REQUESTED_BY}(email)`)
        .eq('id', leadId)
        .maybeSingle();
      if (error) throw error;
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.refund_status !== 'requested') {
        return res.status(409).json({ error: 'Refund is not pending' });
      }
      if (!lead.requested_by?.email) {
        return res.status(404).json({ error: 'Requesting agent not found' });
      }

      // gsq keys agent docs by lowercased email, there is no email field
      const email = lead.requested_by.email.trim().toLowerCase();
      const ref = createFirestore().doc(`agents/${email}`);
      if (!(await ref.get()).exists) {
        return res.status(404).json({ error: `GSQ agent ${email} not found` });
      }

      const { data: approved, error: approveError } = await supabase
        .from('leads')
        .update({
          refund_status: 'approved',
          refund_reviewed_by: reviewerId,
          refund_reviewed_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .eq('refund_status', 'requested')
        .select('id')
        .maybeSingle();
      if (approveError) throw approveError;
      if (!approved) {
        return res.status(409).json({ error: 'Refund is not pending' });
      }

      try {
        await ref.update({
          unverified: FieldValue.increment(1),
          outstandingLeads: FieldValue.increment(1),
        });
      } catch (firestoreError) {
        // Back in the queue, so it needs review again.
        const { error: revertError } = await supabase
          .from('leads')
          .update({
            refund_status: 'requested',
            refund_reviewed_by: null,
            refund_reviewed_at: null,
          })
          .eq('id', leadId)
          .eq('refund_status', 'approved');
        logger.error(
          revertError
            ? 'GSQ credit failed and the revert failed, lead needs a manual reset'
            : 'GSQ credit failed, lead reverted to requested',
          { leadId, email, error: firestoreError, revertError },
        );
        return res
          .status(500)
          .json({ error: 'Failed to credit the agent in GSQ' });
      }
      return res
        .status(200)
        .json({ data: { id: leadId, refund_status: 'approved' } });
    } catch (error) {
      return fail(req, res, 'Failed to approve refund', error);
    }
  });

  router.post('/:leadId/deny', requireAdmin, async (req, res) => {
    const { leadId } = req.params;
    const reason =
      typeof req.body?.reason === 'string'
        ? req.body.reason.trim() || null
        : null;
    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('refund_status')
        .eq('id', leadId)
        .maybeSingle();
      if (leadError) throw leadError;
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      if (lead.refund_status !== 'requested') {
        return res.status(409).json({ error: 'Refund is not pending' });
      }

      const { data, error } = await supabase
        .from('leads')
        .update({
          refund_status: 'denied',
          refund_reviewed_by: req.agent?.id ?? null,
          refund_reviewed_at: new Date().toISOString(),
          refund_denial_reason: reason,
        })
        .eq('id', leadId)
        .eq('refund_status', 'requested')
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res.status(409).json({ error: 'Refund is not pending' });
      }
      return res
        .status(200)
        .json({ data: { id: leadId, refund_status: 'denied' } });
    } catch (error) {
      return fail(req, res, 'Failed to deny refund', error);
    }
  });

  return router;
};

module.exports = createRefundsRouter();
module.exports.createRefundsRouter = createRefundsRouter;
module.exports.REFUND_LIST_FIELDS = REFUND_LIST_FIELDS;
module.exports.GSQ_LEAD_VENDOR_ID = GSQ_LEAD_VENDOR_ID;
