const express = require('express');
const logger = require('firebase-functions/logger');

// eslint-disable-next-line new-cap
const hierarchyRouter = express.Router();

const formatCurrency = (amount) => {
    return `$${Number(amount || 0).toLocaleString()}`;
};

hierarchyRouter.get('/', async (req, res) => {
    try {
        logger.log('Building hierarchy tree', {
            route: '/hierarchy',
            method: 'GET',
            requesterId: req.agent?.id,
        });

        const { data: agents, error: agentsError } = await req.supabase
            .from('agents')
            .select('id, first_name, last_name, level, upline_agent_id');

        if (agentsError) {
            logger.error('Error fetching hierarchy agents in endpoints/hierarchy.js', {
                route: '/hierarchy',
                method: 'GET',
                requesterId: req.agent?.id,
                error: agentsError,
            });
            return res.status(500).json({ error: 'Failed to fetch agents' });
        }

        logger.log('Fetched hierarchy agents successfully', {
            route: '/hierarchy',
            method: 'GET',
            requesterId: req.agent?.id,
            count: agents?.length || 0,
        });

        const agentIds = agents.map((agent) => agent.id);

        const { data: policies, error: policiesError } = await req.supabase
            .from('policies')
            .select('id, writing_agent_id, premium_amount')
            .in('writing_agent_id', agentIds);

        if (policiesError) {
            logger.error('Error fetching hierarchy policies in endpoints/hierarchy.js', {
                route: '/hierarchy',
                method: 'GET',
                requesterId: req.agent?.id,
                agentCount: agentIds.length,
                error: policiesError,
            });
            return res.status(500).json({ error: 'Failed to fetch policies' });
        }

        logger.log('Fetched hierarchy policies successfully', {
            route: '/hierarchy',
            method: 'GET',
            requesterId: req.agent?.id,
            count: policies?.length || 0,
        });

        const policyStatsByAgentId = policies.reduce((acc, policy) => {
            const agentId = policy.writing_agent_id;

            if (!acc[agentId]) {
                acc[agentId] = {
                    premium: 0,
                    policies: 0,
                };
            }

            acc[agentId].premium += Number(policy.premium_amount) || 0;
            acc[agentId].policies += 1;

            return acc;
        }, {});

        const nodeMap = new Map();

        for (const agent of agents) {
            const stats = policyStatsByAgentId[agent.id] || {
                premium: 0,
                policies: 0,
            };

            nodeMap.set(agent.id, {
                id: agent.id,
                upline_agent_id: agent.upline_agent_id,
                name: `${agent.first_name} ${agent.last_name}`.trim(),
                attributes: {
                    level: agent.level,
                    premium: formatCurrency(stats.premium),
                    policies: String(stats.policies),
                },
                children: [],
            });
        }

        logger.log('Built hierarchy node map', {
            route: '/hierarchy',
            method: 'GET',
            requesterId: req.agent?.id,
            nodeCount: nodeMap.size,
        });

        let rootNode = nodeMap.get(req.agent?.id);

        if (!rootNode && req.agent) {
            const rootStats = policyStatsByAgentId[req.agent.id] || {
                premium: 0,
                policies: 0,
            };

            rootNode = {
                id: req.agent.id,
                upline_agent_id: null,
                name: `${req.agent.first_name} ${req.agent.last_name}`.trim(),
                attributes: {
                    level: req.agent.level,
                    premium: formatCurrency(rootStats.premium),
                    policies: String(rootStats.policies),
                },
                children: [],
            };

            nodeMap.set(req.agent.id, rootNode);

            logger.warn('Root agent was missing from fetched hierarchy agents, added fallback node', {
                route: '/hierarchy',
                method: 'GET',
                requesterId: req.agent?.id,
                rootAgentId: req.agent.id,
            });
        }

        for (const node of nodeMap.values()) {
            if (!node.upline_agent_id) {
                continue;
            }

            const parentNode = nodeMap.get(node.upline_agent_id);

            if (parentNode) {
                parentNode.children.push(node);
            }
        }

        if (!rootNode) {
            logger.warn('Current agent not found in hierarchy', {
                route: '/hierarchy',
                method: 'GET',
                requesterId: req.agent?.id,
            });
            return res.status(404).json({ error: 'Current agent not found in hierarchy' });
        }

        const stripInternalFields = (node) => ({
            name: node.name,
            attributes: node.attributes,
            ...(node.children.length > 0
                ? { children: node.children.map(stripInternalFields) }
                : {}),
        });

        const hierarchyTree = stripInternalFields(rootNode);

        logger.log('Built hierarchy tree successfully', {
            route: '/hierarchy',
            method: 'GET',
            requesterId: req.agent?.id,
            rootName: rootNode.name,
            childCount: rootNode.children.length,
        });

        return res.status(200).json(hierarchyTree);
    } catch (error) {
        logger.error('Unexpected error building hierarchy tree in endpoints/hierarchy.js', {
            route: '/hierarchy',
            method: 'GET',
            requesterId: req.agent?.id,
            error,
        });
        return res.status(500).json({ error: 'Failed to build hierarchy tree' });
    }
});

module.exports = hierarchyRouter;
