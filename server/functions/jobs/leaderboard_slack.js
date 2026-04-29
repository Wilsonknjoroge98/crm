const dayjs = require('dayjs');
const { WebClient } = require('@slack/web-api');
const { supabaseService } = require('../services/supabase');

const ORG_ID = '446316f9-021a-460a-9bac-f7116e1bfa62';
const SLACK_CHANNEL = '#general';

async function buildLeaderboard(startDate, endDate) {
  const { data: agents, error: agentsError } = await supabaseService
    .from('agents')
    .select('id, first_name, last_name')
    .eq('org_id', ORG_ID);

  if (agentsError) throw agentsError;
  if (!agents || agents.length === 0) return [];

  const agentIds = agents.map((a) => a.id);

  const { data: policies, error: policiesError } = await supabaseService
    .from('policies')
    .select('writing_agent_id, premium_amount')
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
    const agentId = policy.writing_agent_id;
    if (!agentMap[agentId]) continue;
    agentMap[agentId].premiumAmount += Number(policy.premium_amount || 0) * 12;
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

  const header = `:clipboard: *WEEKLY RESULTS*\n${dayjs(startDate).format('MMM DD')} – ${dayjs(endDate).format('MMM DD')}`;
  const body = lines.join('\n');

  await new WebClient(process.env.SLACK_BOT_TOKEN_FEARLESS).chat.postMessage({
    channel: SLACK_CHANNEL,
    text: `Weekly Leaderboard Results: ${dayjs(startDate).format('MMM DD')} – ${dayjs(endDate).format('MMM DD')}`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `${header}\n\n${body}` },
      },
    ],
  });
};

module.exports = { weeklyLeaderboard };
