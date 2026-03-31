const axios = require('axios');

const { getHyrosSource } = require('./hyros');
const { supabaseService } = require('../services/supabase');
const logger = require('firebase-functions/logger');

const gsqClient = axios.create({
  baseURL: process.env.GSQ_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
  },
});

const inboundGSQ = async (req, res) => {
  try {
    const auth = req.headers['authorization']?.split(' ')[1];

    if (auth !== process.env.GSQ_TOKEN) {
      logger.warn('Unauthorized access attempt', { auth });
      return res.status(401).send({ message: 'Unauthorized' });
    }

    logger.info('Received GSQ lead:', req.body);

    const {
      firstName,
      lastName,
      email,
      phone,
      state,
      dob,
      gsqId,
      issuedTo,
      sold,
    } = req.body;

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

    const hyrosSource = await getHyrosSource(email);
    const { data: leadVendor } = await supabaseService
      .from('lead_vendors')
      .select('id')
      .eq('name', 'GetSeniorQuotes.com')
      .single();

    const GSQ_PLATFORM_EMAIL = 'hello@getseniorquotes.com';
    let agentId = null;

    if (issuedTo !== GSQ_PLATFORM_EMAIL) {
      const { data: agent, error: agentError } = await supabaseService
        .from('agents')
        .select('id')
        .eq('email', issuedTo)
        .single();

      if (agentError || !agent) {
        logger.error('Invalid agent email:', { issuedTo, error: agentError });
        return res.status(400).send({ message: 'Invalid agent email' });
      }

      agentId = agent.id;
    }

    const lead = { ...req.body };

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
      face_amount_max: lead.faceAmount?.includes('-')
        ? Number(lead.faceAmount.split('-')[1]) || null
        : null,
      premium: lead.premium ? parseFloat(lead.premium) : null,
      selected_plan: lead.selectedPlan ?? null,
      selected_carrier: lead.selectedCarrier ?? null,
      beneficiary: lead.beneficiary ?? null,
      priority: lead.priority ?? null,
      why: lead.why ?? null,
      cholesterol_medication: lead.cholesterolMedication ?? false,
      blood_pressure_medication: lead.bloodPressureMedication ?? false,
      verified: lead.verified ?? false,
      height_feet: lead.heightFeet ? parseInt(lead.heightFeet) : null,
      height_inches: lead.heightInches ? parseInt(lead.heightInches) : null,
      weight_lbs: lead.weight ? parseInt(lead.weight) : null,
      agent_id: agentId,
      gsq_source: hyrosSource,
      gsq_id: lead.gsqId,
      lead_vendor_id: leadVendor.id,
    };

    const { error } = await supabaseService.from('leads').insert(payload);

    if (error) {
      if (error.code === '23505') {
        logger.info('Lead already exists:', error);

        const { data: existingLead, error: leadError } = await supabaseService
          .from('leads')
          .select('id, created_at, agent_id')
          .eq('email', payload.email)
          .single();

        if (existingLead?.agent_id === agentId) {
          return res.status(200).send({
            message: 'Lead already exists and is assigned to this agent',
          });
        }

        if (leadError || !existingLead) {
          logger.error('Failed to fetch existing lead:', { error: leadError });
          return res
            .status(500)
            .send({ message: 'Failed to fetch existing lead' });
        }

        const { error: updateError } = await supabaseService
          .from('leads')
          .update({ agent_id: agentId })
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
      } else {
        logger.error('Error inserting lead:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });
        return res.status(400).send({ message: 'Invalid request payload' });
      }
    }

    res.status(201).send({ message: 'Lead created successfully' });
  } catch (error) {
    logger.error('Error saving lead:', { error });
    res.status(500).send({ message: 'Error saving lead:' });
  }
};

const sendSaleToGSQ = async (phone, email) => {
  try {
    const BODY = {
      url: `/sold`,
      method: 'POST',
      data: {
        phone: phone,
        email: email,
      },
    };
    const response = await gsqClient.request(BODY);
    logger.info('GSQ response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending mark lead sold:', error);
    throw error;
  }
};

module.exports = { inboundGSQ, sendSaleToGSQ };
