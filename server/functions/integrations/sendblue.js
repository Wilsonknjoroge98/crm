const axios = require('axios');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

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

const isFromSendblue = (req) =>
  Boolean(process.env.SEND_BLUE_WEBHOOK_SECRET) &&
  req.headers['sb-signing-secret'] === process.env.SEND_BLUE_WEBHOOK_SECRET;

const inboundSendblue = async (req, res) => {
  if (!isFromSendblue(req)) {
    logger.warn('Rejected sendblue webhook, bad secret');
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const m = req.body || {};
  const number = toE164(m.number || (m.is_outbound ? m.to_number : m.from_number));
  // outbound events come with sendblue_number null, our line is only in from_number
  const line = m.sendblue_number || (m.is_outbound ? m.from_number : m.to_number);
  if (!m.message_handle || !number || !line) {
    logger.warn('Ignored sendblue webhook, missing fields', { body: m });
    return res.status(400).send({ message: 'Missing required fields' });
  }

  // upsert so retry is a no op
  const { error } = await supabaseService.from('messages').upsert(
    {
      message_handle: m.message_handle,
      sendblue_number: line,
      number,
      content: m.content ?? '',
      is_outbound: Boolean(m.is_outbound),
      status: m.status ?? null,
      error_message: m.error_message || null,
      sent_at: m.date_sent || m.date_updated || null,
    },
    { onConflict: 'message_handle' },
  );

  if (error) {
    logger.error('Sendblue webhook upsert failed', { error });
    return res.status(500).send({ message: 'Failed to store message' });
  }
  return res.status(200).send({ message: 'OK' });
};

module.exports = { toE164, fetchMessages, sendMessage, inboundSendblue };
