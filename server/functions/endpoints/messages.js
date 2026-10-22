const express = require('express');
const logger = require('firebase-functions/logger');
const {
  toE164,
  getSendblueCredentials,
  fetchMessages,
  sendMessage,
} = require('../integrations/sendblue');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const messagesRouter = express.Router();

const MAX_CONTENT_LENGTH = 2000;
const INBOX_PAGE_SIZE = 50;
const MAX_INBOX_PAGE_SIZE = 100;

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

const markRead = (agentId, number) =>
  supabaseService
    .from('message_reads')
    .upsert(
      { agent_id: agentId, number, last_read_at: new Date().toISOString() },
      { onConflict: 'agent_id,number' },
    );

const toThread = (row) => ({
  phone: row.number,
  leadId: row.lead_id,
  clientId: row.client_id,
  firstName: row.first_name,
  lastName: row.last_name,
  unreadCount: row.unread_count,
  lastMessage: {
    content: row.last_content ?? '',
    outbound: Boolean(row.last_outbound),
    status: row.last_status ?? null,
    sentAt: row.last_at,
  },
});

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

// Threads come from public.messages (webhook fed), so history from before the
// webhook went live only shows up once that number texts again
messagesRouter.get('/inbox', async (req, res) => {
  const line = requireLine(req, res);
  if (!line) return;

  const requested = Number.parseInt(req.query.limit, 10);
  const limit = Number.isNaN(requested) ?
    INBOX_PAGE_SIZE :
    Math.min(Math.max(requested, 1), MAX_INBOX_PAGE_SIZE);

  let before = null;
  if (req.query.before) {
    const parsed = new Date(req.query.before);
    if (Number.isNaN(parsed.getTime())) {
      return res.status(400).json({ error: 'before must be a timestamp' });
    }
    before = parsed.toISOString();
  }

  const { data, error } = await supabaseService.rpc('message_inbox', {
    p_agent_id: req.agent.id,
    p_line: line,
    p_limit: limit,
    p_before: before,
  });
  if (error) {
    logger.error('Inbox query failed in endpoints/messages.js', {
      route: '/messages/inbox',
      method: 'GET',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Failed to load inbox' });
  }

  const rows = data || [];
  return res.status(200).json({
    threads: rows.map(toThread),
    // every row carries the same total, an empty page means nothing unread past the cursor
    unreadTotal: rows[0]?.unread_total ?? 0,
    nextBefore: rows.length === limit ? rows[rows.length - 1].last_at : null,
  });
});

messagesRouter.post('/read', async (req, res) => {
  const line = requireLine(req, res);
  if (!line) return;

  const number = toE164(req.body?.phone);
  if (!number) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }
  if (!(await requireOwnership(req, res, number))) return;

  const { error } = await markRead(req.agent.id, number);
  if (error) {
    logger.error('Mark read failed in endpoints/messages.js', {
      route: '/messages/read',
      method: 'POST',
      requesterId: req.agent?.id,
      error,
    });
    return res.status(500).json({ error: 'Failed to mark thread read' });
  }
  return res.status(204).send();
});

messagesRouter.get('/', async (req, res) => {
  const line = requireLine(req, res);
  if (!line) return;

  const number = toE164(req.query.phone);
  if (!number) {
    return res.status(400).json({ error: 'A valid phone number is required' });
  }
  if (!(await requireOwnership(req, res, number))) return;

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
  if (!(await requireOwnership(req, res, number))) return;

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
    // replying counts as reading the thread, a failure here shouldn't fail the send
    const { error: readError } = await markRead(req.agent.id, number);
    if (readError) {
      logger.warn('Mark read after send failed in endpoints/messages.js', {
        requesterId: req.agent?.id,
        error: readError,
      });
    }
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
