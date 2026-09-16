const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const teamLeaderboardRouter = express.Router();

const GSQ_LEAD_VENDOR_ID = '1043bc55-a8cd-485f-bddc-46bcfc06d4ba';
const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';
const TOP_LEVEL_AGENT_ID = '3d670459-8730-42f9-8b98-08c34f98f4a6';

teamLeaderboardRouter.get('/', async (req, res) => {
  const { startDate, endDate, gsqOnly } = req.query;
  const filterGsq = gsqOnly === 'true';

  try {
    logger.log('Getting team leaderboard', {
      route: '/team-leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
    });

    const { data: allAgents, error: agentsError } = await supabaseService
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

    const rootAgentId =
      req.agent?.id === SUPERUSER_ID ? TOP_LEVEL_AGENT_ID : req.agent?.id;

    const downlineIds = new Set();
    const queue = [rootAgentId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (downlineIds.has(currentId)) continue;
      downlineIds.add(currentId);
      for (const a of allAgents) {
        if (a.upline_agent_id === currentId) queue.push(a.id);
      }
    }
    const downlineAgents = allAgents.filter((a) => downlineIds.has(a.id));
    logger.log(`Found ${downlineAgents.length} downline agents`, {
      route: '/team-leaderboard',
      method: 'GET',
      requesterId: req.agent?.id,
    });

    const downlineIdList = [...downlineIds];

    // Single bulk clients query for the entire downline.
    // clients.monthly_premium is the sale value captured at close, so it's
    // available for every client, unlike policies (now optional and often
    // entered well after the sale). agent_clients has no split-commission
    // concept, so a split deal currently credits 100% to whichever agent
    // is on agent_clients rather than being divided like policies were.
    const clientSelect = 'monthly_premium, agent_clients!agent_clients_client_id_fkey!inner(agent_id)';
    let clientsQuery = supabaseService
      .from('clients')
      .select(
        filterGsq
          ? `${clientSelect}, leads!clients_lead_id_fkey!inner(lead_vendor_id)`
          : clientSelect,
      )
      .in('agent_clients.agent_id', downlineIdList)
      .limit(50000);

    if (filterGsq) {
      clientsQuery = clientsQuery.eq(
        'leads.lead_vendor_id',
        GSQ_LEAD_VENDOR_ID,
      );
    }

    if (startDate && endDate) {
      clientsQuery = clientsQuery
        .gte('created_at', startDate)
        .lte('created_at', endDate);
    }

    const { data: allClients, error: clientsError } = await clientsQuery;

    if (clientsError) {
      logger.error('Error fetching clients in endpoints/team_leaderboard.js', {
        route: '/team-leaderboard',
        method: 'GET',
        requesterId: req.agent?.id,
        error: clientsError,
      });
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    // Group clients by agent in JS
    const clientsByAgent = {};
    for (const client of allClients || []) {
      const aid = client.agent_clients?.[0]?.agent_id;
      if (!aid) continue;
      if (!clientsByAgent[aid]) clientsByAgent[aid] = [];
      clientsByAgent[aid].push(client);
    }

    const teamLeaderboard = downlineAgents.map((agent) => {
      const agentName =
        `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
      // "policies" here is really a count of clients in the window, kept
      // as-is since the frontend reads this field name.
      const agentClients = clientsByAgent[agent.id] || [];
      const totalClients = agentClients.length;
      const totalPremium = agentClients.reduce(
        (sum, c) => sum + (Number(c.monthly_premium) || 0),
        0,
      );
      return {
        agentId: agent.id,
        name: agentName,
        policies: totalClients,
        premium: totalPremium * 12,
        avgPremium: totalClients > 0 ? (totalPremium * 12) / totalClients : 0,
      };
    });

    teamLeaderboard.sort((a, b) => b.premium - a.premium);

    console.log('Generated team leaderboard:', teamLeaderboard);

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
