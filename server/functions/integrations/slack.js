const dayjs = require('dayjs');

function buildPolicySlackPayload({
  agentName,
  product,
  annualPremium,
  carrier,
  effectiveDate,
}) {
  return {
    text: 'New Sale!',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `
Agent: ${agentName}
Product: ${product}
Carrier: ${carrier}
AP: $${Number(annualPremium).toLocaleString()}
EFT: ${effectiveDate || dayjs().format('MM/DD')}
          `.trim(),
        },
      },
      {
        type: 'divider',
      },
    ],
  };
}

module.exports = { buildPolicySlackPayload };
