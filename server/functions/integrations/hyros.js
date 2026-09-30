const axios = require('axios');
const logger = require('firebase-functions/logger');

const hyrosAgent = axios.create({
  baseURL: 'https://api.hyros.com/v1/api/v1.0',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Read the key per request (not at module load) so it always reflects the
// secret bound to the running function.
hyrosAgent.interceptors.request.use((config) => {
  config.headers['API-Key'] = process.env.HYROS_SECRET_KEY;
  return config;
});

const getHyrosSource = async (phone) => {
  if (!process.env.HYROS_SECRET_KEY) {
    logger.error(
      'HYROS_SECRET_KEY is not bound to this function — skipping Hyros lookup',
    );
    return null;
  }

  const HYROS_BODY = {
    method: 'GET',
    url: '/leads',
    params: {
      phones: phone,
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
    // Log status + body only; the full AxiosError dumps request config.
    logger.error('Error fetching Hyros data', {
      status: error.response?.status,
      error: error.response?.data || error.message,
    });
    return null;
  }
};
const sendSaleToHyros = async (commission, client, policy) => {
  if (!client || !client.email || !client.phone) {
    logger.error('Missing client information for Hyros');
    return;
  }

  if (!policy) {
    logger.error('Missing policy information for Hyros');
    return;
  }

  if (!commission || commission <= 0) {
    logger.error('Invalid commission amount for Hyros');
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
    logger.log('Hyros order created:', hyrosResponse.data);
  } catch (error) {
    console.error(
      'Error creating Hyros order:',
      error.response?.data || error.message,
    );
  }
};
module.exports = { hyrosAgent, getHyrosSource, sendSaleToHyros };
