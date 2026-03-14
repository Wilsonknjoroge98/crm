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
      firstName,
      lastName,
      email,
      phone,
      dob,
      gsqId,
      leadSource,
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
      !leadSource ||
      !issuedTo ||
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

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      agent_id: issuedTo,
      date_of_birth: dob,
      age: getAge(dob),
      state: req.body?.state || '',
      smoker: req.body?.smoker ?? false,
      face_amount: req.body?.faceAmount || 0,
      premium: req.body?.premium || 0,
      selected_plan: req.body?.selectedPlan || '',
      selected_carrier: req.body?.selectedCarrier || '',
      beneficiary: req.body?.beneficiary || '',
      priority: req.body?.priority || '',
      why: req.body?.why || '',
      bmi: req.body?.bmi || '',
      cholesterol: req.body?.cholesterol || '',
      blood_pressure: req.body?.bloodPressure || '',
      verified: req.body?.verified ?? false,
      sold,
      gsq_source: hyrosSource,
      gsq_id: gsqId,
      lead_vendor_id: vendorData.id,
    };

    const { error } = await supabaseService.from('leads').insert(payload);
    // check for unique constraint error
    if (error) {
      if (error.code === '23505') {
        console.log('Lead already exists:', error);
        return res.status(409).send({ message: 'Lead already exists' });
      } else {
        return res.status(400).send({ message: 'Invalid request payload' });
      }
    }

    res.status(201).send({ message: 'Lead saved successfully' });
  } catch (error) {
    console.error('Error saving lead:', error);
    res.status(500).send({ message: 'Failed to save lead' });
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
    console.log('GSQ response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending mark lead sold:', error);
    throw error;
  }
};
module.exports = { inboundLeadIntegration, sendToGSQ };
