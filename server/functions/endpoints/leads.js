const express = require('express');
const logger = require('firebase-functions/logger');
const dayjs = require('dayjs');
const { supabaseService } = require('../services/supabase');
const { parsePremium } = require('../integrations/premium');

const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';
const REQUIRED_LEAD_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'state',
  'lead_vendor_id',
];
const WRITABLE_LEAD_FIELDS = [
  ...REQUIRED_LEAD_FIELDS,
  'availability',
  'beneficiary',
  'blood_pressure_medication',
  'cholesterol_medication',
  'face_amount',
  'gsq_live_transfer',
  'height_feet',
  'height_inches',
  'premium',
  'priority',
  'selected_carrier',
  'selected_plan',
  'smoker',
  'verified',
  'weight_lbs',
  'why',
];

const hasValue = (value) =>
  value !== null &&
  value !== undefined &&
  (typeof value !== 'string' || value.trim() !== '');

const buildLeadPayload = (lead) => {
  const payload = {};

  WRITABLE_LEAD_FIELDS.forEach((field) => {
    if (!Object.prototype.hasOwnProperty.call(lead, field)) return;
    const value = lead[field];
    payload[field] = typeof value === 'string' ? value.trim() : value;
  });

  if (Object.prototype.hasOwnProperty.call(lead, 'premium')) {
    const premium = parsePremium(lead.premium);
    const suppliedPremium = hasValue(lead.premium);
    if (
      suppliedPremium &&
      premium.raw === null &&
      premium.min === null &&
      premium.max === null
    ) {
      return { error: 'premium must be a non-negative amount or range' };
    }
    payload.premium = premium.raw;
    payload.premium_min = premium.min;
    payload.premium_max = premium.max;
  }

  return { payload };
};

// Factory so tests can inject a fake Supabase client; production callers get
// the real service client by default.
const createLeadRouter = ({ supabase = supabaseService } = {}) => {
  // eslint-disable-next-line new-cap
  const leadRouter = express.Router();

  leadRouter.get('/', async (req, res) => {
    try {
      logger.log('Getting leads', {
        route: '/leads',
        method: 'GET',
        requesterId: req.agent?.id,
      });

      const isSuperuser = req.agent?.id === SUPERUSER_ID;

      let query = supabase
        .from('leads')
        .select('*, lead_vendors ( name )')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (!isSuperuser) {
        query = query.eq('agent_id', req.agent?.id);
      }

      const { data: leads, error } = await query;

      if (error) {
        logger.error('Error fetching leads in endpoints/leads.js', {
          route: '/leads',
          method: 'GET',
          requesterId: req.agent?.id,
          error,
        });
        return res.status(500).json({ error: 'Failed to fetch leads' });
      }

      logger.log('Fetched leads successfully', {
        route: '/leads',
        method: 'GET',
        requesterId: req.agent?.id,
        count: leads?.length || 0,
      });

      const agentLeads = leads ?? [];

      const formattedLeads = agentLeads.map((lead) => {
        const leadVendorName = lead.lead_vendors ? lead.lead_vendors.name : null;
        delete lead.lead_vendors;

        const age = dayjs().diff(dayjs(lead.date_of_birth), 'year');
        return {
          ...lead,
          lead_vendor_name: leadVendorName,
          age,
        };
      });

      return res.status(200).json(formattedLeads);
    } catch (error) {
      logger.error('Unexpected error fetching leads in endpoints/leads.js', {
        route: '/leads',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }
  });

  leadRouter.post('/', async (req, res) => {
    const lead = req.body?.lead;
    if (!lead || typeof lead !== 'object' || Array.isArray(lead)) {
      return res.status(400).json({ error: 'Missing lead payload' });
    }

    const missingFields = REQUIRED_LEAD_FIELDS.filter(
      (field) => !hasValue(lead[field]),
    );
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required lead fields: ${missingFields.join(', ')}`,
      });
    }

    const { payload, error: validationError } = buildLeadPayload(lead);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...payload,
        agent_id: req.agent.id,
        sold: false,
      })
      .select('*')
      .maybeSingle();

    if (error) {
      logger.error('Error creating lead in endpoints/leads.js', {
        route: '/leads',
        method: 'POST',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    return res.status(201).json({ data });
  });

  leadRouter.patch('/:id', async (req, res) => {
    const lead = req.body?.lead;
    if (!lead || typeof lead !== 'object' || Array.isArray(lead)) {
      return res.status(400).json({ error: 'Missing lead payload' });
    }

    const { payload, error: validationError } = buildLeadPayload(lead);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No editable lead fields supplied' });
    }

    const emptiedFields = REQUIRED_LEAD_FIELDS.filter(
      (field) =>
        Object.prototype.hasOwnProperty.call(payload, field) &&
        !hasValue(payload[field]),
    );
    if (emptiedFields.length > 0) {
      return res.status(400).json({
        error: `Required lead fields cannot be emptied: ${emptiedFields.join(', ')}`,
      });
    }

    let query = supabase.from('leads').update(payload).eq('id', req.params.id);
    if (req.agent.id !== SUPERUSER_ID) {
      query = query.eq('agent_id', req.agent.id);
    }

    const { data, error } = await query.select('*').maybeSingle();
    if (error) {
      logger.error('Error updating lead in endpoints/leads.js', {
        route: '/leads/:id',
        method: 'PATCH',
        requesterId: req.agent?.id,
        targetLeadId: req.params.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to update lead' });
    }
    if (!data) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    return res.status(200).json({ data });
  });

  return leadRouter;
};

const leadRouter = createLeadRouter();

module.exports = leadRouter;
module.exports.createLeadRouter = createLeadRouter;
module.exports.buildLeadPayload = buildLeadPayload;
module.exports.REQUIRED_LEAD_FIELDS = REQUIRED_LEAD_FIELDS;
