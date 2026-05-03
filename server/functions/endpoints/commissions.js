const express = require('express');
const logger = require('firebase-functions/logger');
const { PRODUCT_RATES } = require('../constants');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const commissionsRouter = express.Router();

commissionsRouter.get('/', async (req, res) => {
  const AGENT_ID = '92566663-1fbb-4ffe-b835-8f33ade1bbbd';
  const { startDate, endDate } = req.query;

  const getContractRate = (level, carrierName, productName) => {
    const rate = PRODUCT_RATES?.[carrierName]?.[productName]?.[String(level)];
    return rate != null ? rate / 100 : 1;
  };

  try {
    logger.log('Calculating commissions', {
      route: '/commissions',
      method: 'GET',
      targetAgentId: AGENT_ID,
      startDate,
      endDate,
    });

    const { data: allAgents, error: agentsError } = await supabaseService
      .from('agents')
      .select('id, first_name, last_name, level, upline_agent_id');

    if (agentsError) {
      logger.error('Error fetching agents in /commissions', {
        error: agentsError,
      });
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    const agent = allAgents.find((a) => a.id === AGENT_ID);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const downlineIds = new Set();
    const queue = [AGENT_ID];
    while (queue.length > 0) {
      const currentId = queue.shift();
      for (const a of allAgents) {
        if (a.upline_agent_id === currentId && !downlineIds.has(a.id)) {
          downlineIds.add(a.id);
          queue.push(a.id);
        }
      }
    }

    let ownPoliciesQuery = supabaseService
      .from('policies')
      .select(
        'id, premium_amount, split_agent_id, split_agent_share, carriers ( name ), products ( name )',
      )
      .eq('writing_agent_id', AGENT_ID);

    if (startDate) {
      ownPoliciesQuery = ownPoliciesQuery.gte('effective_date', startDate);
    }

    if (endDate) {
      ownPoliciesQuery = ownPoliciesQuery.lte('effective_date', endDate);
    }

    const { data: ownPolicies, error: ownPoliciesError } =
      await ownPoliciesQuery;

    if (ownPoliciesError) {
      logger.error('Error fetching own policies in /commissions', {
        error: ownPoliciesError,
      });
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    let directCommissions = 0;

    for (const policy of ownPolicies || []) {
      const carrierName = policy.carriers?.name;
      const productName = policy.products?.name;
      const contractRate = getContractRate(
        agent.level,
        carrierName,
        productName,
      );
      const ap = Number(policy.premium_amount) * 12;

      if (policy.split_agent_id && policy.split_agent_share != null) {
        const writingAgentShare = (100 - policy.split_agent_share) / 100;
        directCommissions += ap * writingAgentShare * contractRate;
      } else {
        directCommissions += ap * contractRate;
      }
    }

    let overridingCommissions = 0;

    if (downlineIds.size > 0) {
      let downlinePoliciesQuery = supabaseService
        .from('policies')
        .select(
          'id, premium_amount, writing_agent_id, carriers ( name ), products ( name )',
        )
        .in('writing_agent_id', [...downlineIds]);

      if (startDate)
        downlinePoliciesQuery = downlinePoliciesQuery.gte(
          'effective_date',
          startDate,
        );
      if (endDate)
        downlinePoliciesQuery = downlinePoliciesQuery.lte(
          'effective_date',
          endDate,
        );

      const { data: downlinePolicies, error: downlinePoliciesError } =
        await downlinePoliciesQuery;

      if (downlinePoliciesError) {
        logger.error('Error fetching downline policies in /commissions', {
          error: downlinePoliciesError,
        });
        return res
          .status(500)
          .json({ error: 'Failed to fetch downline policies' });
      }

      const agentMap = new Map(allAgents.map((a) => [a.id, a]));

      for (const policy of downlinePolicies || []) {
        const downlineAgent = agentMap.get(policy.writing_agent_id);
        if (!downlineAgent) continue;

        const carrierName = policy.carriers?.name;
        const productName = policy.products?.name;
        const uplineRate = getContractRate(
          agent.level,
          carrierName,
          productName,
        );
        const downlineRate = getContractRate(
          downlineAgent.level,
          carrierName,
          productName,
        );
        const overrideRate = uplineRate - downlineRate;

        if (overrideRate > 0) {
          const ap = Number(policy.premium_amount) * 12;
          overridingCommissions += ap * overrideRate;
        }
      }
    }

    let splitPoliciesQuery = supabaseService
      .from('policies')
      .select(
        'id, premium_amount, split_agent_share, carriers ( name ), products ( name )',
      )
      .eq('split_agent_id', AGENT_ID);

    if (startDate)
      splitPoliciesQuery = splitPoliciesQuery.gte('effective_date', startDate);
    if (endDate)
      splitPoliciesQuery = splitPoliciesQuery.lte('effective_date', endDate);

    const { data: splitPolicies, error: splitPoliciesError } =
      await splitPoliciesQuery;

    if (splitPoliciesError) {
      logger.error('Error fetching split policies in /commissions', {
        error: splitPoliciesError,
      });
      return res.status(500).json({ error: 'Failed to fetch split policies' });
    }

    let splitCommissions = 0;

    for (const policy of splitPolicies || []) {
      if (policy.split_agent_share == null) continue;
      const carrierName = policy.carriers?.name;
      const productName = policy.products?.name;
      const contractRate = getContractRate(
        agent.level,
        carrierName,
        productName,
      );
      const ap = Number(policy.premium_amount) * 12;
      splitCommissions += ap * (policy.split_agent_share / 100) * contractRate;
    }

    const totalCommissions = Math.round(
      directCommissions + overridingCommissions + splitCommissions,
    );

    logger.log('Commissions calculated successfully', {
      route: '/commissions',
      method: 'GET',
      targetAgentId: AGENT_ID,
      agentName: `${agent.first_name} ${agent.last_name}`,
      directCommissions: Math.round(directCommissions),
      overridingCommissions: Math.round(overridingCommissions),
      splitCommissions: Math.round(splitCommissions),
      totalCommissions,
    });

    return res.status(200).json({
      agentId: AGENT_ID,
      agentName: `${agent.first_name} ${agent.last_name}`,
      direct: Math.round(directCommissions),
      overriding: Math.round(overridingCommissions),
      split: Math.round(splitCommissions),
      total: Math.round(totalCommissions),
    });
  } catch (error) {
    logger.error('Unexpected error in /commissions', { error });
    return res.status(500).json({ error: 'Failed to calculate commissions' });
  }
});

module.exports = commissionsRouter;
