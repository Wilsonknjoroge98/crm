const express = require('express');
const logger = require('firebase-functions/logger');

// eslint-disable-next-line new-cap
const eventsRouter = express.Router();

eventsRouter.get('/', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 5, 20);
  const today = new Date().toISOString().slice(0, 10);

  try {
    logger.log('Fetching events', {
      route: '/events',
      method: 'GET',
      requesterId: req.agent?.id,
      limit,
    });

    const { data: policies, error } = await req.supabase.from('policies')
      .select(`
        id,
        premium_amount,
        sold_date,
        effective_date,
        writing_agent:agents!policies_writing_agent_id_fkey ( first_name, last_name )
      `);

    if (error) {
      logger.error(
        'Error fetching policies for events in endpoints/events.js',
        {
          route: '/events',
          method: 'GET',
          requesterId: req.agent?.id,
          error,
        },
      );
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    const events = [];

    for (const policy of policies || []) {
      const agentName = policy.writing_agent
        ? `${policy.writing_agent.first_name ?? ''} ${policy.writing_agent.last_name ?? ''}`.trim()
        : null;
      const premium = Number(policy.premium_amount) * 12;

      if (policy.sold_date) {
        events.push({
          type: 'sale',
          date: policy.sold_date,
          agent_name: agentName,
          premium,
        });
      }

      if (policy.effective_date && policy.effective_date <= today) {
        events.push({
          type: 'effective',
          date: policy.effective_date,
          agent_name: agentName,
          premium,
        });
      }
    }

    events.sort((a, b) => (a.date < b.date ? 1 : -1));

    const result = events.slice(0, limit);

    logger.log('Fetched events successfully', {
      route: '/events',
      method: 'GET',
      requesterId: req.agent?.id,
      total: events.length,
      returned: result.length,
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error('Unexpected error fetching events in endpoints/events.js', {
      route: '/events',
      method: 'GET',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
});

module.exports = eventsRouter;
