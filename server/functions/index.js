const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/scheduler');

const { inboundGSQ } = require('./integrations/GSQ');
const { updatePolicyStatus } = require('./jobs/update_policy_status');

const expressApp = require('./server.js');

exports.app = functions.https.onRequest(
  { timeoutSeconds: 120, memory: '512MiB' },
  expressApp,
);

exports.newLead = functions.https.onRequest(inboundGSQ);

exports.updatePolicyStatus = onSchedule(
  {
    schedule: '0 * * * *',
    timeZone: 'America/Los_Angeles',
  },
  updatePolicyStatus,
);
