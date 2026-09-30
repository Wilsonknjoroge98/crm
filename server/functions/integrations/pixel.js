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

// crypto.update() throws ERR_INVALID_ARG_TYPE on undefined/null, which used
// to abort the whole Purchase event whenever one field (e.g. a one-word
// name's last name, or a client without a zip) was missing. Return
// undefined for empty values instead; JSON.stringify drops those keys.
const hash = (data) => {
  if (data === undefined || data === null) return undefined;
  const value = String(data).trim();
  if (!value) return undefined;
  return crypto.createHash('sha256').update(value).digest('hex');
};

// Meta CAPI normalization rules (lowercase, digits-only phone, 2-letter
// state, 5-digit zip, YYYYMMDD dob) — unnormalized hashes don't match.
const lower = (v) =>
  v === undefined || v === null ? undefined : String(v).trim().toLowerCase();

const normalizePhone = (phone) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return undefined;
  return digits.length === 10 ? `1${digits}` : digits;
};

const normalizeState = (state) => {
  const value = String(state ?? '').trim();
  if (!value) return undefined;
  if (value.length === 2) return value.toLowerCase();
  const match = Object.entries(STATE_ABBREV_MAP).find(
    ([name]) => name.toLowerCase() === value.toLowerCase(),
  );
  return match ? match[1].toLowerCase() : value.toLowerCase();
};

const normalizeZip = (zip) => {
  const digits = String(zip ?? '').replace(/\D/g, '');
  return digits ? digits.slice(0, 5) : undefined;
};

const normalizeCity = (city) => {
  const value = lower(city);
  return value ? value.replace(/[^a-z]/g, '') : undefined;
};

const normalizeDob = (year, month, day) => {
  if (!year || !month || !day) return undefined;
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
};

const genderOf = (sex) => {
  const value = lower(sex);
  if (value === 'male' || value === 'm') return 'm';
  if (value === 'female' || value === 'f') return 'f';
  return undefined;
};

const sendPurchaseToMeta = async (ap, lead, client) => {
  if (!lead || !lead.email || !lead.name || !lead.phone || !lead.state) {
    console.error('Missing lead information');
    return;
  }

  if (!client) {
    console.error('Missing client information');
    return;
  }

  if (!ap || ap <= 0) {
    console.error('Invalid ap amount');
    return;
  }

  const eventTime = Math.floor(Date.now() / 1000);
  const [firstName, ...rest] = String(lead.name).trim().split(/\s+/);
  const lastName = rest.length ? rest[rest.length - 1] : undefined;

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
          em: hash(lower(lead.email)),
          fn: hash(lower(firstName)),
          ln: hash(lower(lastName)),
          ph: hash(normalizePhone(lead.phone)),
          db: hash(
            normalizeDob(lead.birthYear, lead.birthMonth, lead.birthDay),
          ),
          country: hash('us'),
          zp: hash(normalizeZip(client.zip)),
          ct: hash(normalizeCity(client.city)),
          st: hash(normalizeState(client.state || lead.state)),
          ge: hash(genderOf(lead.sex)),
        },
        custom_data: {
          currency: 'USD',
          value: ap,
          content_type: 'product',
          contents: [
            {
              id: `purchase-${lead.email}-${eventTime}`,
              quantity: 1,
              item_price: ap,
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

module.exports = { sendPurchaseToMeta, hash, normalizePhone, normalizeState };
