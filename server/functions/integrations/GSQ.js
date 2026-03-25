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

const inboundLeadIntegration = async (req, res) => {
  try {
    const auth = req.headers['authorization']?.split(' ')[1];

    if (auth !== process.env.GSQ_TOKEN) {
      return res.status(401).send({ message: 'Unauthorized' });
    }

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

    const { data: agent, error: agentError } = await supabaseService
      .from('agents')
      .select('id, email')
      .eq('email', issuedTo)
      .single();

    if (agentError || !agent) {
      logger.error('Invalid agent email:', agentError);
      return res.status(400).send({ message: 'Invalid agent email' });
    }

    const lead = { ...req.body };
    delete lead.issuedTo;
    // TODO DELETE FROM sendToCRM payload
    delete lead.gsqSource;

    const payload = {
      first_name: firstName,
      last_name: lastName,
      phone,
      email,
      state,
      sold: false,
      date_of_birth: dob,
      smoker: lead.smoker ?? false,
      face_amount: lead.faceAmount ?? null,
      premium: lead.premium ?? null,
      selected_plan: lead.selectedPlan ?? null,
      selected_carrier: lead.selectedCarrier ?? null,
      beneficiary: lead.beneficiary ?? null,
      priority: lead.priority ?? null,
      why: lead.why ?? null,
      cholesterol_medication: lead.cholesterolMedication ?? false,
      blood_pressure_medication: lead.bloodPressureMedication ?? false,
      // TODO: verify these GSQ fields
      text_verified: lead.verified ?? false,
      height_feet: lead.heightFeet ?? null,
      height_inches: lead.heightInches ?? null,
      weight: lead.weight ?? null,
      agent_id: agent.id,
      gsq_source: hyrosSource,
      lead_vendor_id: leadVendor.id,
    };

    const { error } = await supabaseService.from('leads').insert(payload);
    // check for unique constraint error
    if (error) {
      if (error.code === '23505') {
        logger.info('Lead already exists:', error);

        const { data: existingLead, error: leadError } = await supabaseService
          .from('leads')
          .select('id, created_at, agent_id')
          .eq('email', payload.email)
          .single();

        if (existingLead?.agent_id === agent.id) {
          return res.status(200).send({
            message: 'Lead already exists and is assigned to this agent',
          });
        }

        if (leadError || !existingLead) {
          return res
            .status(500)
            .send({ message: 'Failed to fetch existing lead' });
        }

        const { error: updateError } = await supabaseService
          .from('leads')
          .update({ agent_id: agent.id })
          .eq('id', existingLead.id);

        if (updateError) {
          logger.error('Failed to update existing lead:', updateError);
          return res
            .status(500)
            .send({ message: 'Failed to update existing lead' });
        }

        return res.status(200).send({ message: 'Lead updated successfully' });
      } else {
        return res.status(400).send({ message: 'Invalid request payload' });
      }
    }

    res.status(201).send({ message: 'Lead created successfully' });
  } catch (error) {
    logger.error('Error saving lead:', error);
    res.status(500).send({ message: 'Error saving lead:' });
  }
};

const sendToGSQ = async (client) => {
  try {
    const BODY = {
      url: `/sold`,
      method: 'POST',
      data: {
        email: client.email,
        phone: client.phone,
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
module.exports = { inboundLeadIntegration, sendToGSQ };
