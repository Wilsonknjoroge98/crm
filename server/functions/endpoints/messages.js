const express = require('express');
const logger = require('firebase-functions/logger');
const {
  toE164,
  getSendblueCredentials,
  fetchMessages,
  sendMessage,
} = require('../integrations/sendblue');

// eslint-disable-next-line new-cap
const messagesRouter = express.Router();

const MAX_CONTENT_LENGTH = 2000;

// 409 not 403 so the client can tell "no line set up yet" from forbidden
const requireLine = (req, res) => {
  const line = req.agent?.sendblue_number;
  if (!line) {
    res.status(409).json({ error: 'No Sendblue number is set for this agent' });
    return null;
  }
  return line;
};

// Credentials come from the agent's own Sendblue subaccount
// (sendblue_config/{email}) on every request, shared account as fallback
const loadCredentials = async (req, res, line, route, method) => {
  try {
    const credentials = await getSendblueCredentials(req.agent?.email);
    if (credentials.sendblueNumber && credentials.sendblueNumber !== line) {
      logger.warn('agents.sendblue_number differs from sendblue_config', {
        route,
        method,
        requesterId: req.agent?.id,
        agentLine: line,
        configLine: credentials.sendblueNumber,
      });
    }
    return credentials;
  } catch (error) {
    logger.error('Sendblue credential lookup failed in endpoints/messages.js', {
      route,
      method,
      requesterId: req.agent?.id,
      message: error.cause?.message || error.message,
    });
    res.status(503).json({ error: 'Messaging is temporarily unavailable' });
    return null;
  }
};

const sendblueFailure = (res, error, route, method, req, fallback) => {
  logger.error(`Sendblue error in endpoints/messages.js`, {
    route,
    method,
    requesterId: req.agent?.id,
    upstreamStatus: error.status,
    message: error.message,
  });
  // sendblue 4xx = our request was bad, pass their reason through, anything else is on them
  const status = error.status >= 400 && error.status < 500 ? 400 : 502;
  return res.status(status).json({ error: error.message || fallback });
};

messagesRouter.get('/', async (req, res) => {
  const line = requireLine(req, res);
  if (!line) return;

  const number = toE164(req.query.phone);
  if (!number) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }

  const credentials = await loadCredentials(req, res, line, '/messages', 'GET');
  if (!credentials) return;

  try {
    const messages = await fetchMessages({
      credentials,
      number,
      sendblueNumber: line,
    });
    return res.status(200).json(messages);
  } catch (error) {
    return sendblueFailure(
      res,
      error,
      '/messages',
      'GET',
      req,
      'Failed to fetch messages',
    );
  }
});

messagesRouter.post('/', async (req, res) => {
  const line = requireLine(req, res);
  if (!line) return;

  const number = toE164(req.body?.phone);
  const content =
    typeof req.body?.content === 'string' ? req.body.content.trim() : '';

  if (!number) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }
  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({ error: 'Message is too long' });
  }

  const credentials = await loadCredentials(
    req,
    res,
    line,
    '/messages',
    'POST',
  );
  if (!credentials) return;

  try {
    const message = await sendMessage({
      credentials,
      fromNumber: line,
      toNumber: number,
      content,
    });
    return res.status(201).json(message);
  } catch (error) {
    return sendblueFailure(
      res,
      error,
      '/messages',
      'POST',
      req,
      'Failed to send message',
    );
  }
});

module.exports = messagesRouter;
