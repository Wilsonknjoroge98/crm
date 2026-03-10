const express = require('express');
const logger = require('firebase-functions/logger');
const {supabaseService} = require("../services/supabase");

// eslint-disable-next-line new-cap
const publicRouter = express.Router();

publicRouter.post('/agent', async (req, res) => {
    try {
    console.log('Creating agent');

    const { agent } = req.body;
    // get org id until find good way to have public routes
    // eslint-disable-next-line camelcase
    // eslint-disable-next-line camelcase
    const { data: uplineAgent, error: uplineAgenetError } = await supabaseService
        .from('agents')
        .select('id')
        .eq('email', agent.uplineEmail)
        .maybeSingle();
    if (uplineAgenetError) {
        console.error('Error fetching upline agent:', uplineAgenetError);
        return res.status(500).json({ error: 'Failed to fetch upline agent' });
    }
    if (!uplineAgent) {
        console.error('No upline agent found for email:', agent.uplineEmail);
        return res.status(400).json({ error: 'No upline agent found' });
    }

    const payload = {
        first_name: agent.name.split(' ')[0],
        last_name: agent.name.split(' ')[1],
        npn: agent.npn,
        // eslint-disable-next-line camelcase
        org_id: agent.orgId,
        // eslint-disable-next-line camelcase
        upline_agent_id: uplineAgent.id,
        email: agent.email,
        level: agent.level,
        id: req.user.id,
    };

    logger.log('Agent creation payload:', payload);

    try {
        const { data, agentError } = await supabaseService
            .from('agents')
            .insert([payload]);

        if (agentError) {
            logger.error('Error creating agent:', agentError);
            res.status(500).send({ error: 'Failed to create agent' });
        } else {
            logger.log('Agent created successfully:', data);
            res.status(200).json(data);
        }
    } catch (error) {
        logger.error('Error creating agent:', error);
        res.status(500).json({ error: 'Failed to create agent' });
    }
    } catch (error) {
        logger.error('Error creating agent:', error);
        res.status(500).json({ error: 'Failed to create agent' });
    }
});

publicRouter.get('/organizations', async (req, res) => {
    logger.log('Getting organizations');
    try {
        const { data: organizations, error: organizationsError } = await supabaseService
            .from('organizations')
            .select('*');
        if (organizationsError) {
            logger.error('Error fetching organizations:', organizationsError);
            res.status(500).send({ error: 'Failed to fetch organizations' });
        } else {
            logger.log('Fetched organizations:', organizations);
            res.status(200).json(organizations);
        }

    } catch (error) {
        logger.error('Error fetching organizations:', error);
        res.status(500).send({ error: 'Failed to fetch organizations' });
    }
});
module.exports = publicRouter;
