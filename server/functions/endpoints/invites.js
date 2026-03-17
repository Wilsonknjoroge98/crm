const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const dayjs = require('dayjs');

// eslint-disable-next-line new-cap
const inviteRouter = express.Router();

inviteRouter.post('/', async (req, res) => {
  try {
    const token = crypto.randomUUID();
    const expires_at = dayjs().add(7, 'day').toISOString();

    const { data, error } = await supabaseService
      .from('invites')
      .insert({ token, upline_agent_id: req.agent.id, used: false, expires_at })
      .select('*')
      .single();

    if (error) {
      logger.error('Error creating invite in endpoints/invites.js', { error });
      return res.status(500).json({ error: 'Failed to create invite' });
    }

    logger.log('Invite created', { inviteId: data.id, agentId: req.agent.id });
    return res.status(201).json(data);
  } catch (error) {
    logger.error('Unexpected error in endpoints/invites.js', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = inviteRouter;
