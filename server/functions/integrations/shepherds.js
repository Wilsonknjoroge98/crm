const { timingSafeEqual } = require('crypto');
const { Firestore } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');
const { createClientSale } = require('../services/clientSale');

// Shepherds Financial is a separate agency whose CRM reports sales on leads
// gsq sold to their agents. Deployed as its own function (shepherdsSale) and
// authenticated with a shared SHEPHERDS_TOKEN rather than a crm session.

const normalizeEmail = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const bearerMatches = (header, expected) => {
  const provided = String(header ?? '').replace(/^Bearer /, '');
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// redistributedTo may hold one email or a list of them
const isAssignedTo = (data, email) =>
  [data.issuedTo, ...[].concat(data.redistributedTo ?? [])].some(
    (assignee) => normalizeEmail(assignee) === email,
  );

// A sale closed in Shepherds Financial's CRM on a lead gsq sold to one of
// their agents. It only counts when gsq actually issued (or redistributed)
// that phone to that agent; then it runs the same mark-sold flow as POST
// /client, which flips the gsq docs sold and records the premium.
const inboundShepherdsSale = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Method not allowed' });
  }

  if (!bearerMatches(req.headers.authorization, process.env.SHEPHERDS_TOKEN)) {
    logger.warn('Unauthorized Shepherds sale attempt');
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const phone = String(req.body?.client_phone ?? '').replace(/\D/g, '');
  const agentEmail = normalizeEmail(req.body?.agent_email);
  const monthlyPremium = Number(req.body?.monthly_premium);

  if (
    phone.length !== 10 ||
    !agentEmail ||
    !Number.isFinite(monthlyPremium) ||
    monthlyPremium <= 0
  ) {
    return res.status(400).send({
      message:
        'Expected { client_phone: 10 digits, agent_email: email, monthly_premium: number > 0 }',
    });
  }

  logger.log('Shepherds sale received', { phone, agentEmail, monthlyPremium });

  try {
    const db = new Firestore({
      projectId: process.env.GSQ_PROJECT_ID,
      credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
    });

    const snapshots = await Promise.all(
      ['leads', 'instant_form_leads'].map((name) =>
        db.collection(name).where('phone', '==', phone).get(),
      ),
    );
    const gsqLead = snapshots
      .flatMap((snapshot) => snapshot.docs)
      .find((doc) => isAssignedTo(doc.data(), agentEmail));

    if (!gsqLead) {
      logger.warn('Shepherds sale has no matching gsq lead', {
        phone,
        agentEmail,
      });
      return res.status(404).send({
        message: 'No gsq lead with this phone was issued to this agent',
      });
    }

    const { data: agent, error: agentError } = await supabaseService
      .from('agents')
      .select('*')
      .eq('email', agentEmail)
      .maybeSingle();

    if (agentError) throw agentError;
    if (!agent) {
      return res.status(404).send({ message: 'Agent not found in crm' });
    }
    if (agent.active === false) {
      return res.status(403).send({ message: 'Agent is deactivated' });
    }

    const { data: leads, error: leadError } = await supabaseService
      .from('leads')
      .select(
        'id, first_name, last_name, email, phone, state, date_of_birth, lead_vendor_id',
      )
      .eq('agent_id', agent.id)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1);

    if (leadError) throw leadError;
    const lead = leads?.[0] ?? null;

    // The sale has to land on a lead we delivered to this agent; it never
    // creates one.
    if (!lead) {
      logger.warn('Shepherds sale has no matching crm lead', {
        phone,
        agentEmail,
      });
      return res.status(404).send({
        message: 'No crm lead with this phone belongs to this agent',
      });
    }

    // a retried webhook must not book the sale twice
    const { data: existingClients, error: existingError } =
      await supabaseService
        .from('clients')
        .select('id')
        .eq('lead_id', lead.id)
        .limit(1);

    if (existingError) throw existingError;
    if (existingClients?.length) {
      logger.log('Shepherds sale already recorded', {
        leadId: lead.id,
        clientId: existingClients[0].id,
      });
      return res.status(200).send({
        message: 'Sale already recorded',
        clientId: existingClients[0].id,
      });
    }

    // the lead lookup above guarantees createClientSale links this lead
    // rather than inserting a new one
    const { status, body } = await createClientSale({
      agent,
      client: {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        state: lead.state,
        date_of_birth: lead.date_of_birth,
        monthly_premium: monthlyPremium,
        lead_vendor_id: lead.lead_vendor_id,
      },
    });

    logger.log('Shepherds sale processed', {
      phone,
      agentEmail,
      gsqLeadId: gsqLead.id,
      status,
    });

    return res.status(status).send(body);
  } catch (error) {
    logger.error('Error processing Shepherds sale', {
      phone,
      agentEmail,
      message: error?.message,
    });
    return res.status(500).send({ message: 'Internal server error' });
  }
};

module.exports = { inboundShepherdsSale };
