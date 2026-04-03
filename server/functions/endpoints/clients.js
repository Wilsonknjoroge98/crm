const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const { sendSaleToGSQ } = require('../integrations/GSQ');
const { getHyrosSource } = require('../integrations/hyros');

// eslint-disable-next-line new-cap
const clientRouter = express.Router();

const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';

clientRouter.get('/all', async (req, res) => {
  try {
    logger.log('Getting clients for current agent', {
      route: '/clients',
      method: 'GET',
      requesterId: req?.agent?.id,
    });

    const { data: clients, error } = await supabaseService
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
                ),
                policies!policies_client_id_fkey (
                    id,
                    policy_number,
                    carriers ( name )
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
      ({ agent_clients, leads, policies, ...client }) => {
        const ac = agent_clients?.[0];
        const a = ac?.agents;
        const agent_name = a
          ? `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || null
          : null;
        const notes = ac?.agent_notes ?? null;
        const gsq_source = leads?.gsq_source ?? null;
        const policyData = (policies || []).map((p) => ({
          id: p.id,
          carrier: p.carriers?.name || null,
          policyNumber: p.policy_number,
        }));
        return { ...client, agent_name, notes, gsq_source, policyData };
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

clientRouter.get('/', async (req, res) => {
  try {
    const isSuperuser = req.agent.id === SUPERUSER_ID;

    logger.log('Getting clients for current agent only', {
      route: '/clients',
      method: 'GET',
      requesterId: req?.agent?.id,
      isSuperuser,
    });

    if (isSuperuser) {
      const { data: clients, error } = await supabaseService
        .from('clients')
        .select(
          `
                *,
                agent_clients!agent_clients_client_id_fkey (
                    agent_notes,
                    agents!agent_clients_agent_id_fkey ( first_name, last_name )
                ),
                leads!clients_lead_id_fkey ( gsq_source ),
                policies!policies_client_id_fkey ( id, policy_number, carriers ( name ) )
            `,
        )
        .order('created_at', { ascending: false })
        .limit(10000);

      logger.log('Fetched clients for superuser successfully', {
        route: '/clients',
        method: 'GET',
        requesterId: req.agent.id,
        count: clients?.length || 0,
      });

      if (error) {
        logger.error(
          'Error fetching all clients (superuser) in endpoints/clients.js',
          {
            route: '/clients',
            method: 'GET',
            requesterId: req.agent.id,
            error,
          },
        );
        return res.status(500).json({ error: 'Failed to fetch clients' });
      }

      const mapped = (clients || []).map(
        ({ agent_clients: agentClients, leads, policies, ...client }) => {
          const ac = agentClients?.[0];
          const a = ac?.agents;
          const agentname = a
            ? `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() || null
            : null;
          const gsqSource = Array.isArray(leads)
            ? (leads[0]?.gsq_source ?? null)
            : (leads?.gsq_source ?? null);
          const policyData = (policies || []).map((p) => ({
            id: p.id,
            carrier: p.carriers?.name || null,
            policyNumber: p.policy_number,
          }));
          return {
            ...client,
            agent_name: agentname,
            notes: ac?.agent_notes ?? null,
            gsq_source: gsqSource ?? null,
            policyData,
          };
        },
      );

      return res.status(200).json(mapped);
    }

    const { data: agentLinks, error: linksError } = await supabaseService
      .from('agent_clients')
      .select('client_id, agent_notes')
      .eq('agent_id', req.agent.id);

    if (linksError) {
      logger.error('Error fetching agent_clients in endpoints/clients.js', {
        route: '/clients',
        method: 'GET',
        requesterId: req.agent.id,
        error: linksError,
      });
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    if (!agentLinks?.length) {
      return res.status(200).json([]);
    }

    const { data: agentData, error: agentError } = await supabaseService
      .from('agents')
      .select('first_name, last_name')
      .eq('id', req.agent.id)
      .maybeSingle();

    const clientIds = agentLinks.map((l) => l.client_id);
    const notesByClientId = Object.fromEntries(
      agentLinks.map((l) => [l.client_id, l.agent_notes ?? null]),
    );

    const { data: clients, error } = await supabaseService
      .from('clients')
      .select(
        `
                *,
                leads!clients_lead_id_fkey (
                    gsq_source
                ),
                policies!policies_client_id_fkey (
                    id,
                    policy_number,
                    carriers ( name )
                )
            `,
      )
      .in('id', clientIds)
      .order('created_at', { ascending: false })
      .limit(10000);

    if (error) {
      logger.error('Error fetching own clients in endpoints/clients.js', {
        route: '/clients/mine',
        method: 'GET',
        requesterId: req.agent.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    const mapped = (clients || []).map(({ leads, policies, ...client }) => {
      const gsqSource = Array.isArray(leads)
        ? (leads[0]?.gsq_source ?? null)
        : (leads?.gsq_source ?? null);
      const policyData = (policies || []).map((p) => ({
        id: p.id,
        carrier: p.carriers?.name || null,
        policyNumber: p.policy_number,
      }));
      return {
        ...client,
        agent_name: agentData
          ? `${agentData.first_name ?? ''} ${agentData.last_name ?? ''}`.trim() ||
            null
          : null,
        notes: notesByClientId[client.id] ?? null,
        gsq_source: gsqSource,
        policyData,
      };
    });

    logger.log('Fetched own clients successfully', {
      route: '/clients/mine',
      method: 'GET',
      requesterId: req.agent?.id,
      count: mapped.length,
    });

    return res.status(200).json(mapped);
  } catch (error) {
    logger.error(
      'Unexpected error fetching own clients in endpoints/clients.js',
      {
        route: '/clients/mine',
        method: 'GET',
        requesterId: req.agent?.id,
        message: error?.message,
        stack: error?.stack,
      },
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
});

clientRouter.post('/', async (req, res) => {
  // eslint-disable-next-line camelcase,no-unused-vars
  const {
    lead_vendor_id: leadVendorId,
    notes,
    live_transfer: liveTransfer,
    ...client
  } = req.body.client;
  delete client.live_transfer;

  console.log('Received client creation request', {
    route: '/client',
    method: 'POST',
    lead_vendor_id: leadVendorId,
    notes,
    live_transfer: liveTransfer,
    client,
  });

  await sendSaleToGSQ(client.phone, client.email);

  if (!client?.email || !client?.phone) {
    logger.warn('Missing required client fields in clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: req.agent?.id,
      hasEmail: !!client?.email,
      hasPhone: !!client?.phone,
      liveTransfer: !!liveTransfer,
    });
    return res.status(400).json({ error: 'Missing required client fields' });
  }

  let leadId = null;

  const { data: existingLead, error: existingLeadError } = await supabaseService
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
    let hyrosSource = null;
    if (leadVendorId === '1043bc55-a8cd-485f-bddc-46bcfc06d4ba') {
      hyrosSource = await getHyrosSource(client.email);
    }

    const { data: newLead, error: newLeadError } = await supabaseService
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
        lead_vendor_id: leadVendorId,
        gsq_live_transfer: liveTransfer || false,
        gsq_source: hyrosSource,
      })
      .select('id')
      .maybeSingle();

    if (newLeadError) {
      logger.error('Error creating new lead in clients.js', {
        route: '/client',
        method: 'POST',
        requesterId: req.agent?.id,
        email: client.email,
        error: newLeadError,
      });
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    leadId = newLead?.id || null;
  } else {
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

  const { error: agentClientError } = await supabaseService
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
    liveTransfer: !!liveTransfer,
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
    income,
    policyData,
    ...clientFields
  } = client;

  try {
    logger.log('Updating client', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
      client: client,
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

    // Fetch policy IDs for this client so we can cascade through beneficiaries
    const { data: clientPolicies, error: fetchPoliciesError } =
      await supabaseService
        .from('policies')
        .select('id')
        .eq('client_id', clientId);

    if (fetchPoliciesError) {
      logger.error('Error fetching policies for client delete in clients.js', {
        route: '/clients',
        method: 'DELETE',
        requesterId: req.agent?.id,
        targetClientId: clientId,
        error: fetchPoliciesError,
      });
      return res
        .status(500)
        .json({ error: 'Failed to fetch associated policies' });
    }

    const policyIds = (clientPolicies || []).map((p) => p.id);

    // Delete beneficiaries first (they reference policies via FK)
    if (policyIds.length > 0) {
      const { error: beneficiariesError } = await supabaseService
        .from('beneficiaries')
        .delete()
        .in('policy_id', policyIds);

      if (beneficiariesError) {
        logger.error('Error deleting beneficiaries in clients.js', {
          route: '/clients',
          method: 'DELETE',
          requesterId: req.agent?.id,
          targetClientId: clientId,
          error: beneficiariesError,
        });
        return res
          .status(500)
          .json({ error: 'Failed to delete associated beneficiaries' });
      }
    }

    // Now safe to delete policies
    const { error: policiesError } = await supabaseService
      .from('policies')
      .delete()
      .eq('client_id', clientId);

    if (policiesError) {
      logger.error('Error deleting associated policies in clients.js', {
        route: '/clients',
        method: 'DELETE',
        requesterId: req.agent?.id,
        targetClientId: clientId,
        error: policiesError,
      });
      return res
        .status(500)
        .json({ error: 'Failed to delete associated policies' });
    }

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
