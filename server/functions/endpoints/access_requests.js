const crypto = require('crypto');
const express = require('express');
const dayjs = require('dayjs');
const logger = require('firebase-functions/logger');
const { WebClient } = require('@slack/web-api');
const { supabaseService } = require('../services/supabase');
const STATE_ABBREV_MAP = require('../shared/constants/state_abbrev_map');
const { TEAM_INBOX, escapeHtml, sendEmail } = require('../integrations/email');
const { createRateLimiter } = require('../middleware/rateLimit');

// Onboarding is by request: an agent leaves their details on the landing
// page (public route), an admin reviews the queue, and approving mints an
// invite the same way /invite does. Nothing here creates an account — the
// applicant still signs up through /signup?token=... with the invite.

const STATE_CODES = new Set(Object.values(STATE_ABBREV_MAP));
const STATUS_FILTERS = new Set(['requested', 'approved', 'denied', 'all']);
const INVITE_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LIST_FIELDS =
  'id,first_name,last_name,email,phone,npn,states,status,invite_token,' +
  'reviewed_at,denial_reason,created_at,' +
  'reviewed_by:agents!access_requests_reviewed_by_fkey(first_name,last_name,email)';

// The applicant always gets this, whether the request was stored, was a
// repeat of one already waiting, or came from a bot — so the form can't be
// used to find out which emails are already in the queue.
const RECEIVED = { received: true };

const text = (value, max) =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

// Returns { request } with clean values, or { error } naming the first
// problem in words the form can show.
const parseRequest = (body = {}) => {
  const firstName = text(body.first_name, 80);
  const lastName = text(body.last_name, 80);
  const email = text(body.email, 254).toLowerCase();
  const phone = text(body.phone, 40).replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  const npn = text(body.npn, 20).replace(/\D/g, '');
  const states = Array.isArray(body.states)
    ? [...new Set(body.states.map((s) => text(s, 2).toUpperCase()))]
    : [];

  if (!firstName || !lastName) {
    return { error: 'First and last name are required' };
  }
  if (!EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email' };
  if (phone.length !== 10) {
    return { error: 'Enter a 10-digit phone number' };
  }
  // 7 to 10 digits, the same rule the sign-up form applies
  // (NPN_PATTERN in client/src/utils/constants.js).
  if (npn.length < 7 || npn.length > 10) {
    return { error: 'Enter your National Producer Number (7 to 10 digits)' };
  }
  if (states.length === 0 || states.some((s) => !STATE_CODES.has(s))) {
    return { error: 'Pick the states you are licensed in' };
  }
  return {
    request: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      npn,
      states,
    },
  };
};

const DEFAULT_SITE = 'https://fexdigital.com';
const SITE_PATTERN =
  /^https:\/\/(www\.)?(fexdigital|finalexpensedigital)\.com$|^http:\/\/localhost:\d+$/;

// Links in emails point at the site the request came from when it is one of
// ours, and at the main site otherwise.
const siteFor = (req) => {
  const origin = req.get?.('origin') || '';
  return SITE_PATTERN.test(origin) ? origin : DEFAULT_SITE;
};

const emailShell = (body) =>
  `<div style="font-family: Arial, sans-serif; color: #222; padding: 20px;">${body}</div>`;

// Tells the team a request is waiting: an email to the team inbox with the
// applicant's details, and a Slack line if ACCESS_REQUEST_SLACK_CHANNEL is
// set (name and states only).
const defaultNotify = async (request, site = DEFAULT_SITE) => {
  const name = `${request.first_name} ${request.last_name}`;
  const states = request.states.join(', ');
  const queue = `${site}/access-requests`;
  const rows = [
    ['Name', name],
    ['Email', request.email],
    ['Phone', request.phone],
    ['NPN', request.npn],
    ['Licensed states', states],
  ];
  const results = await Promise.allSettled([
    sendEmail({
      to: TEAM_INBOX,
      subject: `Access request: ${name}`,
      text:
        rows.map(([label, value]) => `${label}: ${value}`).join('\n') +
        `\n\nReview it: ${queue}\n`,
      html: emailShell(
        `<p>A new agent asked for access.</p><table>` +
          rows
            .map(
              ([label, value]) =>
                `<tr><td style="padding: 2px 16px 2px 0; color: #777;">${label}</td>` +
                `<td>${escapeHtml(value)}</td></tr>`,
            )
            .join('') +
          `</table><p><a href="${queue}">Review it in the CRM</a></p>`,
      ),
    }),
    (async () => {
      const channel = process.env.ACCESS_REQUEST_SLACK_CHANNEL;
      if (!channel || !process.env.SLACK_BOT_TOKEN) return;
      await new WebClient(process.env.SLACK_BOT_TOKEN).chat.postMessage({
        channel,
        text:
          `New access request: ${name} (${states}). ` +
          `Review it under Access Requests in the CRM.`,
      });
    })(),
  ]);
  const failed = results.find((r) => r.status === 'rejected');
  if (failed) throw failed.reason;
};

