const agentRouter = require('./agents.js');
const policyRouter = require('./policies');
const leadRouter = require('./leads');
const clientRouter = require('./clients');
const downlineProductionRouter = require('./downline_production');
const summaryRouter = require('./summary');
const hierarchyRouter = require('./hierarchy');
const publicRouter = require('./public');
const inviteRouter = require('./invites');
const leadVendorsRouter = require('./lead_vendors');
const carriersRouter = require('./carriers');
module.exports = {
    agentRouter,
    policyRouter,
    leadRouter,
    clientRouter,
    downlineProductionRouter,
    summaryRouter,
    hierarchyRouter,
    publicRouter,
    inviteRouter,
    leadVendorsRouter,
    carriersRouter,
};

