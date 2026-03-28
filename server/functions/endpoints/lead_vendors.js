const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const leadVendorsRouter = express.Router();

leadVendorsRouter.get('/', async (req, res) => {
  try {
    logger.log('Getting lead vendors', {
      route: '/lead-vendors',
      method: 'GET',
      requesterId: req?.agent?.id,
    });

    const { data, error } = await supabaseService
      .from('lead_vendors')
      .select('id, name, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching lead vendors in endpoints/lead_vendors.js', {
        route: '/lead-vendors',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch lead vendors' });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    logger.error(
      'Unexpected error fetching lead vendors in endpoints/lead_vendors.js',
      {
        route: '/lead-vendors',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      },
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = leadVendorsRouter;
