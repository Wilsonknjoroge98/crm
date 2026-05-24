const dayjs = require('dayjs');
// const { WebClient } = require('@slack/web-api');
const { supabaseService } = require('../services/supabase');
const {
  buildLeaderboardDiscordPayload,
  buildDailyLeaderboardDiscordPayload,
  sendDiscordNotification,
} = require('../integrations/discord');

// const ORG_ID = '446316f9-021a-460a-9bac-f7116e1bfa62';
// const SLACK_CHANNEL = '#general';

async function buildLeaderboard(startDate, endDate) {
  const { data: agents, error: agentsError } = await supabaseService
    .from('agents')
    .select('id, first_name, last_name');

  if (agentsError) throw agentsError;
  if (!agents || agents.length === 0) return [];

  const agentIds = agents.map((a) => a.id);

  const { data: policies, error: policiesError } = await supabaseService
    .from('policies')
    .select('writing_agent_id, premium_amount, split_agent_id, split_agent_share')
    .in('writing_agent_id', agentIds)
    .gte('sold_date', startDate)
    .lte('sold_date', endDate);

  if (policiesError) throw policiesError;

  const agentMap = {};
  for (const agent of agents) {
    agentMap[agent.id] = {
      name: `${agent.first_name ?? ''} ${agent.last_name ?? ''}`.trim(),
      premiumAmount: 0,
    };
  }

  for (const policy of policies || []) {
    const writingAgentId = policy.writing_agent_id;
    if (!agentMap[writingAgentId]) continue;

    const annualPremium = Number(policy.premium_amount || 0) * 12;
    const splitShare = policy.split_agent_id ? Number(policy.split_agent_share || 0) : 0;
    const writingShare = 100 - splitShare;

    agentMap[writingAgentId].premiumAmount += annualPremium * (writingShare / 100);

    if (splitShare > 0 && policy.split_agent_id && agentMap[policy.split_agent_id]) {
      agentMap[policy.split_agent_id].premiumAmount += annualPremium * (splitShare / 100);
    }
  }

  return Object.values(agentMap)
    .filter((a) => a.premiumAmount > 0)
    .sort((a, b) => b.premiumAmount - a.premiumAmount);
}

const weeklyLeaderboard = async () => {
  const startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
  const endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const leaderboard = await buildLeaderboard(startDate, endDate);

  if (leaderboard.length === 0) return;

  const lines = leaderboard.map((agent, i) => {
    return `${i + 1}. ${agent.name} - $${agent.premiumAmount.toLocaleString()}`;
  });

  await Promise.all([
    sendDiscordNotification(
      buildLeaderboardDiscordPayload(startDate, endDate, lines),
      process.env.DISCORD_WEEKLY_LEADERBOARD_WEBHOOK_URL,
    ),
  ]);
};

const dailyLeaderboard = async () => {
  const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

  const leaderboard = await buildLeaderboard(yesterday, yesterday);

  if (leaderboard.length === 0) return;

  const lines = leaderboard.map((agent, i) => {
    return `${i + 1}. ${agent.name} - $${agent.premiumAmount.toLocaleString()}`;
  });

  await sendDiscordNotification(
    buildDailyLeaderboardDiscordPayload(yesterday, lines),
    process.env.DISCORD_DAILY_LEADERBOARD_WEBHOOK_URL,
  );
};

module.exports = { weeklyLeaderboard, dailyLeaderboard };
