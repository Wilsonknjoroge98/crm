const express = require('express');
const logger = require('firebase-functions/logger');

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
                    client_id
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

    logger.log('Fetched clients successfully', {
      route: '/clients',
      method: 'GET',
      requesterId: req.agent?.id,
      count: clients?.length || 0,
    });

    return res.status(200).json(clients);
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

clientRouter.post('/client', async (req, res) => {
  const { notes, liveTransfer, ...client } = req.body;

  if (!client?.email || !client?.phone) {
    logger.warn('Missing required client fields in endpoints/clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      hasEmail: !!client?.email,
      hasPhone: !!client?.phone,
      liveTransfer: !!liveTransfer,
    });
    return res.status(400).json({ error: 'Missing required client fields' });
  }

  try {
    logger.log('Creating client', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      email: client.email,
      liveTransfer: !!liveTransfer,
      hasNotes: !!notes,
    });

    let leadId;

    if (!liveTransfer) {
      logger.log('Creating lead for new client', {
        route: '/client',
        method: 'POST',
        requesterId: req.agent?.id,
        email: client.email,
        leadVendorId: client.lead_vendor_id,
      });

      const { data, error: leadError } = await req.supabase
        .from('leads')
        .insert({
          email: client.email,
          phone: client.phone,
          agent_id: req.user.id,
          sold: false,
          lead_vendor_id: client.lead_vendor_id,
        })
        .select('id');

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

      leadId = data?.[0]?.id;

      if (!leadId) {
        logger.error('Lead created without id in endpoints/clients.js', {
          route: '/client',
          method: 'POST',
          requesterId: req.agent?.id,
          email: client.email,
        });
        return res.status(500).json({ error: 'Failed to create lead' });
      }
    } else {
      logger.log('Fetching existing live transfer lead', {
        route: '/client',
        method: 'POST',
        requesterId: req.agent?.id,
        email: client.email,
      });

      const { data, error: leadError } = await req.supabase
        .from('leads')
        .select('id')
        .eq('email', client.email)
        .single();

      if (leadError) {
        logger.error(
          'Error fetching live transfer lead in endpoints/clients.js',
          {
            route: '/client',
            method: 'POST',
            requesterId: req.agent?.id,
            email: client.email,
            error: leadError,
          },
        );
        return res.status(500).json({ error: 'Failed to fetch lead' });
      }

      leadId = data?.id;

      if (!leadId) {
        logger.error('Live transfer lead missing id in endpoints/clients.js', {
          route: '/client',
          method: 'POST',
          requesterId: req.agent?.id,
          email: client.email,
        });
        return res.status(500).json({ error: 'Failed to fetch lead' });
      }
    }

    const { data: clientData, error: clientError } = await req.supabase
      .from('clients')
      .insert({
        ...client,
        lead_id: leadId,
      })
      .select('*');

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

    const createdClient = clientData?.[0];

    if (!createdClient?.id) {
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
        client_id: createdClient.id,
        notes,
      });

    if (agentClientError) {
      logger.error(
        'Error creating agent_clients record in endpoints/clients.js',
        {
          route: '/client',
          method: 'POST',
          requesterId: req.agent?.id,
          clientId: createdClient.id,
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
      clientId: createdClient.id,
      leadId,
      liveTransfer: !!liveTransfer,
    });

    return res.status(201).json(createdClient);
  } catch (error) {
    logger.error('Unexpected error creating client in endpoints/clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

clientRouter.patch('/client', async (req, res) => {
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

clientRouter.delete('/client', async (req, res) => {
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

    const { data, error } = await req.supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .select('id');

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

    if (!data || data.length === 0) {
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
      route: '/clients',
      method: 'DELETE',
      requesterId: req.agent?.id,
      targetClientId: clientId,
      error,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = clientRouter;
