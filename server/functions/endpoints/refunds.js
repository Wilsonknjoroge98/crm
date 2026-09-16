const express = require('express');
const logger = require('firebase-functions/logger');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { supabaseService } = require('../services/supabase');
const { SUPERUSER_ID } = require('./business_access');
const {
  getRealContact: defaultGetRealContact,
} = require('../integrations/trestle');

// requester comes through the fk on refund_requested_by, leads has several fks to agents
const REQUESTED_BY = 'requested_by:agents!leads_refund_requested_by_fkey';
const REFUND_LIST_FIELDS =
  'id,first_name,last_name,email,phone,contact_grade,activity_score,' +
  `name_match,${REQUESTED_BY}(first_name,last_name,email)`;

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

  // agent asks for a refund on one of their unverified leads
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
          'id,first_name,last_name,email,phone,verified,refund_status,gsq_id',
        )
        .eq('id', leadId);
      if (agentId !== SUPERUSER_ID) query = query.eq('agent_id', agentId);
      const { data: lead, error } = await query.maybeSingle();
      if (error) throw error;
      if (!lead) return res.status(404).json({ error: 'Lead not found' });
      // strict false, null means a non gsq lead that was never verified either way
      if (lead.verified !== false) {
        return res
          .status(400)
          .json({ error: 'Only unverified leads can be refunded' });
      }
      if (lead.refund_status) {
        return res.status(409).json({ error: 'Refund already requested' });
      }

      // fexdigital resells aged leads to other agents and the crm row moves with them, but
      // the gsq doc keeps the agent it was first issued to. only that agent gets a refund,
      // an aged buyer paid a fraction of a fresh lead and these credits are fresh leads
      if (agentId !== SUPERUSER_ID) {
        const gsqLead = lead.gsq_id
          ? (await createFirestore().doc(`leads/${lead.gsq_id}`).get()).data()
          : null;
        const issuedTo = gsqLead?.issuedTo?.trim().toLowerCase();
        if (!issuedTo || issuedTo !== req.agent.email?.trim().toLowerCase()) {
          return res.status(400).json({
            error:
              'Only the agent this lead was first issued to can request a refund',
          });
        }
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

      // guard on null so a double click is a 409, not a second write
      const { data: updated, error: updateError } = await supabase
        .from('leads')
        .update({
          ...contact,
          refund_status: 'requested',
          refund_requested_by: agentId,
        })
        .eq('id', leadId)
        .is('refund_status', null)
        .select('id,refund_status,contact_grade,activity_score,name_match')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) {
        return res.status(409).json({ error: 'Refund already requested' });
      }
      return res.status(201).json({ data: updated });
    } catch (error) {
      return fail(req, res, 'Failed to request refund', error);
    }
  });

  router.get('/', requireAdmin, async (req, res) => {
    const { data, error } = await supabase
      .from('leads')
      .select(REFUND_LIST_FIELDS)
      .eq('refund_status', 'requested')
      .order('created_at', { ascending: true });
    if (error) return fail(req, res, 'Failed to fetch refund requests', error);
    return res.status(200).json({ data });
  });

  // flip the lead first with a guard so a double click cant credit twice, then credit gsq
  router.post('/:leadId/approve', requireAdmin, async (req, res) => {
    const { leadId } = req.params;
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
        .update({ refund_status: 'approved' })
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
        const { error: revertError } = await supabase
          .from('leads')
          .update({ refund_status: 'requested' })
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
    const { data, error } = await supabase
      .from('leads')
      .update({ refund_status: 'denied' })
      .eq('id', leadId)
      .eq('refund_status', 'requested')
      .select('id')
      .maybeSingle();
    if (error) return fail(req, res, 'Failed to deny refund', error);
    if (!data) return res.status(409).json({ error: 'Refund is not pending' });
    return res
      .status(200)
      .json({ data: { id: leadId, refund_status: 'denied' } });
  });

  return router;
};

module.exports = createRefundsRouter();
module.exports.createRefundsRouter = createRefundsRouter;
module.exports.REFUND_LIST_FIELDS = REFUND_LIST_FIELDS;
