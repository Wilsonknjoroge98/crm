const express = require('express');
const logger = require('firebase-functions/logger');
const {
  toE164,
  fetchMessages,
  sendMessage,
} = require('../integrations/sendblue');
const { supabaseService } = require('../services/supabase');

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

// Will need to rewrite if/when we drop agent_clients
const requireOwnership = async (req, res, number) => {
  const digits = number.slice(2);
  const variants = [digits, `1${digits}`, number];
  const [leads, clients] = await Promise.all([
    supabaseService
      .from('leads')
      .select('id')
      .eq('agent_id', req.agent.id)
      .in('phone', variants)
      .limit(1),
    supabaseService
      .from('clients')
      .select('id, agent_clients!agent_clients_client_id_fkey!inner(agent_id)')
      .eq('agent_clients.agent_id', req.agent.id)
      .in('phone', variants)
      .limit(1),
  ]);
  const error = leads.error || clients.error;
  if (error) {
    logger.error('Ownership check failed in endpoints/messages.js', {
      requesterId: req.agent?.id,
      error,
    });
    res.status(500).json({ error: 'Failed to verify lead ownership' });
    return false;
  }
  if (!leads.data.length && !clients.data.length) {
    res.status(403).json({ error: 'This number is not one of your leads' });
    return false;
  }
  return true;
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
  if (!(await requireOwnership(req, res, number))) return;

  try {
    const messages = await fetchMessages({ number, sendblueNumber: line });
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
  if (!(await requireOwnership(req, res, number))) return;

  try {
    const message = await sendMessage({
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
