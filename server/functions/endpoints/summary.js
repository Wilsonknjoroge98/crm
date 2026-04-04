const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const summaryRouter = express.Router();

const GSQ_LEAD_VENDOR_ID = '1043bc55-a8cd-485f-bddc-46bcfc06d4ba';
const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';
const TOP_LEVEL_AGENT_ID = '3d670459-8730-42f9-8b98-08c34f98f4a6';

summaryRouter.get('/team', async (req, res) => {
  const { startDate, endDate, gsqOnly } = req.query;

  const filterGsq = gsqOnly === 'true';

  if (!startDate || !endDate) {
    logger.warn('Missing date range for team summary in endpoints/summary.js', {
      route: '/team-summary',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
    });
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    logger.log('Getting team summary', {
      route: '/team-summary',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
    });

    const { data: allAgents, error: agentsError } = await supabaseService
      .from('agents')
      .select('id, upline_agent_id');

    if (agentsError) {
      logger.error(
        'Error fetching agents for team summary in endpoints/summary.js',
        {
          route: '/team-summary',
          method: 'GET',
          requesterId: req.agent?.id,
          error: agentsError,
        },
      );
      return res.status(500).json({ error: 'Failed to fetch agents' });
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
    const downlineIdList = [...downlineIds];

    // const { data: clientData, error: clientError } = await supabaseService
    //   .from('clients')
    //   .select(
    //     'id, created_at, agent_clients!agent_clients_client_id_fkey!inner(agent_id)',
    //   )
    //   .in('agent_clients.agent_id', downlineIdList)
    //   .gte('created_at', `${startDate}T00:00:00`)
    //   .lte('created_at', `${endDate}T23:59:59.999`);

    // if (clientError) {
    //   logger.error(
    //     'Error fetching clients for team summary in endpoints/summary.js',
    //     {
    //       route: '/team-summary',
    //       method: 'GET',
    //       requesterId: req.agent?.id,
    //       startDate,
    //       endDate,
    //       error: clientError,
    //     },
    //   );
    //   return res.status(500).json({ error: 'Failed to fetch clients' });
    // }

    let policiesQuery = supabaseService
      .from('policies')
      .select(
        filterGsq
          ? 'premium_amount, clients!policies_client_id_fkey!inner(leads!clients_lead_id_fkey!inner(lead_vendor_id))'
          : 'premium_amount',
      )
      .in('writing_agent_id', downlineIdList)
      .gte('sold_date', startDate)
      .lte('sold_date', endDate);

    if (filterGsq) {
      policiesQuery = policiesQuery.eq(
        'clients.leads.lead_vendor_id',
        GSQ_LEAD_VENDOR_ID,
      );
    }

    const { data: policiesData, error: policiesError } = await policiesQuery;

    if (policiesError) {
      logger.error(
        'Error fetching policies for team summary in endpoints/summary.js',
        {
          route: '/team-summary',
          method: 'GET',
          requesterId: req.agent?.id,
          startDate,
          endDate,
          error: policiesError,
        },
      );
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    const totalPolicies = policiesData?.length || 0;
    const totalPremium = (policiesData || []).reduce((acc, policy) => {
      return acc + (Number(policy.premium_amount) * 12 || 0);
    }, 0);
    const avgPremium = totalPolicies > 0 ? totalPremium / totalPolicies : 0;

    logger.log('Generated team summary successfully', {
      route: '/team-summary',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
      totalPolicies,
      totalPremium,
      avgPremium,
    });

    return res.status(200).json({
      totalPolicies,
      totalPremium,
      avgPremium,
    });
  } catch (error) {
    logger.error(
      'Unexpected error generating team summary in endpoints/summary.js',
      {
        route: '/team-summary',
        method: 'GET',
        requesterId: req.agent?.id,
        startDate,
        endDate,
        error,
      },
    );
    return res.status(500).json({ error: 'Failed to generate team summary' });
  }
});

summaryRouter.get('/personal', async (req, res) => {
  const { startDate, endDate } = req.query;

  console.log('Received request for personal summary with params:', {
    startDate,
    endDate,
    requesterId: req.agent?.id,
  });

  if (!startDate || !endDate) {
    logger.warn(
      'Missing date range for personal summary in endpoints/summary.js',
      {
        route: '/personal-summary',
        method: 'GET',
        requesterId: req.agent?.id,
        startDate,
        endDate,
      },
    );
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    logger.log('Getting personal summary', {
      route: '/personal-summary',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
    });

    const { data: policiesData, error: policiesError } = await supabaseService
      .from('policies')
      .select('*')
      .in('writing_agent_id', [req.agent.id])
      .gte('sold_date', startDate)
      .lte('sold_date', endDate);

    if (policiesError) {
      logger.error(
        'Error fetching policies for personal summary in endpoints/summary.js',
        {
          route: '/personal-summary',
          method: 'GET',
          requesterId: req.agent?.id,
          startDate,
          endDate,
          error: policiesError,
        },
      );
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    const totalPolicies = policiesData?.length || 0;
    const totalPremium = (policiesData || []).reduce((acc, policy) => {
      return acc + (Number(policy.premium_amount) * 12 || 0);
    }, 0);
    const avgPremium = totalPolicies > 0 ? totalPremium / totalPolicies : 0;

    logger.log('Generated personal summary successfully', {
      route: '/personal-summary',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
      totalClients: 0,
      totalPolicies,
      totalPremium,
      avgPremium,
    });

    return res.status(200).json({
      totalClients: 0,
      totalPolicies,
      totalPremium: totalPremium,
      avgPremium,
    });
  } catch (error) {
    logger.error(
      'Unexpected error generating personal summary in endpoints/summary.js',
      {
        route: '/personal-summary',
        method: 'GET',
        requesterId: req.agent?.id,
        startDate,
        endDate,
        error,
      },
    );
    return res
      .status(500)
      .json({ error: 'Failed to generate personal summary' });
  }
});

module.exports = summaryRouter;
