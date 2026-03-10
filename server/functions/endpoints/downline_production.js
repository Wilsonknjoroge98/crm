const express = require('express');
const logger = require('firebase-functions/logger');

// eslint-disable-next-line new-cap
const downlineProductionRouter = express.Router();
// TODO: AI says this one needs to be optimized due to recurisve queries

downlineProductionRouter.get('/', async (req, res) => {
    try {
        logger.log('Getting downline production', {
            route: '/downline-production',
            method: 'GET',
            requesterId: req.agent?.id,
        });

        const { data: allAgents, error: agentsError } = await req.supabase
            .from('agents')
            .select('id, first_name, last_name');

        if (agentsError) {
            logger.error('Error fetching agents in endpoints/downline_production.js', {
                route: '/downline-production',
                method: 'GET',
                requesterId: req.agent?.id,
                error: agentsError,
            });
            return res.status(500).json({ error: 'Failed to fetch agents for downline production' });
        }

        logger.log('Fetched agents for downline production', {
            route: '/downline-production',
            method: 'GET',
            requesterId: req.agent?.id,
            count: allAgents?.length || 0,
        });

        const downlineProduction = [];

        for (const agent of allAgents) {
            const agentName = `${agent.first_name || ''} ${agent.last_name || ''}`.trim();

            logger.log('Getting downline production metrics for agent', {
                route: '/downline-production',
                method: 'GET',
                requesterId: req.agent?.id,
                targetAgentId: agent.id,
                targetAgentName: agentName,
            });

            const { count: clientsCount, error: clientsError } = await req.supabase
                .from('agent_clients')
                .select('client_id', { count: 'exact' })
                .eq('agent_id', agent.id);

            if (clientsError) {
                logger.error('Error fetching clients count in endpoints/downline_production.js', {
                    route: '/downline-production',
                    method: 'GET',
                    requesterId: req.agent?.id,
                    targetAgentId: agent.id,
                    targetAgentName: agentName,
                    error: clientsError,
                });
                return res.status(500).json({ error: 'Failed to fetch clients for downline production' });
            }

            const { data: agentPolicies, error: policiesError } = await req.supabase
                .from('policies')
                .select('premiumAmount')
                .eq('writing_agent_id', agent.id);

            if (policiesError) {
                logger.error('Error fetching policies in endpoints/downline_production.js', {
                    route: '/downline-production',
                    method: 'GET',
                    requesterId: req.agent?.id,
                    targetAgentId: agent.id,
                    targetAgentName: agentName,
                    error: policiesError,
                });
                return res.status(500).json({ error: 'Failed to fetch policies' });
            }

            const totalPolicies = agentPolicies?.length || 0;
            const totalPremium = (agentPolicies || []).reduce((sum, policy) => {
                return sum + (Number(policy.premiumAmount) || 0);
            }, 0);

            downlineProduction.push({
                name: agentName,
                clients: clientsCount || 0,
                premium: totalPremium,
                policies: totalPolicies,
            });

            logger.log('Computed downline production metrics for agent', {
                route: '/downline-production',
                method: 'GET',
                requesterId: req.agent?.id,
                targetAgentId: agent.id,
                targetAgentName: agentName,
                clients: clientsCount || 0,
                policies: totalPolicies,
                premium: totalPremium,
            });
        }

        logger.log('Generated downline production successfully', {
            route: '/downline-production',
            method: 'GET',
            requesterId: req.agent?.id,
            count: downlineProduction.length,
        });

        return res.status(200).json(downlineProduction);
    } catch (error) {
        logger.error('Unexpected error in endpoints/downline_production.js', {
            route: '/downline-production',
            method: 'GET',
            requesterId: req.agent?.id,
            error,
        });
        return res.status(500).json({ error: 'Failed to generate downline production summary' });
    }
});

module.exports = downlineProductionRouter;
