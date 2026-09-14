const axios = require('axios');

const SENDBLUE_BASE_URL = 'https://api.sendblue.co';

const sendblueHeaders = () => ({
  'sb-api-key-id': process.env.SEND_BLUE_API_KEY,
  'sb-api-secret-key': process.env.SEND_BLUE_SECRET_KEY,
});

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

const fetchMessages = async ({ number, sendblueNumber, limit = 50 }) => {
  let response;
  try {
    response = await axios.get(`${SENDBLUE_BASE_URL}/api/v2/messages`, {
      headers: sendblueHeaders(),
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

const sendMessage = async ({ fromNumber, toNumber, content }) => {
  let response;
  try {
    response = await axios.post(
      `${SENDBLUE_BASE_URL}/api/send-message`,
      { from_number: fromNumber, number: toNumber, content },
      { headers: sendblueHeaders() },
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

module.exports = { toE164, fetchMessages, sendMessage };
