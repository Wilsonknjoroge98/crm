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

    // Single bulk policies query for the entire downline
    let policiesQuery = supabaseService
      .from('policies')
      .select(
        filterGsq
          ? 'writing_agent_id, premium_amount, clients!policies_client_id_fkey!inner(leads!clients_lead_id_fkey!inner(lead_vendor_id))'
          : 'writing_agent_id, premium_amount',
      )
      .in('writing_agent_id', downlineIdList)
      .limit(50000);

    if (filterGsq) {
      policiesQuery = policiesQuery.eq(
        'clients.leads.lead_vendor_id',
        GSQ_LEAD_VENDOR_ID,
      );
    }

    if (startDate && endDate) {
      policiesQuery = policiesQuery
        .gte('sold_date', startDate)
        .lte('sold_date', endDate);
    }

    const { data: allPolicies, error: policiesError } = await policiesQuery;

    if (policiesError) {
      logger.error('Error fetching policies in endpoints/team_leaderboard.js', {
        route: '/team-leaderboard',
        method: 'GET',
        requesterId: req.agent?.id,
        error: policiesError,
      });
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    // Group policies by agent in JS
    const policiesByAgent = {};
    for (const policy of allPolicies || []) {
      const aid = policy.writing_agent_id;
      if (!policiesByAgent[aid]) policiesByAgent[aid] = [];
      policiesByAgent[aid].push(policy);
    }

    const teamLeaderboard = downlineAgents.map((agent) => {
      const agentName =
        `${agent.first_name || ''} ${agent.last_name || ''}`.trim();
      const agentPolicies = policiesByAgent[agent.id] || [];
      const totalPolicies = agentPolicies.length;
      const totalPremium = agentPolicies.reduce(
        (sum, p) => sum + (Number(p.premium_amount) || 0),
        0,
      );
      return {
        agentId: agent.id,
        name: agentName,
        policies: totalPolicies,
        premium: totalPremium * 12,
        avgPremium: totalPolicies > 0 ? (totalPremium * 12) / totalPolicies : 0,
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
