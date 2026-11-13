const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const { fetchAllRows } = require('./business');
const { createRateLimiter } = require('../middleware/rateLimit');

// The landing page's headline numbers. Public: no session is needed, so this
// returns two totals and nothing about any agent or client.
//
// Only sales on our own leads count: a client is included when the lead it
// was closed from came from GSQ (leads.gsq_id is set). Clients agents logged
// from other vendors' leads, or with no lead, are left out, so these are
// smaller than the admin's "Total Closed" and "Closed Sales" cards. The sum
// is the same as theirs: monthly_premium x 12, and one sale per client.

// clients has two foreign keys to leads, so the join names the one it uses.
const GSQ_CLIENT_FIELDS =
  'id,monthly_premium,lead:leads!clients_lead_id_fkey!inner(gsq_id)';

const fetchGsqClientPremiums = (supabase) =>
  fetchAllRows(() =>
    supabase
      .from('clients')
      .select(GSQ_CLIENT_FIELDS)
      .not('lead.gsq_id', 'is', null)
      .order('id', { ascending: true }),
  );

// This reads every matching client, and anyone can call it, so the answer is
// kept for a while instead of being worked out on every visit.
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
    const clients = await fetchGsqClientPremiums(supabase);
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
