const express = require('express');
const logger = require('firebase-functions/logger');

// eslint-disable-next-line new-cap
const carriersRouter = express.Router();

carriersRouter.get('/', async (req, res) => {
  try {
    logger.log('Getting carriers', {
      route: '/carriers',
      method: 'GET',
      requesterId: req?.agent?.id,
    });

    const { data, error } = await req.supabase
      .from('carriers')
      .select('id, name, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching carriers in endpoints/carriers.js', {
        route: '/carriers',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch carriers' });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    logger.error('Unexpected error fetching carriers in endpoints/carriers.js', {
      route: '/carriers',
      method: 'GET',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

carriersRouter.get('/products', async (req, res) => {
  try {
    logger.log('Getting products', {
      route: '/carriers/products',
      method: 'GET',
      requesterId: req?.agent?.id,
    });

    const { data, error } = await req.supabase
      .from('products')
      .select('id, name, carrier_id, created_at')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching products in endpoints/carriers.js', {
        route: '/carriers/products',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    return res.status(200).json(data || []);
  } catch (error) {
    logger.error('Unexpected error fetching products in endpoints/carriers.js', {
      route: '/carriers/products',
      method: 'GET',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = carriersRouter;
