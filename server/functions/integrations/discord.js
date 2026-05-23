const axios = require('axios');
const dayjs = require('dayjs');

function buildPolicyDiscordPayload({
  agentName,
  product,
  annualPremium,
  carrier,
  effectiveDate,
}) {
  const ap = `$${Number(annualPremium).toLocaleString()}`;
  const eft = effectiveDate || dayjs().format('MM/DD');

  return {
    content: `${agentName} - AP: ${ap}`,
    embeds: [
      {
        title: 'New Policy',
        description: [
          `**Agent:** ${agentName}`,
          `**Product:** ${product}`,
          `**Carrier:** ${carrier}`,
          `**AP:** ${ap}`,
          `**EFT:** ${eft}`,
        ].join('\n'),
      },
    ],
  };
}

async function sendDiscordNotification(
  payload,
  webhookUrl = process.env.DISCORD_WEBHOOK_URL,
) {
  if (!webhookUrl) return;
  await axios.post(webhookUrl, payload);
}

function buildLeaderboardDiscordPayload(startDate, endDate, lines) {
  const dateRange = `${dayjs(startDate).format('MMM DD')} - ${dayjs(endDate).format('MMM DD')}`;
  return {
    content: `Weekly Sales Results: ${dateRange}`,
    embeds: [
      {
        title: `WEEKLY RESULTS - ${dateRange}`,
        description: lines.join('\n'),
      },
    ],
  };
}

function buildDailyLeaderboardDiscordPayload(date, lines) {
  const label = dayjs(date).format('MMM DD');
  return {
    content: `Daily Sales Results: ${label}`,
    embeds: [
      {
        title: `DAILY RESULTS - ${label}`,
        description: lines.join('\n'),
      },
    ],
  };
}

module.exports = {
  buildPolicyDiscordPayload,
  buildLeaderboardDiscordPayload,
  buildDailyLeaderboardDiscordPayload,
  sendDiscordNotification,
};
