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
                    agent_notes,
                    agents!agent_clients_agent_id_fkey (
                        id,
                        first_name,
                        last_name
                    )
                ),
                leads!clients_lead_id_fkey (
                    gsq_source
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

    const mapped = (clients || []).map(
      ({ agent_clients, leads, ...client }) => {
        const ac = agent_clients?.[0];
        const a = ac?.agents;
        const agent_name = a
          ? `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || null
          : null;
        const notes = ac?.agent_notes ?? null;
        const gsq_source = leads?.gsq_source ?? null;
        return { ...client, agent_name, notes, gsq_source };
      },
    );

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
  delete client.live_transfer;

  console.log('Received client creation request', {
    route: '/client',
    method: 'POST',
    lead_vendor_id,
    notes,
    live_transfer,
    client,
  });

  if (!client?.email || !client?.phone) {
    logger.warn('Missing required client fields in clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      hasEmail: !!client?.email,
      hasPhone: !!client?.phone,
      liveTransfer: !!live_transfer,
    });
    return res.status(400).json({ error: 'Missing required client fields' });
  }

  let leadId = null;

  console.log('GSQ Lead Vendor ID:', process.env.GSQ_LEAD_VENDOR_ID);

  if (lead_vendor_id === process.env.GSQ_LEAD_VENDOR_ID) {
    const { data: existingLead, error: existingLeadError } =
      await supabaseService
        .from('leads')
        .select('id')
        .eq('phone', client.phone)
        .maybeSingle();

    if (existingLeadError) {
      logger.error('Error checking for existing lead in clients.js', {
        route: '/client',
        method: 'POST',
        requesterId: req.agent?.id,
        email: client.email,
        error: existingLeadError,
      });
      return res.status(500).json({ error: 'Failed to check existing leads' });
    }

    if (!existingLead) {
      const { error: newLeadError } = await supabaseService
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

      if (newLeadError) {
        logger.error('Error creating lead in clients.js', {
          route: '/client',
          method: 'POST',
          requesterId: req.agent?.id,
          email: client.email,
          error: newLeadError,
        });
      }

      leadId = newLeadError?.id || null;

      return res.status(500).json({ error: 'Failed to create lead' });
    }
    leadId = existingLead?.id || null;
  }

  const { data: newClient, error: newClientError } = await supabaseService
    .from('clients')
    .insert({
      ...client,
      lead_id: leadId,
    })
    .select('*')
    .maybeSingle();

  if (newClientError) {
    logger.error('Error creating client in clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      email: client.email,
      leadId,
      error: newClientError,
    });
    return res.status(500).json({ error: 'Failed to create client' });
  }

  if (!newClient?.id) {
    logger.error('Supabase insert did not return an id clients.js', {
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
    logger.error('Error creating agent_clients record in clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      clientId: newClient.id,
      leadId,
      error: agentClientError,
    });
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
});

clientRouter.patch('/', async (req, res) => {
  const { clientId, client } = req.body;

  if (!clientId || !client) {
    logger.warn('Missing client update payload in clients.js', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
    });
    return res
      .status(400)
      .json({ error: 'Missing clientId or client payload' });
  }

  const {
    notes,
    agent_name,
    gsq_source,
    createdAtMs,
    fullName,
    ...clientFields
  } = client;

  try {
    logger.log('Updating client', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
      fieldsToUpdate: Object.keys(clientFields),
      hasNotes: notes !== undefined,
    });

    const { data: updatedClient, error } = await supabaseService
      .from('clients')
      .update(clientFields)
      .eq('id', clientId)
      .select('*');

    if (error) {
      logger.error('Error updating client in clients.js', {
        route: '/clients',
        method: 'PATCH',
        requesterId: req.agent?.id,
        targetClientId: clientId,
        error,
      });
      return res.status(500).json({ error: 'Failed to update client' });
    }

    if (!updatedClient || updatedClient.length === 0) {
      logger.warn('Client not found for update in clients.js', {
        route: '/clients',
        method: 'PATCH',
        requesterId: req.agent?.id,
        targetClientId: clientId,
      });
      return res.status(404).json({ error: 'Client not found' });
    }

    if (notes !== undefined) {
      const { error: notesError } = await supabaseService
        .from('agent_clients')
        .update({ agent_notes: notes })
        .eq('client_id', clientId)
        .eq('agent_id', req.agent.id);

      if (notesError) {
        logger.error('Error updating agent_notes in clients.js', {
          route: '/clients',
          method: 'PATCH',
          requesterId: req.agent?.id,
          targetClientId: clientId,
          error: notesError,
        });
        return res.status(500).json({ error: 'Failed to update notes' });
      }
    }

    logger.log('Updated client successfully', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
    });

    return res.status(200).json({ ...updatedClient[0], notes: notes ?? null });
  } catch (error) {
    logger.error('Unexpected error updating client in clients.js', {
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
    logger.warn('Missing clientId in clients.js', {
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
      logger.error('Error deleting client in clients.js', {
        route: '/clients',
        method: 'DELETE',
        requesterId: req.agent?.id,
        targetClientId: clientId,
        error,
      });
      return res.status(500).json({ error: 'Failed to delete client' });
    }

    if (!data) {
      logger.warn('Client not found for delete in clients.js', {
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
    logger.error('Unexpected error deleting client in clients.js', {
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
