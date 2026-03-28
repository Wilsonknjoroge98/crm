const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

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

    const { data: allAgents, error: agentsError } = await supabaseService
      .from('agents')
      .select('id, upline_agent_id');

    if (agentsError) {
      logger.error('Error fetching agents for events in endpoints/events.js', {
        route: '/events',
        method: 'GET',
        requesterId: req.agent?.id,
        error: agentsError,
      });
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    const downlineIds = new Set();
    const queue = [req.agent.id];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (downlineIds.has(currentId)) continue;
      downlineIds.add(currentId);
      for (const a of allAgents) {
        if (a.upline_agent_id === currentId) queue.push(a.id);
      }
    }
    const downlineIdList = [...downlineIds];

    const { data: policies, error } = await supabaseService.from('policies')
      .select(`
        id,
        premium_amount,
        sold_date,
        effective_date,
        writing_agent:agents!policies_writing_agent_id_fkey ( first_name, last_name )
      `)
      .in('writing_agent_id', downlineIdList);

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

      if (policy.sold_date && policy.sold_date <= today) {
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
