const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/scheduler');

const { inboundGSQ } = require('./integrations/GSQ');
const { updatePolicyStatus } = require('./jobs/update_policy_status');
const { weeklyLeaderboard } = require('./jobs/leaderboard_slack');

const expressApp = require('./server.js');

exports.app = functions.https.onRequest(
  {
    timeoutSeconds: 120,
    memory: '512MiB',
    secrets: [
      'GSQ_SERVICE_ACCOUNT_KEY',
      'STRIPE_SECRET_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
  },
  expressApp,
);

exports.newLead = functions.https.onRequest(inboundGSQ);

exports.updatePolicyStatus = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'America/Los_Angeles',
  },
  updatePolicyStatus,
);

exports.weeklyLeaderboard = onSchedule(
  {
    schedule: '0 8 * * 1',
    timeZone: 'America/New_York',
  },
  weeklyLeaderboard,
);