// Emails the approved applicant their sign-up link.
const defaultSendInvite = async (request, link) => {
  await sendEmail({
    to: request.email,
    subject: 'Your FEX Digital invite',
    text:
      `Hi ${request.first_name},\n\nYou're approved. Use this link to create ` +
      `your FEX Digital account:\n\n${link}\n\nThe link works for ` +
      `${INVITE_DAYS} days. Questions? Just reply to this email.\n`,
    html: emailShell(
      `<p>Hi ${escapeHtml(request.first_name)},</p>` +
        `<p>You're approved. Use this link to create your FEX Digital account:</p>` +
        `<p><a href="${link}">Create your account</a></p>` +
        `<p style="font-size: 13px; color: #777;">The link works for ` +
        `${INVITE_DAYS} days. Questions? Just reply to this email.</p>`,
    ),
  });
};

const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin'
    ? next()
    : res.status(403).json({ error: 'Forbidden' });

const fail = (req, res, message, error) => {
  logger.error(message, {
    route: req.originalUrl,
    requesterId: req.agent?.id,
    error,
  });
  return res.status(500).json({ error: message });
};

// Mounted before the auth middleware: the landing page posts here.
// Two limits keep the public form from flooding the table and the team
// inbox. One address gets PER_CALLER_MAX tries per window (counted in this
// instance's memory). Across every caller and instance, the table takes at
// most HOURLY_CAP new requests an hour (counted in the database).
const PER_CALLER_WINDOW_MS = 10 * 60 * 1000;
const PER_CALLER_MAX = 5;
const HOURLY_CAP = 30;
const BUSY =
  'We are getting a lot of requests right now. Please try again in an hour, ' +
  `or email ${TEAM_INBOX}.`;

