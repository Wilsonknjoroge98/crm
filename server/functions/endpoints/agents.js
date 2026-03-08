const express = require('express');
const logger = require('firebase-functions/logger');
// eslint-disable-next-line new-cap
const agentRouter = express.Router();
agentRouter.get('/agent', async (req, res) => {
    logger.log('Getting current agent', {
        route: '/agent',
        agentId: req.agent?.id,
    });
    res.json(req.agent);
});
agentRouter.get('/agents', async (req, res) => {
    logger.log('Getting all agents', {
        route: '/agents',
        requesterId: req.agent?.id,
    });

    const { data: agents, error } = await req.supabase.from('agents').select('*');

    if (error) {
        logger.warn('Error fetching agents in endpoints/agents.js', {
            route: '/agents',
            requesterId: req.agent?.id,
            error,
        });
        res.status(500).json({ error: 'Failed to fetch agents' });
    } else {
        logger.log('Fetched all agents successfully', {
            route: '/agents',
            requesterId: req.agent?.id,
            count: agents?.length || 0,
        });
        res.status(200).json(agents);
    }
});

agentRouter.patch('/agent', async (req, res) => {
    const { agentId, agent } = req.body;

    logger.log('Updating agent', {
        route: '/agent',
        method: 'PATCH',
        requesterId: req.agent?.id,
        targetAgentId: agentId,
        fieldsToUpdate: Object.keys(agent || {}),
    });

    const { data, error } = await req.supabase.from('agents').update(agent).eq('id', agentId);

    if (error) {
        logger.warn('Error updating agent in endpoints/agents.js', {
            route: '/agent',
            method: 'PATCH',
            requesterId: req.agent?.id,
            targetAgentId: agentId,
            error,
        });
        res.status(500).json({ error: 'Failed to update agent' });
    } else {
        logger.log('Updated agent successfully', {
            route: '/agent',
            method: 'PATCH',
            requesterId: req.agent?.id,
            targetAgentId: agentId,
        });
        res.status(200).json(data);
    }
});

agentRouter.delete('/agent', async (req, res) => {
    const { agentId } = req.body;

    logger.log('Deleting agent', {
        route: '/agent',
        method: 'DELETE',
        requesterId: req.agent?.id,
        targetAgentId: agentId,
    });

    const { error } = await req.supabase.from('agents').delete().eq('id', agentId);

    if (error) {
        logger.warn('Error deleting agent in endpoints/agents.js', {
            route: '/agent',
            method: 'DELETE',
            requesterId: req.agent?.id,
            targetAgentId: agentId,
            error,
        });
        res.status(500).json({ error: 'Failed to delete agent' });
    } else {
        logger.log('Deleted agent successfully', {
            route: '/agent',
            method: 'DELETE',
            requesterId: req.agent?.id,
            targetAgentId: agentId,
        });
        res.status(200).json({ message: 'Agent deleted successfully' });
    }
});

module.exports = agentRouter;
