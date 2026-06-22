const crypto = require('crypto');
const axios = require('axios');
const STATE_ABBREV_MAP = require('../shared/constants/state_abbrev_map');

const pixelClient = axios.create({
  baseURL: process.env.META_CONVERSIONS_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  params: {
    access_token: process.env.META_CONVERSIONS_TOKEN,
  },
});

const hash = (data) => {
  return `${crypto.createHash('sha256').update(data).digest('hex')}`;
};

const sendPurchaseToMeta = async (ap, lead, client, policy) => {
  if (!lead || !lead.email || !lead.name || !lead.phone || !lead.state) {
    console.error('Missing lead information');
    return;
  }

  if (!client) {
    console.error('Missing client information');
    return;
  }

  if (!policy) {
    console.error('Missing policy information');
    return;
  }

  if (!policy.premiumAmount) {
    console.error('Missing policy premium amount');
    return;
  }

  if (!ap || ap <= 0) {
    console.error('Invalid ap amount');
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);

  const META_PURCHASE_PAYLOAD = {
    data: [
      {
        event_name: 'Purchase',
        event_time: eventTime,
        action_source: 'website',
        event_source_url: 'https://getseniorquotes.com',
        event_id: `purchase-${lead.email}-${eventTime}`,
        user_data: {
          client_ip_address: lead.ip,
          client_user_agent: lead.userAgent,
          em: hash(lead.email),
          fn: hash(lead.name.split(' ')[0]),
          ln: hash(lead.name.split(' ')[1]),
          ph: hash(lead.phone),
          db: hash(`${lead.birthYear}${lead.birthMonth}${lead.birthDay}`),
          country: hash('US'),
          zp: hash(client.zip),
          ct: hash(client.city),
          st: hash(client.state),
          ge: lead.sex === 'Male' ? hash('m') : hash('f'),
        },
        custom_data: {
          currency: 'USD',
          value: ap,
          content_type: 'product',
          content_name: `${policy.carrier} - ${policy.policyType}`,
          contents: [
            {
              id: `purchase-${lead.email}-${eventTime}`,
              quantity: 1,
              item_price: policy.premiumAmount * 12,
            },
          ],
        },
      },
    ],
  };

  // Attach click identifiers if available
  if (lead.fbc) META_PURCHASE_PAYLOAD.data[0].user_data.fbc = lead.fbc;
  if (lead.fbp) META_PURCHASE_PAYLOAD.data[0].user_data.fbp = lead.fbp;

  // Optional: add test_event_code for sandbox testing
  if (process.env.NODE_ENV === 'development') {
    META_PURCHASE_PAYLOAD.test_event_code = 'TEST12345';
  }

  try {
    const res = await pixelClient.post('/', META_PURCHASE_PAYLOAD);

    console.log('Meta Purchase event sent:', res.data);
  } catch (err) {
    console.error(
      'Meta Purchase event error:',
      err.response?.data || err.message,
    );
  }
};

module.exports = { sendPurchaseToMeta };
