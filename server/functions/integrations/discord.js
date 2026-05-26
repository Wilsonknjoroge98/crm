const axios = require('axios');
const dayjs = require('dayjs');
const logger = require('firebase-functions/logger');

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
  webhookUrl = process.env.DISCORD_SALE_WEBHOOK_URL,
) {
  try {
    if (!webhookUrl) {
      logger.warn('Discord webhook URL not set — skipping notification', {
        route: 'sendDiscordNotification',
      });
      return;
    }
    const res = await axios.post(webhookUrl, payload);
    logger.log('Sent Discord notification', {
      route: 'sendDiscordNotification',
      status: res.status,
      data: payload,
    });
  } catch (error) {
    logger.error('Error sending Discord notification', {
      route: 'sendDiscordNotification',
      error: error.response?.data || error.message,
      data: payload,
    });
  }
}

function buildLeaderboardDiscordPayload(startDate, endDate, lines) {
  const dateRange = `${dayjs(startDate).format('MMM DD')} - ${dayjs(endDate).format('MMM DD')}`;
  return {
    content: `Weekly Results: ${dateRange}`,
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
    content: `Daily Results: ${label}`,
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
