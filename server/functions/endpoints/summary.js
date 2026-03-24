const express = require('express');
const logger = require('firebase-functions/logger');

// eslint-disable-next-line new-cap
const summaryRouter = express.Router();

summaryRouter.get('/team', async (req, res) => {
  const { startDate, endDate } = req.query;

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

    const { data: clientData, error: clientError } = await req.supabase
      .from('clients')
      .select('*')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59.999`);

    if (clientError) {
      logger.error(
        'Error fetching clients for team summary in endpoints/summary.js',
        {
          route: '/team-summary',
          method: 'GET',
          requesterId: req.agent?.id,
          startDate,
          endDate,
          error: clientError,
        },
      );
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    const { data: policiesData, error: policiesError } = await req.supabase
      .from('policies')
      .select('*')
      .gte('sold_date', startDate)
      .lte('sold_date', endDate);

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
      return acc + (Number(policy.premium_amount) || 0);
    }, 0);
    const avgPremium =
      totalPolicies > 0 ? (totalPremium * 12) / totalPolicies : 0;

    logger.log('Generated team summary successfully', {
      route: '/team-summary',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
      totalClients: clientData?.length || 0,
      totalPolicies,
      totalPremium,
      avgPremium,
    });

    return res.status(200).json({
      totalClients: clientData?.length || 0,
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

    const { data: clientData, error: clientError } = await req.supabase
      .from('clients')
      .select(
        `
                *,
                agent_clients!agent_clients_client_id_fkey!inner (
                    agent_id
                )
            `,
      )
      .eq('agent_clients.agent_id', req.agent.id)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59.999`);

    if (clientError) {
      logger.error(
        'Error fetching clients for personal summary in endpoints/summary.js',
        {
          route: '/personal-summary',
          method: 'GET',
          requesterId: req.agent?.id,
          startDate,
          endDate,
          error: clientError,
        },
      );
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    const { data: policiesData, error: policiesError } = await req.supabase
      .from('policies')
      .select('*')
      .eq('writing_agent_id', req.agent.id)
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
      return acc + (Number(policy.premium_amount) || 0);
    }, 0);
    const avgPremium =
      totalPolicies > 0 ? (totalPremium * 12) / totalPolicies : 0;

    logger.log('Generated personal summary successfully', {
      route: '/personal-summary',
      method: 'GET',
      requesterId: req.agent?.id,
      startDate,
      endDate,
      totalClients: clientData?.length || 0,
      totalPolicies,
      totalPremium,
      avgPremium,
    });

    return res.status(200).json({
      totalClients: clientData?.length || 0,
      totalPolicies,
      totalPremium: totalPremium * 12,
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
