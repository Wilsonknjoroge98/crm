const express = require('express');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const { createClientSale } = require('../services/clientSale');

// eslint-disable-next-line new-cap
const clientRouter = express.Router();

const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';

// Editable client columns only. Deny-listing UI-only fields (as before) lets
// anything else in the update payload through, including generated columns
// like people_search_text that round-trip from a GET '*' select — Postgres
// rejects writes to those with "can only be updated to DEFAULT".
const EDITABLE_CLIENT_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'marital_status',
  'address',
  'city',
  'state',
  'zip',
  'occupation',
  'annual_income',
  // the card's Sale amount; agents correct it after close
  'monthly_premium',
];

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
        const gsq_source = leads?.gsq_source ?? null;
        const policyData = (policies || []).map((p) => ({
          id: p.id,
          carrier: p.carriers?.name || null,
          policyNumber: p.policy_number,
        }));
        return { ...client, agent_name, gsq_source, policyData };
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
            gsq_source: gsqSource ?? null,
            policyData,
          };
        },
      );

      return res.status(200).json(mapped);
    }

    const { data: agentLinks, error: linksError } = await supabaseService
      .from('agent_clients')
      .select('client_id')
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
  const { status, body } = await createClientSale({
    agent: req.agent,
    client: req.body.client,
  });
  return res.status(status).json(body);
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

  const clientFields = Object.fromEntries(
    EDITABLE_CLIENT_FIELDS.filter((key) => key in client).map((key) => [
      key,
      client[key],
    ]),
  );

  try {
    logger.log('Updating client', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
      client: client,
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

    logger.log('Updated client successfully', {
      route: '/clients',
      method: 'PATCH',
      requesterId: req.agent?.id,
      targetClientId: clientId,
    });

    return res.status(200).json(updatedClient[0]);
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
