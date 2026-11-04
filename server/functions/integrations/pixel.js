const crypto = require('crypto');
const axios = require('axios');
const STATE_ABBREV_MAP = require('../shared/constants/state_abbrev_map');

// Each brand has its own Meta pixel (dataset). GSQ's endpoint is the
// META_CONVERSIONS_URL secret; Keyley's is built from KEYLEY_META_PIXEL_ID, as
// gsq's keyley/meta.js does. One Conversions API token (META_CONVERSIONS_TOKEN)
// has access to both pixels.
const KEYLEY_GRAPH_VERSION = 'v26.0';
const PIXELS = {
  gsq: {
    url: () => process.env.META_CONVERSIONS_URL,
    eventSourceUrl: 'https://getseniorquotes.com',
  },
  keyley: {
    url: () =>
      process.env.KEYLEY_META_PIXEL_ID
        ? `https://graph.facebook.com/${KEYLEY_GRAPH_VERSION}/${process.env.KEYLEY_META_PIXEL_ID}/events`
        : null,
    eventSourceUrl: 'https://keyley.com',
  },
};

// Keyley lead docs keep the visitor's ip / user agent under consent and the
// Meta cookies under meta (gsq keyley/lead.js); GSQ's keep them at the top.
const pixelLead = (lead, brand) =>
  brand === 'keyley'
    ? {
        ...lead,
        ip: lead.consent?.ip,
        userAgent: lead.consent?.userAgent,
        fbc: lead.meta?.fbc,
        fbp: lead.meta?.fbp,
      }
    : lead;

// Meta wants trimmed, lowercased values hashed with sha256. Missing values
// return undefined so the key is dropped from the payload instead of
// crashing createHash().update() (clients only require phone now).
const hash = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return undefined;
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const normalizePhone = (phone) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return undefined;
  return digits.length === 10 ? `1${digits}` : digits;
};

const normalizeState = (state) => {
  if (!state) return undefined;
  const trimmed = String(state).trim();
  return STATE_ABBREV_MAP[trimmed] || trimmed;
};

const normalizeDob = (year, month, day) => {
  if (!year || !month || !day) return undefined;
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
};

const normalizeGender = (sex) => {
  if (sex === 'Male') return 'm';
  if (sex === 'Female') return 'f';
  return undefined;
};

const sendPurchaseToMeta = async (ap, gsqLead, client, brand = 'gsq') => {
  const pixel = PIXELS[brand];
  const url = pixel?.url();
  if (!url) {
    console.error('No Meta pixel configured for brand', brand);
    return;
  }
  const lead = pixelLead(gsqLead || {}, brand);

  if (!lead.email || !lead.name || !lead.phone || !lead.state) {
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
        event_source_url: pixel.eventSourceUrl,
        event_id: `purchase-${lead.email}-${eventTime}`,
        user_data: {
          client_ip_address: lead.ip,
          client_user_agent: lead.userAgent,
          em: hash(lead.email),
          fn: hash(firstName),
          ln: hash(lastName),
          ph: hash(normalizePhone(lead.phone)),
          db: hash(normalizeDob(lead.birthYear, lead.birthMonth, lead.birthDay)),
          country: hash('US'),
          zp: hash(client.zip ? String(client.zip).slice(0, 5) : undefined),
          ct: hash(client.city ? String(client.city).replace(/[^a-zA-Z]/g, '') : undefined),
          st: hash(normalizeState(client.state || lead.state)),
          ge: hash(normalizeGender(lead.sex)),
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
    const res = await axios.post(url, META_PURCHASE_PAYLOAD, {
      headers: { 'Content-Type': 'application/json' },
      params: { access_token: process.env.META_CONVERSIONS_TOKEN },
    });

    console.log('Meta Purchase event sent:', res.data);
  } catch (err) {
    console.error(
      'Meta Purchase event error:',
      err.response?.data || err.message,
    );
  }
};

module.exports = { sendPurchaseToMeta };
