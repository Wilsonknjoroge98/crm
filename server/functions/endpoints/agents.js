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

agentRouter.post('/agent', async (req, res) => {
  const { agent } = req.body;

  logger.log('Creating agent', {
    route: '/agent',
    method: 'POST',
    requesterId: req.user?.id,
    agentData: agent,
  });

  if (!agent) {
    return res.status(400).json({ error: 'Missing agent data' });
  }

  try {
    const org_id = (
      await req.supabase
        .from('organizations')
        .select('id')
        .eq('name', agent.agency)
        .single()
    ).data.id;

    const upline_agent_id = (
      await req.supabase
        .from('agents')
        .select('id')
        .eq('email', agent.uplineEmail)
        .single()
    ).data?.id;

    agent.upline_agent_id = upline_agent_id || null;
    agent.org_id = org_id;
    agent.first_name = agent.name.split(' ')[0]; // extract first name from full name
    agent.last_name = agent.name.split(' ').slice(1).join(' '); // extract last name from full name

    delete agent.agency;
    delete agent.role;
    delete agent.name;
    delete agent.uplineEmail;

    const { data, error } = await req.supabase
      .from('agents')
      .insert({ ...agent, id: req.user.id })
      .select('*')
      .single();

    if (error) {
      logger.error('Error creating agent in endpoints/agents.js', {
        route: '/agent',
        method: 'POST',
        requesterId: req.user?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to create agent' });
    }

    logger.log('Created agent successfully', {
      route: '/agent',
      method: 'POST',
      agentId: data?.id,
    });

    return res.status(201).json(data);
  } catch (error) {
    logger.error('Unexpected error creating agent in endpoints/agents.js', {
      route: '/agent',
      method: 'POST',
      requesterId: req.user?.id,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
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

  const { data, error } = await req.supabase
    .from('agents')
    .update(agent)
    .eq('id', agentId);

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
      route: '/agent',
      method: 'DELETE',
      requesterId: req.agent?.id,
      targetAgentId: agentId,
    });
    res.status(200).json({ message: 'Agent deleted successfully' });
  }
});

module.exports = agentRouter;
