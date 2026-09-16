const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const { isValidDate } = require('../helpers');

// eslint-disable-next-line new-cap
const leaderboardRouter = express.Router();

leaderboardRouter.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    logger.log('Fetching premium leaderboard', {
      route: '/leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
    });

    const { data: agents, error: agentsError } = await supabaseService
      .from('agents')
      .select('id, first_name, last_name');

    if (agentsError) {
      logger.error('Error fetching agents in endpoints/leaderboard.js', {
        error: agentsError,
      });
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    if (!agents || agents.length === 0) {
      return res.status(200).json([]);
    }

    const agentIds = agents.map((a) => a.id);

    // Fetch clients for every agent, filtered by created_at.
    // clients.monthly_premium is the sale value captured at close, so it's
    // available for every client, unlike policies (now optional and often
    // entered well after the sale). agent_clients has no split-commission
    // concept, so a split deal currently credits 100% to whichever agent
    // is on agent_clients rather than being divided like policies were.
    let query = supabaseService
      .from('clients')
      .select(
        'monthly_premium, agent_clients!agent_clients_client_id_fkey!inner(agent_id)',
      )
      .in('agent_clients.agent_id', agentIds);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: clients, error: clientsError } = await query;

    if (clientsError) {
      logger.error('Error fetching clients in endpoints/leaderboard.js', {
        error: clientsError,
      });
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    // Build agent lookup map
    const agentMap = {};
    for (const agent of agents) {
      agentMap[agent.id] = {
        name: `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim(),
        count: 0,
        premiumAmount: 0,
      };
    }

    // Aggregate monthly_premium * 12 per agent
    for (const client of clients || []) {
      const agentId = client.agent_clients?.[0]?.agent_id;
      if (!agentId || !agentMap[agentId]) continue;

      const annualPremium = Number(client.monthly_premium || 0) * 12;

      agentMap[agentId].count += 1;
      agentMap[agentId].premiumAmount += annualPremium;
    }

    // Filter out agents with no sales and sort by premiumAmount desc
    const result = Object.values(agentMap)
      .filter((a) => a.count > 0)
      .sort((a, b) => b.premiumAmount - a.premiumAmount);

    logger.log('Fetched premium leaderboard successfully', {
      route: '/leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
      count: result.length,
    });

    return res.status(200).json(result);
  } catch (error) {
    logger.error(
      'Unexpected error fetching leaderboard in endpoints/leaderboard.js',
      { error },
    );
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = leaderboardRouter;
