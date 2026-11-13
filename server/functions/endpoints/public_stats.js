const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const { fetchAllClientPremiums } = require('./business');
const { createRateLimiter } = require('../middleware/rateLimit');

// The landing page's headline numbers. Public: no session is needed, so this
// returns two totals and nothing about any agent or client.
//
// totalClosed and closedSales are worked out exactly as the admin's "Total
// Closed" and "Closed Sales" cards are (GET /business/metrics for the
// superuser): every client's monthly_premium x 12, and the number of clients.
// Keep the two in step.

// Adding up every client is a full-table read, and anyone can call this, so
// the answer is kept for a while instead of being worked out on every visit.
const CACHE_MS = 10 * 60 * 1000;

const createPublicStatsRouter = ({
  supabase = supabaseService,
  now = () => Date.now(),
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();
  let cached = null; // { at, data }
  let inFlight = null;

  const load = async () => {
    const clients = await fetchAllClientPremiums(supabase);
    const totalClosed = Number(
      clients
        .reduce((total, c) => total + (Number(c.monthly_premium) || 0) * 12, 0)
        .toFixed(2),
    );
    return { totalClosed, closedSales: clients.length };
  };

  // The answer is cached, so this only stops one address hammering the route.
  const limit = createRateLimiter({ windowMs: 60 * 1000, max: 60, now });

  router.get('/public-stats', limit, async (req, res) => {
    try {
      if (!cached || now() - cached.at >= CACHE_MS) {
        // Visitors arriving together share one read.
        inFlight =
          inFlight ||
          load().finally(() => {
            inFlight = null;
          });
        cached = { at: now(), data: await inFlight };
      }
      res.set('Cache-Control', 'public, max-age=600');
      return res.status(200).json({ data: cached.data });
    } catch (error) {
      logger.error('Failed to fetch public stats', {
        route: '/public-stats',
        method: 'GET',
        error,
      });
      // An older answer beats none: the page only shows the line when it
      // has a number.
      if (cached) return res.status(200).json({ data: cached.data });
      return res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  return router;
};

module.exports = {
  createPublicStatsRouter,
  publicStatsRouter: createPublicStatsRouter(),
};
