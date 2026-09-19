const { Firestore } = require('firebase-admin/firestore');
const { getHyrosSource } = require('./hyros');
const { supabaseService } = require('../services/supabase');
const logger = require('firebase-functions/logger');
const { parsePremium } = require('./premium');

// GSQ sends this literal email for leads issued to the platform itself
// rather than a specific agent; ingestion and refunds both need to treat it
// as the house account below.
const GSQ_PLATFORM_EMAIL = 'hello@getseniorquotes.com';
const SUPER_ADMIN_EMAIL = 'info@fexdigital.com';

const inboundGSQ = async (req, res) => {
  try {
    const auth = req.headers['authorization']?.split(' ')[1];

    if (auth !== process.env.GSQ_TOKEN) {
      logger.warn('Unauthorized access attempt', { auth });
      return res.status(401).send({ message: 'Unauthorized' });
    }

    logger.info('Received GSQ lead:', req.body);

    const { firstName, lastName, phone, state, email, dob, gsqId, sold } =
      req.body;

    let issuedTo = req.body.issuedTo;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !gsqId ||
      !dob ||
      !issuedTo ||
      !state ||
      sold === undefined
    ) {
      return res.status(400).send({ message: 'Missing required fields' });
    }

    const hyrosSource = await getHyrosSource(phone);
    const { data: leadVendor } = await supabaseService
      .from('lead_vendors')
      .select('id')
      .eq('name', 'GetSeniorQuotes.com')
      .single();

    // If the lead is issued to the GSQ platform email, override the email to match company
    if (issuedTo === GSQ_PLATFORM_EMAIL) {
      issuedTo = SUPER_ADMIN_EMAIL;
    }

    let agentId = null;

    const { data: agent, error: agentError } = await supabaseService
      .from('agents')
      .select('id')
      .eq('email', issuedTo)
      .single();

    logger.info('Agent lookup result', { issuedTo, agent, agentError });

    if (agentError || !agent) {
      logger.error('Invalid agent email:', { issuedTo, error: agentError });
      return res.status(422).send({ message: 'Invalid agent email' });
    }

    agentId = agent.id;

    const lead = { ...req.body };
    const premiumParsed = parsePremium(lead.premium);

    const payload = {
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      state,
      sold: false,
      date_of_birth: dob,
      smoker: lead.smoker ?? false,
      face_amount: lead.faceAmount
        ? Number(lead.faceAmount.split('-')[0]) || null
        : null,
      premium_min: premiumParsed.min,
      premium_max: premiumParsed.max,
      premium: premiumParsed.raw,
      selected_plan: lead.selectedPlan ?? null,
      selected_carrier: lead.selectedCarrier ?? null,
      beneficiary: lead.beneficiary ?? null,
      priority: null,
      availability: lead.availability ?? null,
      why: lead.why ?? null,
      // The funnel now asks one health-tier question (health_class) instead
      // of these two flags. GSQ no longer sends cholesterolMedication or
      // bloodPressureMedication, so default to null (unknown) rather than
      // false (confirmed no) to avoid recording a false negative.
      cholesterol_medication: lead.cholesterolMedication ?? null,
      blood_pressure_medication: lead.bloodPressureMedication ?? null,
      health_class: lead.healthClass ?? null,
      verified: lead.verified ?? false,
      height_feet: lead.heightFeet ? parseInt(lead.heightFeet) : null,
      height_inches: lead.heightInches ? parseInt(lead.heightInches) : null,
      weight_lbs: lead.weight ? parseInt(lead.weight) : null,
      agent_id: agentId,
      gsq_source: hyrosSource,
      gsq_id: lead.gsqId,
      lead_vendor_id: leadVendor.id,
    };

    const { data: existingLeads, error: existingLeadError } =
      await supabaseService
        .from('leads')
        .select('id, agent_id, gsq_id')
        .eq('phone', payload.phone)
        .order('created_at', { ascending: false })
        .limit(1);

    if (existingLeadError) {
      logger.error('Failed to check for existing lead:', {
        error: existingLeadError,
      });
      return res
        .status(500)
        .send({ message: 'Failed to check existing leads' });
    }

    const existingLead = existingLeads?.[0] || null;

    if (existingLead) {
      // A resubmission for this phone always carries the gsq doc id of its
      // *current* lead doc (the 30-day duplicate window in gsq/lead.js means
      // a resubmission past that window is a brand-new doc with its own
      // issuedTo, not a mutation of the old one). Refresh gsq_id here too,
      // not just agent_id — otherwise it stays pinned to the very first doc
      // this phone ever produced, and refund eligibility (which dereferences
      // gsq_id to read that doc's issuedTo) ends up checking a stale,
      // superseded doc instead of the one the current agent was actually
      // issued.
      if (
        existingLead.agent_id === agentId &&
        existingLead.gsq_id === payload.gsq_id
      ) {
        return res.status(200).send({
          message: 'Lead already exists and is assigned to this agent',
        });
      }

      const { error: updateError } = await supabaseService
        .from('leads')
        .update({ agent_id: agentId, gsq_id: payload.gsq_id })
        .eq('id', existingLead.id);

      if (updateError) {
        logger.error('Failed to update existing lead:', {
          error: updateError,
        });
        return res
          .status(500)
          .send({ message: 'Failed to update existing lead' });
      }

      return res.status(200).send({ message: 'Lead updated successfully' });
    }

    const { error } = await supabaseService.from('leads').insert(payload);

    if (error) {
      logger.error('Error inserting lead:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      return res.status(400).send({ message: 'Invalid request payload' });
    }

    res.status(201).send({ message: 'Lead created successfully' });
  } catch (error) {
    logger.error('Error saving lead:', { error });
    res.status(500).send({ message: 'Error saving lead:' });
  }
};

const markSoldInGSQ = async (phone, email) => {
  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const leadPhoneSnapshot = await db
    .collection('leads')
    .where('phone', '==', phone)
    .get();

  if (!leadPhoneSnapshot.empty) {
    leadPhoneSnapshot.forEach(async (doc) => {
      await doc.ref.update({ sold: true });
    });

    return;
  }

  const leadByEmailSnapshot = await db
    .collection('leads')
    .where('email', '==', email)
    .get();

  if (!leadByEmailSnapshot.empty) {
    leadByEmailSnapshot.forEach(async (doc) => {
      await doc.ref.update({ sold: true });
    });

    return;
  }
};

module.exports = {
  inboundGSQ,
  markSoldInGSQ,
  GSQ_PLATFORM_EMAIL,
  SUPER_ADMIN_EMAIL,
};
