const express = require('express');
const logger = require('firebase-functions/logger');
// eslint-disable-next-line new-cap
const agentRouter = express.Router();

agentRouter.get('/', async (req, res) => {
  logger.log('Getting current agent', {
    route: '/agent',
    agentId: req.agent?.id,
  });
  res.json({ ...req.agent, role: req.user.role });
});
agentRouter.get('/all', async (req, res) => {
  logger.log('Getting all agents', {
    route: '/agents',
    requesterId: req.agent?.id,
  });

  const { data: agents, error } = await req.supabase.from('agents').select('*');

  if (error) {
    logger.warn('Error fetching agents in endpoints/agents.js', {
      route: '/',
      requesterId: req.agent?.id,
      error,
    });
    res.status(500).json({ error: 'Failed to fetch agents' });
  }

  logger.log('Fetched all agents successfully', {
    route: '/',
    requesterId: req.agent?.id,
    count: agents?.length || 0,
  });
  res.status(200).json(agents);
});

agentRouter.patch('/', async (req, res) => {
  const { agentId, agent } = req.body;

  logger.log('Updating agent', {
    route: '/agent',
    method: 'PATCH',
    requesterId: req.agent?.id,
    targetAgentId: agentId,
    fieldsToUpdate: Object.keys(agent || {}),
  });

  // Validate hierarchy integrity when level is being changed
  if (agent.level !== undefined) {
    const newLevel = agent.level;

    // Fetch current agent to get their upline
    const { data: current, error: currentError } = await req.supabase
      .from('agents')
      .select('upline_agent_id')
      .eq('id', agentId)
      .single();

    if (currentError) {
      return res.status(500).json({ error: 'Failed to validate agent hierarchy' });
    }

    // Check upline constraint: new level must be less than upline's level
    if (current.upline_agent_id) {
      const { data: upline, error: uplineError } = await req.supabase
        .from('agents')
        .select('level, first_name, last_name')
        .eq('id', current.upline_agent_id)
        .single();

      if (!uplineError && upline && newLevel >= upline.level) {
        return res.status(422).json({
          error: `Level ${newLevel} is not valid. Agent's upline (${upline.first_name} ${upline.last_name}) is at level ${upline.level}. Agent level must be below their upline.`,
        });
      }
    }

    // Check downline constraint: new level must be greater than all direct downlines' levels
    const { data: downlines, error: downlineError } = await req.supabase
      .from('agents')
      .select('level, first_name, last_name')
      .eq('upline_agent_id', agentId);

    if (!downlineError && downlines?.length) {
      const blocking = downlines.filter((d) => d.level >= newLevel);
      if (blocking.length) {
        const names = blocking.map((d) => `${d.first_name} ${d.last_name} (${d.level})`).join(', ');
        return res.status(422).json({
          error: `Level ${newLevel} conflicts with downline agent(s): ${names}. Agent level must be above all direct downlines.`,
        });
      }
    }
  }

  const { data, error } = await req.supabase
    .from('agents')
    .update(agent)
    .eq('id', agentId)
    .select()
    .single();

  if (error) {
    logger.warn('Error updating agent in endpoints/agents.js', {
      route: '/agent',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetAgentId: agentId,
      error,
    });
    return res.status(500).json({ error: 'Failed to update agent' });
  }

  logger.log('Updated agent successfully', {
    route: '/agent',
    method: 'PATCH',
    requesterId: req.agent?.id,
    targetAgentId: agentId,
  });
  res.status(200).json(data);
});

agentRouter.delete('/', async (req, res) => {
  const { agentId } = req.body;

  logger.log('Deleting agent', {
    route: '/agent',
    method: 'DELETE',
    requesterId: req.agent?.id,
    targetAgentId: agentId,
  });

  const { error } = await req.supabase
    .from('agents')
    .delete()
    .eq('id', agentId);

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
      route: '/',
      method: 'DELETE',
      requesterId: req.agent?.id,
      targetAgentId: agentId,
    });
    res.status(200).json({ message: 'Agent deleted successfully' });
  }
});

module.exports = agentRouter;
