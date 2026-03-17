const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const clientRouter = express.Router();

clientRouter.get('/all', async (req, res) => {
  try {
    logger.log('Getting clients for current agent', {
      route: '/clients',
      method: 'GET',
      requesterId: req?.agent?.id,
    });

    const { data: clients, error } = await req.supabase
      .from('clients')
      .select(
        `
                *,
                agent_clients!agent_clients_client_id_fkey (
                    agent_id,
                    client_id,
                    agents!agent_clients_agent_id_fkey (
                        id,
                        first_name,
                        last_name
                    )
                )
            `,
      )
      .eq('agent_clients.agent_id', req.agent.id);

    if (error) {
      logger.error('Error fetching clients in endpoints/clients.js', {
        route: '/clients',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    const mapped = (clients || []).map(({ agent_clients, ...client }) => {
      const a = agent_clients?.[0]?.agents;
      const agent_name = a
        ? `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || null
        : null;
      return { ...client, agent_name };
    });

    logger.log('Fetched clients successfully', {
      route: '/clients',
      method: 'GET',
      requesterId: req.agent?.id,
      count: mapped.length,
    });

    return res.status(200).json(mapped);
  } catch (error) {
    logger.error('Unexpected error fetching clients in endpoints/clients.js', {
      route: '/clients',
      method: 'GET',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

clientRouter.post('/', async (req, res) => {
  // eslint-disable-next-line camelcase,no-unused-vars
  const { lead_vendor_id, notes, live_transfer, ...client } = req.body.client;

  console.log('Received client creation request', {
    route: '/client',
    method: 'POST',
    lead_vendor_id,
    notes,
    live_transfer,
    client,
  });

  delete client.live_transfer;

  console.log('Client data after processing', {
    route: '/client',
    method: 'POST',
    client,
  });

  if (!client?.email || !client?.phone) {
    logger.warn('Missing required client fields in endpoints/clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      hasEmail: !!client?.email,
      hasPhone: !!client?.phone,
      liveTransfer: !!live_transfer,
    });
    return res.status(400).json({ error: 'Missing required client fields' });
  }

  logger.log('Creating client', {
    route: '/client',
    method: 'POST',
    client: client,
    requesterId: req.agent?.id,
    email: client.email,
    liveTransfer: !!live_transfer,
    hasNotes: !!notes,
  });

  let leadId = null;

  logger.log('Creating lead for new client', {
    route: '/client',
    method: 'POST',
    requesterId: req?.agent?.id,
    userId: req?.user?.id,
    email: client.email,
    leadVendorId: lead_vendor_id,
  });

  const { data: existingLead, error: existingLeadError } = await supabaseService
    .from('leads')
    .select('id')
    .eq('phone', client.phone)
    .maybeSingle();

  if (existingLeadError) {
    logger.error('Error checking for existing lead in endpoints/clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      email: client.email,
      error: existingLeadError,
    });
    return res.status(500).json({ error: 'Failed to check existing leads' });
  }

  if (
    !existingLead &&
    lead_vendor_id === '1043bc55-a8cd-485f-bddc-46bcfc06d4ba' &&
    live_transfer
  ) {
    const { error: updateLeadError } = await supabaseService
      .from('leads')
      .update({
        gsq_live_transfer: true,
      })
      .eq('id', existingLead.id);
    leadId = existingLead.id;
  } else {
    const { data: lead, error: leadError } = await supabaseService
      .from('leads')
      .insert({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        state: client.state,
        date_of_birth: client.date_of_birth,
        agent_id: req?.agent?.id,
        sold: true,
        lead_vendor_id: lead_vendor_id,
        gsq_live_transfer: live_transfer || false,
      })
      .select('id')
      .maybeSingle();

    if (leadError) {
      logger.error('Error creating lead in endpoints/clients.js', {
        route: '/client',
        method: 'POST',
        requesterId: req.agent?.id,
        email: client.email,
        error: leadError,
      });
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    leadId = lead?.id;
  }

  if (!leadId) {
    logger.error('Lead created without id in endpoints/clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      email: client.email,
    });
    return res.status(500).json({ error: 'Failed to create lead' });
  }

  const { data: newClient, error: clientError } = await supabaseService
    .from('clients')
    .insert({
      ...client,
      lead_id: leadId,
    })
    .select('*')
    .maybeSingle();

  if (clientError) {
    logger.error('Error creating client in endpoints/clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      email: client.email,
      leadId,
      error: clientError,
    });
    return res.status(500).json({ error: 'Failed to create client' });
  }

  if (!newClient?.id) {
    logger.error('Client created without id in endpoints/clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      email: client.email,
      leadId,
    });
    return res.status(500).json({ error: 'Failed to create client' });
  }

  const { error: agentClientError } = await req.supabase
    .from('agent_clients')
    .insert({
      agent_id: req.agent.id,
      client_id: newClient.id,
      agent_notes: notes || null,
    });

  if (agentClientError) {
    logger.error(
      'Error creating agent_clients record in endpoints/clients.js',
      {
        route: '/client',
        method: 'POST',
        requesterId: req.agent?.id,
        clientId: newClient.id,
        leadId,
        error: agentClientError,
      },
    );
    return res.status(500).json({ error: 'Failed to link client to agent' });
  }

  logger.log('Created client successfully', {
    route: '/client',
    method: 'POST',
    requesterId: req.agent?.id,
    clientId: newClient.id,
    leadId,
    liveTransfer: !!live_transfer,
  });

  return res.status(201).json(newClient);
  // } catch (error) {
  //   logger.error('Unexpected error creating client in endpoints/clients.js', {
  //     route: '/client',
  //     method: 'POST',
  //     requesterId: req.agent?.id,
  //     error,
  //   });
  //   return res.status(500).json({ error: 'Internal server error' });
  // }
});

clientRouter.patch('/', async (req, res) => {
  const { clientId, client } = req.body;

  if (!clientId || !client) {
    logger.warn('Missing client update payload in endpoints/clients.js', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
    });
    return res
      .status(400)
      .json({ error: 'Missing clientId or client payload' });
  }

  try {
    logger.log('Updating client', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
      fieldsToUpdate: Object.keys(client || {}),
    });

    const { data, error } = await req.supabase
      .from('clients')
      .update(client)
      .eq('id', clientId)
      .select('*');

    if (error) {
      logger.error('Error updating client in endpoints/clients.js', {
        route: '/clients',
        method: 'PATCH',
        requesterId: req.agent?.id,
        targetClientId: clientId,
        error,
      });
      return res.status(500).json({ error: 'Failed to update client' });
    }

    if (!data || data.length === 0) {
      logger.warn('Client not found for update in endpoints/clients.js', {
        route: '/clients',
        method: 'PATCH',
        requesterId: req.agent?.id,
        targetClientId: clientId,
      });
      return res.status(404).json({ error: 'Client not found' });
    }

    logger.log('Updated client successfully', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
    });

    return res.status(200).json(data[0]);
  } catch (error) {
    logger.error('Unexpected error updating client in endpoints/clients.js', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

clientRouter.delete('/', async (req, res) => {
  const { clientId } = req.body;

  if (!clientId) {
    logger.warn('Missing clientId in endpoints/clients.js', {
      route: '/clients',
      method: 'DELETE',
      requesterId: req.agent?.id,
    });
    return res.status(400).json({ error: 'Missing clientId' });
  }

  try {
    logger.log('Deleting client', {
      route: '/clients',
      method: 'DELETE',
      requesterId: req.agent?.id,
      targetClientId: clientId,
    });

    const { data, error } = await supabaseService
      .from('clients')
      .delete()
      .eq('id', clientId)
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('Error deleting client in endpoints/clients.js', {
        route: '/clients',
        method: 'DELETE',
        requesterId: req.agent?.id,
        targetClientId: clientId,
        error,
      });
      return res.status(500).json({ error: 'Failed to delete client' });
    }

    if (!data) {
      logger.warn('Client not found for delete in endpoints/clients.js', {
        route: '/clients',
        method: 'DELETE',
        requesterId: req.agent?.id,
        targetClientId: clientId,
      });
      return res.status(404).json({ error: 'Client not found' });
    }

    logger.log('Deleted client successfully', {
      route: '/clients',
      method: 'DELETE',
      requesterId: req.agent?.id,
      targetClientId: clientId,
    });

    return res.status(200).json({ message: 'Client deleted successfully' });
  } catch (error) {
    logger.error('Unexpected error deleting client in endpoints/clients.js', {
      route: '/',
      method: 'DELETE',
      requesterId: req.agent?.id,
      targetClientId: clientId,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = clientRouter;
