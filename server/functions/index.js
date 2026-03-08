const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/scheduler');

const { inboundLeadIntegration } = require('./integrations/GSQ');
const { updatePolicyStatus } = require('./jobs/update_policy_status');

const expressApp = require('./server.js');

exports.app = functions.https.onRequest(expressApp);
exports.inboundGSQLead = functions.https.onRequest(inboundLeadIntegration);

exports.updatePolicyStatus = onSchedule(
    {
        schedule: '0 * * * *',
        timeZone: 'America/Los_Angeles',
    },
    updatePolicyStatus,
);
