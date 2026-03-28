const agentRouter = require('./agents.js');
const policyRouter = require('./policies');
const leadRouter = require('./leads');
const clientRouter = require('./clients');
const teamLeaderboardRouter = require('./team_leaderboard');
const summaryRouter = require('./summary');
const hierarchyRouter = require('./hierarchy');
const publicRouter = require('./public');
const inviteRouter = require('./invites');
const leadVendorsRouter = require('./lead_vendors');
const carriersRouter = require('./carriers');
const eventsRouter = require('./events');
const expensesRouter = require('./expenses');
module.exports = {
  agentRouter,
  policyRouter,
  leadRouter,
  clientRouter,
  teamLeaderboardRouter,
  summaryRouter,
  hierarchyRouter,
  publicRouter,
  inviteRouter,
  leadVendorsRouter,
  carriersRouter,
  eventsRouter,
  expensesRouter,
};
