const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const leaderboardRouter = express.Router();

leaderboardRouter.get('/', async (req, res) => {
  const { startDate, endDate, orgId } = req.query;

  try {
    logger.log('Fetching premium leaderboard', {
      route: '/leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
      orgId,
      startDate,
      endDate,
    });

    // Fetch all agents in the org
    const { data: agents, error: agentsError } = await supabaseService
      .from('agents')
      .select('id, first_name, last_name')
      .eq('org_id', orgId);

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

    // Fetch policies for all agents in the org filtered by sold_date
    let query = supabaseService
      .from('policies')
      .select('writing_agent_id, premium_amount')
      .in('writing_agent_id', agentIds);

    if (startDate) query = query.gte('sold_date', startDate);
    if (endDate) query = query.lte('sold_date', endDate);

    const { data: policies, error: policiesError } = await query;

    if (policiesError) {
      logger.error('Error fetching policies in endpoints/leaderboard.js', {
        error: policiesError,
      });
      return res.status(500).json({ error: 'Failed to fetch policies' });
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

    // Aggregate premium_amount * 12 per agent
    for (const policy of policies || []) {
      const agentId = policy.writing_agent_id;
      if (!agentMap[agentId]) continue;
      agentMap[agentId].count += 1;
      agentMap[agentId].premiumAmount +=
        Number(policy.premium_amount || 0) * 12;
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
