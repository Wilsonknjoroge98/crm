const dayjs = require('dayjs');

function buildPolicySlackPayload({
  agentName,
  product,
  annualPremium,
  carrier,
  effectiveDate,
}) {
  const eft = effectiveDate || dayjs().format('MM/DD');
  const ap = `$${Number(annualPremium).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

  return {
    text: `New Policy - ${agentName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'New Policy Sold',
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Agent*\n${agentName}` },
          { type: 'mrkdwn', text: `*Product*\n${product}` },
          { type: 'mrkdwn', text: `*Carrier*\n${carrier}` },
          { type: 'mrkdwn', text: `*Annual Premium*\n${ap}` },
          { type: 'mrkdwn', text: `*Effective Date*\n${eft}` },
        ],
      },
      {
        type: 'divider',
      },
    ],
  };
}

module.exports = { buildPolicySlackPayload };
