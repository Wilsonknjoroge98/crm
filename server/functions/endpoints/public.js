const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const publicRouter = express.Router();

publicRouter.post('/agent', async (req, res) => {
  try {
    const { agent } = req.body;

    if (!agent?.userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const { data: uplineAgent, error: uplineAgentError } = await supabaseService
      .from('agents')
      .select('id')
      .eq('email', agent.uplineEmail)
      .maybeSingle();

    if (uplineAgentError) {
      logger.error('Error fetching upline agent:', uplineAgentError);
      return res.status(500).json({ error: 'Failed to fetch upline agent' });
    }
    if (!uplineAgent) {
      logger.warn('No upline agent found for email:', agent.uplineEmail);
      return res.status(400).json({ error: 'No upline agent found' });
    }

    const payload = {
      first_name: agent.name.split(' ')[0],
      last_name: agent.name.split(' ')[1],
      npn: agent.npn,
      org_id: agent.orgId,
      upline_agent_id: uplineAgent.id,
      email: agent.email,
      level: agent.level,
      id: agent.userId,
    };

    logger.log('Agent creation payload:', payload);

    const { data, error } = await supabaseService
      .from('agents')
      .insert([payload])
      .select('*');

    if (error) {
      logger.error('Error creating agent:', error);
      return res.status(500).json({ error: 'Failed to create agent' });
    }

    logger.log('Agent created successfully:', data[0]);
    return res.status(201).json(data[0]);
  } catch (error) {
    logger.error('Error creating agent:', error);
    return res.status(500).json({ error: 'Failed to create agent' });
  }
});

publicRouter.get('/organizations', async (req, res) => {
  logger.log('Getting organizations');
  try {
    const { data: organizations, error: organizationsError } =
      await supabaseService.from('organizations').select('*');
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
