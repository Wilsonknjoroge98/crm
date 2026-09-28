const axios = require('axios');
const logger = require('firebase-functions/logger');
const { Firestore } = require('firebase-admin/firestore');

const SENDBLUE_BASE_URL = 'https://api.sendblue.co';

// gsq writes each agent's Sendblue subaccount credentials here when it
// provisions their line (gsq utils/sendblue.js), keyed by lowercased email
const SENDBLUE_CONFIG_COLLECTION = 'sendblue_config';

// Factory injectable so tests can stub the gsq Firestore
const defaultCreateFirestore = () =>
  new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

let gsqDb = null;
let createFirestore = defaultCreateFirestore;
const getGsqDb = () => {
  if (!gsqDb) gsqDb = createFirestore();
  return gsqDb;
};

// tests only
const setFirestoreFactory = (factory) => {
  createFirestore = factory || defaultCreateFirestore;
  gsqDb = null;
};

const sharedCredentials = () => ({
  apiKey: process.env.SEND_BLUE_API_KEY,
  apiSecret: process.env.SEND_BLUE_SECRET_KEY,
  sendblueNumber: null,
  source: 'shared_account',
});

/**
 * Per-request lookup of the agent's Sendblue subaccount credentials from
 * gsq's sendblue_config/{email}. Agents onboarded before per-agent
 * subaccounts have no doc and stay on the shared account secrets.
 * @param {string} email agent email (agents.email)
 * @return {Promise<object>} { apiKey, apiSecret, sendblueNumber, source }
 */
const getSendblueCredentials = async (email) => {
  const docId = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!docId) return sharedCredentials();

  let data = null;
  try {
    const snap = await getGsqDb()
      .collection(SENDBLUE_CONFIG_COLLECTION)
      .doc(docId)
      .get();
    data = snap.exists ? snap.data() : null;
  } catch (error) {
    // Don't silently fall back to the shared account here: for a subaccount
    // agent that would read/send through the wrong account
    const wrapped = new Error('Failed to load Sendblue credentials');
    wrapped.status = 503;
    wrapped.cause = error;
    throw wrapped;
  }

  if (data?.apiKey && data?.apiSecret) {
    return {
      apiKey: data.apiKey,
      apiSecret: data.apiSecret,
      sendblueNumber: data.sendblueNumber || null,
      source: SENDBLUE_CONFIG_COLLECTION,
    };
  }

  if (data) {
    // doc exists but provisioning hasn't finished saving credentials
    logger.warn('sendblue_config has no credentials yet', {
      email: docId,
      status: data.status || null,
    });
  }
  return sharedCredentials();
};

const sendblueHeaders = (credentials) => {
  if (!credentials?.apiKey || !credentials?.apiSecret) {
    const missing = new Error('Sendblue credentials are not configured');
    missing.status = 503;
    throw missing;
  }
  return {
    'sb-api-key-id': credentials.apiKey,
    'sb-api-secret-key': credentials.apiSecret,
  };
};

// sendblue wants e164, strip to 10 digits and drop a leading 1, anything else is not a phone
const toE164 = (phone) => {
  if (phone === null || phone === undefined) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return `+1${digits}`;
};

const toMessage = (m) => ({
  id: m.message_handle,
  content: m.content ?? '',
  outbound: Boolean(m.is_outbound),
  status: m.status ?? null,
  sentAt: m.date_sent || m.date_updated || m.date_created || null,
  error: m.error_message || null,
});

const toSendblueError = (error, fallback) => {
  const data = error?.response?.data;
  const message =
    data?.error_message || data?.message || error?.message || fallback;
  const wrapped = new Error(message);
  wrapped.status = error?.response?.status ?? null;
  return wrapped;
};

const fetchMessages = async ({
  credentials,
  number,
  sendblueNumber,
  limit = 50,
}) => {
  const headers = sendblueHeaders(credentials);
  let response;
  try {
    response = await axios.get(`${SENDBLUE_BASE_URL}/api/v2/messages`, {
      headers,
      params: {
        number,
        sendblue_number: sendblueNumber,
        limit,
        order_by: 'createdAt',
        order_direction: 'desc',
      },
    });
  } catch (error) {
    throw toSendblueError(error, 'Failed to fetch messages from Sendblue');
  }

  const rows = Array.isArray(response.data?.data) ? response.data.data : [];
  // filter on our line again so nobody can read another agents thread, then oldest first
  return rows
    .filter((m) => m.sendblue_number === sendblueNumber)
    .map(toMessage)
    .reverse();
};

const sendMessage = async ({ credentials, fromNumber, toNumber, content }) => {
  const headers = sendblueHeaders(credentials);
  let response;
  try {
    response = await axios.post(
      `${SENDBLUE_BASE_URL}/api/send-message`,
      { from_number: fromNumber, number: toNumber, content },
      { headers },
    );
  } catch (error) {
    throw toSendblueError(error, 'Failed to send message through Sendblue');
  }

  // sendblue can 200 with status ERROR (unregistered line, bad recipient), thats still a failed send
  if (response.data?.status === 'ERROR') {
    const rejected = new Error(
      response.data.error_message || 'Sendblue rejected the message',
    );
    rejected.status = 400;
    throw rejected;
  }
  return toMessage(response.data);
};

module.exports = {
  SENDBLUE_CONFIG_COLLECTION,
  toE164,
  getSendblueCredentials,
  fetchMessages,
  sendMessage,
  setFirestoreFactory,
};
