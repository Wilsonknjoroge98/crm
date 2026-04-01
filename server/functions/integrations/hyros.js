const axios = require('axios');

const hyrosAgent = axios.create({
  baseURL: 'https://api.hyros.com/v1/api/v1.0',
  headers: {
    'Content-Type': 'application/json',
    'API-Key': process.env.HYROS_SECRET_KEY,
  },
});

const getHyrosSource = async (email) => {
  const HYROS_BODY = {
    method: 'GET',
    url: '/leads',
    params: {
      emails: email,
    },
  };

  try {
    const response = await hyrosAgent.request(HYROS_BODY);
    const hyrosData = response.data.result[0] || [];

    let source = hyrosData?.lastSource?.sourceLinkAd?.name || null;

    if (!source) {
      source = hyrosData?.firstSource?.sourceLinkAd?.name || null;

      if (!source) {
        source =
          hyrosData.lastSource?.name || hyrosData.firstSource?.name || null;
      }
    }

    return source;
  } catch (error) {
    console.error('Error fetching Hyros data:', error);
  }
};
const sendSaleToHyros = async (commission, client, policy) => {
  if (!client || !client.email || !client.phone) {
    console.error('Missing client information for Hyros');
    return;
  }

  if (!policy) {
    console.error('Missing policy information for Hyros');
    return;
  }

  if (!commission || commission <= 0) {
    console.error('Invalid commission amount for Hyros');
    return;
  }

  const HYROS_BODY = {
    method: 'POST',
    url: '/orders',
    data: {
      stage: 'Sale',
      phoneNumbers: [client.phone],
      email: client.email,
      items: [
        {
          name: `${policy.carrier} - ${policy.policyType}`,
          price: commission,
          quantity: 1,
        },
      ],
    },
  };

  try {
    const hyrosResponse = await hyrosAgent.request(HYROS_BODY);
    console.log('Hyros order created:', hyrosResponse.data);
  } catch (error) {
    console.error(
      'Error creating Hyros order:',
      error.response?.data || error.message,
    );
  }
};
module.exports = { hyrosAgent, getHyrosSource, sendSaleToHyros };
