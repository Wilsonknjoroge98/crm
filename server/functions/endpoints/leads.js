const express = require('express');
const logger = require('firebase-functions/logger');
const dayjs = require('dayjs');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const leadRouter = express.Router();

const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';

leadRouter.get('/', async (req, res) => {
  try {
    logger.log('Getting leads', {
      route: '/leads',
      method: 'GET',
      requesterId: req.agent?.id,
    });

    const isSuperuser = req.agent?.id === SUPERUSER_ID;

    let query = supabaseService
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

module.exports = leadRouter;
