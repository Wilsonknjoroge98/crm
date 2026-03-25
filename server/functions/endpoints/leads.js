const express = require('express');
const logger = require('firebase-functions/logger');
const dayjs = require('dayjs');

// eslint-disable-next-line new-cap
const leadRouter = express.Router();

leadRouter.get('/', async (req, res) => {
  try {
    logger.log('Getting leads', {
      route: '/leads',
      method: 'GET',
      requesterId: req.agent?.id,
    });

    const { data: leads, error } = await req.supabase
      .from('leads')
      .select('*, lead_vendors ( name )');

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

    const agentLeads = leads.filter((lead) => lead.agent_id === req.agent?.id);

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
