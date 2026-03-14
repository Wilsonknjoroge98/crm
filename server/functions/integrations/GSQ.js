const axios = require('axios');

const { getHyrosSource } = require('./hyros');
const { supabaseService } = require('../services/supabase');

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
      first_name,
      last_name,
      email,
      phone,
      dob,
      gsq_id,
      issued_to,
      sold,
    } = req.body;

    if (
      !first_name ||
      !last_name ||
      !email ||
      !phone ||
      !gsq_id ||
      !dob ||
      !issued_to ||
      sold === undefined
    ) {
      return res.status(400).send({ message: 'Missing required fields' });
    }

    const hyrosSource = await getHyrosSource(email);
    const { data: vendorData } = await supabaseService
      .from('lead_vendors')
      .select('id')
      .eq('name', 'GetSeniorQuotes.com')
      .single();

    const { data: agent, error: agentError } = await supabaseService
      .from('agents')
      .select('id, email')
      .eq('email', issued_to)
      .single();

    if (agentError || !agent) {
      logger.error('Invalid agent email:', agentError);
      return res.status(400).send({ message: 'Invalid agent email' });
    }

    const lead = { ...req.body };
    delete lead.issued_to;
    // TODO DELETE FROM sendToCRM payload
    delete lead.gsq_source;

    const payload = {
      ...lead,
      agent_id: agent.id,
      gsq_source: hyrosSource,
      lead_vendor_id: vendorData.id,
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
