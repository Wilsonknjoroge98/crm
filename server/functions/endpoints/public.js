const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const dayjs = require('dayjs');

// eslint-disable-next-line new-cap
const publicRouter = express.Router();

publicRouter.get('/invite/validate', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res
      .status(400)
      .json({ valid: false, error: 'Missing invite token' });
  }

  try {
    const { data, error } = await supabaseService
      .from('invites')
      .select('id, used, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (error) {
      logger.error('Error validating invite in endpoints/public.js', { error });
      return res
        .status(500)
        .json({ valid: false, error: 'Failed to validate invite' });
    }

    if (!data) {
      return res
        .status(404)
        .json({ valid: false, error: 'Invalid invite token' });
    }

    if (data.used) {
      return res
        .status(410)
        .json({ valid: false, error: 'This invite has already been used' });
    }

    if (dayjs().isAfter(dayjs(data.expires_at))) {
      return res
        .status(410)
        .json({ valid: false, error: 'This invite has expired' });
    }

    return res.status(200).json({ valid: true });
  } catch (error) {
    logger.error('Unexpected error validating invite in endpoints/public.js', {
      error,
    });
    return res
      .status(500)
      .json({ valid: false, error: 'Internal server error' });
  }
});

publicRouter.post('/agent', async (req, res) => {
  try {
    const { agent } = req.body;

    if (!agent?.userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    let uplineAgentId = null;
    let orgId = agent.orgId ?? null;

    if (agent.token) {
      const { data: invite, error: inviteError } = await supabaseService
        .from('invites')
        .select('upline_agent_id, agents ( org_id, level )')
        .eq('token', agent.token)
        .maybeSingle();

      if (inviteError) {
        logger.error(
          'Error fetching invite for upline resolution:',
          inviteError,
        );
        return res
          .status(500)
          .json({ error: 'Failed to resolve upline from invite' });
      }

      uplineAgentId = invite?.upline_agent_id ?? null;
      orgId = invite?.agents?.org_id ?? null;
      agent.level = invite?.agents?.level - 5 ?? agent.level;
    }

    const payload = {
      first_name: agent.name.split(' ')[0],
      last_name: agent.name.split(' ')[1],
      npn: agent.npn,
      org_id: orgId,
      upline_agent_id: uplineAgentId,
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

    if (agent.token) {
      await supabaseService
        .from('invites')
        .update({ used: true })
        .eq('token', agent.token);
    }

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
