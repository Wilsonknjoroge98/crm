const express = require('express');
const logger = require('firebase-functions/logger');

// eslint-disable-next-line new-cap
const teamLeaderboardRouter = express.Router();

teamLeaderboardRouter.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    logger.log('Getting team leaderboard', {
      route: '/team-leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
    });

    const { data: allAgents, error: agentsError } = await req.supabase
      .from('agents')
      .select('id, first_name, last_name, upline_agent_id');

    if (agentsError) {
      logger.error('Error fetching agents in endpoints/team_leaderboard.js', {
        route: '/team-leaderboard',
        method: 'GET',
        requesterId: req.agent?.id,
        error: agentsError,
      });
      return res
        .status(500)
        .json({ error: 'Failed to fetch agents for team leaderboard' });
    }

    // Collect only the requesting agent + their recursive downline
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
    const downlineAgents = allAgents.filter((a) => downlineIds.has(a.id));

    const teamLeaderboard = [];

    for (const agent of downlineAgents) {
      const agentName =
        `${agent.first_name || ''} ${agent.last_name || ''}`.trim();

      let clientsQuery = req.supabase
        .from('clients')
        .select(
          'id, agent_clients!agent_clients_client_id_fkey!inner(agent_id)',
          { count: 'exact', head: true },
        )
        .eq('agent_clients.agent_id', agent.id);

      if (startDate && endDate) {
        clientsQuery = clientsQuery
          .gte('created_at', `${startDate}T00:00:00`)
          .lte('created_at', `${endDate}T23:59:59.999`);
      }

      const { count: clientsCount, error: clientsError } = await clientsQuery;

      if (clientsError) {
        logger.error(
          'Error fetching clients count in endpoints/team_leaderboard.js',
          {
            route: '/team-leaderboard',
            method: 'GET',
            requesterId: req.agent?.id,
            targetAgentId: agent.id,
            error: clientsError,
          },
        );
        return res
          .status(500)
          .json({ error: 'Failed to fetch clients for team leaderboard' });
      }

      let policiesQuery = req.supabase
        .from('policies')
        .select('premium_amount')
        .eq('writing_agent_id', agent.id);

      if (startDate && endDate) {
        policiesQuery = policiesQuery
          .gte('sold_date', startDate)
          .lte('sold_date', endDate);
      }

      const { data: agentPolicies, error: policiesError } = await policiesQuery;

      if (policiesError) {
        logger.error(
          'Error fetching policies in endpoints/team_leaderboard.js',
          {
            route: '/team-leaderboard',
            method: 'GET',
            requesterId: req.agent?.id,
            targetAgentId: agent.id,
            error: policiesError,
          },
        );
        return res.status(500).json({ error: 'Failed to fetch policies' });
      }

      const totalPolicies = agentPolicies?.length || 0;
      const totalPremium = (agentPolicies || []).reduce((sum, policy) => {
        return sum + (Number(policy.premium_amount) || 0);
      }, 0);

      teamLeaderboard.push({
        agentId: agent.id,
        name: agentName,
        clients: clientsCount || 0,
        policies: totalPolicies,
        premium: totalPremium * 12,
        avgPremium: totalPolicies > 0 ? (totalPremium * 12) / totalPolicies : 0,
      });
    }

    teamLeaderboard.sort((a, b) => b.premium - a.premium);

    logger.log('Generated team leaderboard successfully', {
      route: '/team-leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
      count: teamLeaderboard.length,
    });

    return res.status(200).json(teamLeaderboard);
  } catch (error) {
    logger.error('Unexpected error in endpoints/team_leaderboard.js', {
      route: '/team-leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
      error,
    });
    return res
      .status(500)
      .json({ error: 'Failed to generate team leaderboard' });
  }
});

module.exports = teamLeaderboardRouter;
