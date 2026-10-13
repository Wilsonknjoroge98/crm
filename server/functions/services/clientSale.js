const logger = require('firebase-functions/logger');
const { Firestore } = require('firebase-admin/firestore');
const { supabaseService } = require('./supabase');
const { markSoldInGSQ, isGSQLiveTransfer } = require('../integrations/GSQ');
const { getHyrosSource } = require('../integrations/hyros');
const { sendPurchaseToMeta } = require('../integrations/pixel');

// The mark-sold flow behind POST /client, shared with sales reported by
// outside CRMs. Resolves to the HTTP status and body the caller should send.
const createClientSale = async ({
  agent,
  // eslint-disable-next-line camelcase
  client: { lead_vendor_id: leadVendorId, ...client },
}) => {
  // derived from gsq's call logs below; older clients still send the answer
  delete client.live_transfer;

  console.log('Received client creation request', {
    route: '/client',
    method: 'POST',
    lead_vendor_id: leadVendorId,
    client,
  });

  // phone is the only identity the pipeline needs (lead lookup + gsq sold
  // flag both key on it); email is nullable in the db and instant form
  // leads may arrive without one
  if (!client?.phone) {
    logger.warn('Missing required client fields in clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: agent?.id,
      hasEmail: !!client?.email,
      hasPhone: !!client?.phone,
    });
    return { status: 400, body: { error: 'Missing required client fields' } };
  }
  client.email = client.email || null;

  let leadId = null;

  // Only a lead issued to the requesting agent can be linked. A phone match
  // on another agent's lead is left alone so one agent's sale never claims,
  // or hides, a lead that belongs to someone else.
  const { data: existingLeads, error: existingLeadError } =
    await supabaseService
      .from('leads')
      .select('id, gsq_source')
      .eq('phone', client.phone)
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(1);

  if (existingLeadError) {
    logger.error('Error checking for existing lead in clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: agent?.id,
      email: client.email,
      error: existingLeadError,
    });
    return { status: 500, body: { error: 'Failed to check existing leads' } };
  }

  // Refund state isn't checked here: the business card disables mark-sold
  // while a refund is requested or approved, so a lead in that state never
  // reaches this endpoint.
  const existingLead = existingLeads?.[0] || null;

  await markSoldInGSQ(client.phone, client.email);

  let liveTransfer = false;

  if (!existingLead) {
    let hyrosSource = null;
    if (leadVendorId === '1043bc55-a8cd-485f-bddc-46bcfc06d4ba') {
      hyrosSource = await getHyrosSource(client.phone);
      // a failed lookup shouldn't block the sale; the lead just lands as a
      // non live transfer
      liveTransfer = await isGSQLiveTransfer(client.phone, agent?.email).catch(
        (error) => {
          logger.error('Error checking GSQ live transfer in clients.js', {
            route: '/client',
            method: 'POST',
            requesterId: agent?.id,
            message: error?.message,
          });
          return false;
        },
      );
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
        agent_id: agent?.id,
        sold: true,
        lead_vendor_id: leadVendorId,
        gsq_live_transfer: liveTransfer,
        gsq_source: hyrosSource,
        health_class: client.health_class ?? null,
      })
      .select('id')
      .maybeSingle();

    if (newLeadError) {
      logger.error('Error creating new lead in clients.js', {
        route: '/client',
        method: 'POST',
        requesterId: agent?.id,
        email: client.email,
        error: newLeadError,
      });
      return { status: 500, body: { error: 'Failed to create lead' } };
    }

    leadId = newLead?.id || null;
  } else {
    leadId = existingLead?.id || null;

    if (
      leadId &&
      leadVendorId === '1043bc55-a8cd-485f-bddc-46bcfc06d4ba' &&
      !existingLead.gsq_source
    ) {
      const hyrosSource = await getHyrosSource(client.phone);
      if (hyrosSource) {
        await supabaseService
          .from('leads')
          .update({ gsq_source: hyrosSource })
          .eq('id', leadId);
      }
    }
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
      requesterId: agent?.id,
      email: client.email,
      leadId,
      error: newClientError,
    });
    return { status: 500, body: { error: 'Failed to create client' } };
  }

  if (!newClient?.id) {
    logger.error('Supabase insert did not return an id clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: agent?.id,
      email: client.email,
      leadId,
    });
    return { status: 500, body: { error: 'Failed to create client' } };
  }

  const { error: agentClientError } = await supabaseService
    .from('agent_clients')
    .insert({
      agent_id: agent.id,
      client_id: newClient.id,
    });

  if (agentClientError) {
    logger.error('Error creating agent_clients record in clients.js', {
      route: '/client',
      method: 'POST',
      requesterId: agent?.id,
      clientId: newClient.id,
      leadId,
      error: agentClientError,
    });
    return { status: 500, body: { error: 'Failed to link client to agent' } };
  }

  logger.log('Created client successfully', {
    route: '/client',
    method: 'POST',
    requesterId: agent?.id,
    clientId: newClient.id,
    leadId,
    liveTransfer,
  });

  try {
    const ap = Number(newClient.monthly_premium) * 12;

    if (ap > 0 && newClient.phone) {
      const gsqDb = new Firestore({
        projectId: process.env.GSQ_PROJECT_ID,
        credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
      });

      const gsqSnapshot = await gsqDb
        .collection('leads')
        .where('phone', '==', newClient.phone)
        .limit(1)
        .get();

      if (!gsqSnapshot.empty) {
        await sendPurchaseToMeta(ap, gsqSnapshot.docs[0].data(), newClient);
      }
    }
  } catch (error) {
    logger.error(
      'Error sending purchase event to Meta in endpoints/clients.js',
      {
        error,
      },
    );
  }

  return { status: 201, body: newClient };
};

module.exports = { createClientSale };