// How many requests were stored since `since` (an ISO time).
const defaultRecentCount = (supabase) => async (since) => {
  const { count, error } = await supabase
    .from('access_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);
  if (error) throw error;
  return count ?? 0;
};

const createPublicAccessRequestRouter = ({
  supabase = supabaseService,
  notify = defaultNotify,
  recentCount = defaultRecentCount(supabase),
  now = () => Date.now(),
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();
  const limit = createRateLimiter({
    windowMs: PER_CALLER_WINDOW_MS,
    max: PER_CALLER_MAX,
    now,
  });

  router.post('/access-request', limit, async (req, res) => {
    // "company" is a field people never see; only a bot fills it in.
    if (text(req.body?.company, 200)) return res.status(200).json(RECEIVED);

    const { request, error: invalid } = parseRequest(req.body);
    if (invalid) return res.status(400).json({ error: invalid });

    try {
      const since = new Date(now() - 60 * 60 * 1000).toISOString();
      if ((await recentCount(since)) >= HOURLY_CAP) {
        logger.error('Access request hourly cap reached', { cap: HOURLY_CAP });
        return res.status(429).json({ error: BUSY });
      }
    } catch (error) {
      // If the count can't be read, take the request: the per-address limit
      // still applies, and turning real applicants away is the worse failure.
      logger.error('Failed to count recent access requests', { error });
    }

    try {
      const { error } = await supabase.from('access_requests').insert(request);
      // 23505: this email already has a request waiting for review
      if (error && error.code === '23505') {
        return res.status(200).json(RECEIVED);
      }
      if (error) throw error;
    } catch (error) {
      return fail(req, res, 'Failed to send your request', error);
    }

    try {
      await notify(request, siteFor(req));
    } catch (error) {
      // the request is saved and shows in the queue either way
      logger.error('Failed to announce access request', { error });
    }
    return res.status(201).json(RECEIVED);
  });

  return router;
};

// Mounted at /access-requests, behind the auth middleware.
const createAccessRequestsRouter = ({
  supabase = supabaseService,
  sendInvite = defaultSendInvite,
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();
  router.use(requireAdmin);

  // status defaults to the review queue; approved, denied or all browse the
  // history
  router.get('/', async (req, res) => {
    const status =
      typeof req.query.status === 'string' ? req.query.status : 'requested';
    if (!STATUS_FILTERS.has(status)) {
      return res.status(400).json({ error: 'Invalid status filter' });
    }
    try {
      let query = supabase.from('access_requests').select(LIST_FIELDS);
      if (status !== 'all') query = query.eq('status', status);
      // the queue is oldest-first (who has waited longest); history is
      // newest-first
      const { data, error } = await query.order('created_at', {
        ascending: status === 'requested',
      });
      if (error) throw error;
      return res.status(200).json({ data });
    } catch (error) {
      return fail(req, res, 'Failed to fetch access requests', error);
    }
  });

  // Approving mints an invite with the reviewing admin as the upline, the
  // same as that admin pressing "Invite agent", and emails the applicant
  // their sign-up link. The token comes back too, with invite_emailed, so
  // the admin can send the link by hand if the email didn't go out.
  router.post('/:id/approve', async (req, res) => {
    const reviewerId = req.agent?.id;
    if (!reviewerId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }
    try {
      const { data: request, error: requestError } = await supabase
        .from('access_requests')
        .select('id,email,status')
        .eq('id', req.params.id)
        .maybeSingle();
      if (requestError) throw requestError;
      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (request.status !== 'requested') {
        return res
          .status(409)
          .json({ error: 'This request has already been reviewed' });
      }

      const { data: existing, error: existingError } = await supabase
        .from('agents')
        .select('id')
        .eq('email', request.email)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        return res
          .status(409)
          .json({ error: 'An agent with this email already has an account' });
      }

      // claim the request first, guarded on status, so a double click
      // can't mint two invites
      const token = crypto.randomUUID();
      const { data: claimed, error: claimError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          invite_token: token,
          reviewed_by: reviewerId,
          reviewed_at: new Date(Date.now()).toISOString(),
        })
        .eq('id', request.id)
        .eq('status', 'requested')
        .select(LIST_FIELDS)
        .maybeSingle();
      if (claimError) throw claimError;
      if (!claimed) {
        return res
          .status(409)
          .json({ error: 'This request has already been reviewed' });
      }

      const expiresAt = dayjs().add(INVITE_DAYS, 'day').toISOString();
      const { error: inviteError } = await supabase.from('invites').insert({
        token,
        upline_agent_id: reviewerId,
        used: false,
        expires_at: expiresAt,
      });
      if (inviteError) {
        // put it back in the queue rather than leave it approved with a
        // link that doesn't work
        await supabase
          .from('access_requests')
          .update({
            status: 'requested',
            invite_token: null,
            reviewed_by: null,
            reviewed_at: null,
          })
          .eq('id', request.id);
        throw inviteError;
      }

      logger.log('Access request approved', {
        requestId: request.id,
        reviewerId,
      });
      // the approval stands whether or not the email goes out
      let inviteEmailed = true;
      try {
        await sendInvite(claimed, `${siteFor(req)}/signup?token=${token}`);
      } catch (error) {
        inviteEmailed = false;
        logger.error('Failed to email invite', {
          requestId: request.id,
          error,
        });
      }
      return res.status(200).json({
        data: {
          ...claimed,
          expires_at: expiresAt,
          invite_emailed: inviteEmailed,
        },
      });
    } catch (error) {
      return fail(req, res, 'Failed to approve access request', error);
    }
  });

  router.post('/:id/deny', async (req, res) => {
    const reviewerId = req.agent?.id;
    if (!reviewerId) {
      return res.status(403).json({ error: 'Agent profile required' });
    }
    const reason = text(req.body?.reason, 500) || null;
    try {
      const { data, error } = await supabase
        .from('access_requests')
        .update({
          status: 'denied',
          denial_reason: reason,
          reviewed_by: reviewerId,
          reviewed_at: new Date(Date.now()).toISOString(),
        })
        .eq('id', req.params.id)
        .eq('status', 'requested')
        .select(LIST_FIELDS)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return res
          .status(409)
          .json({ error: 'This request has already been reviewed' });
      }
      logger.log('Access request denied', { requestId: data.id, reviewerId });
      return res.status(200).json({ data });
    } catch (error) {
      return fail(req, res, 'Failed to deny access request', error);
    }
  });

  return router;
};

module.exports = {
  accessRequestsRouter: createAccessRequestsRouter(),
  publicAccessRequestRouter: createPublicAccessRequestRouter(),
  createAccessRequestsRouter,
  createPublicAccessRequestRouter,
  parseRequest,
};
