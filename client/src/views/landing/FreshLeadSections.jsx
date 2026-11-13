// FreshLeadSections.jsx
// The fresh-lead chapter (Website leads, Instant Form leads, live transfers):
// the headline figures with the cost-per-sale chart directly under them,
// built from the 2026 fresh-lead pitch sheet. Every figure here comes from
// that sheet; update FRESH_METHODOLOGY alongside any number you change.
import { CostPerSaleChart, StatsBand } from './blocks';

const HEADLINE_STATS = [
  {
    value: '11.2%',
    label: 'Website lead close rate',
    note: 'About 1 sale for every 9 leads. Among agents with 200+ leads, the top quarter closed 14–17%.',
  },
  {
    value: '$2,023',
    label: 'Average annual premium',
    note: 'Per Website-lead sale. Live-transfer sales averaged $2,215.',
    currency: true,
  },
  {
    value: '1 in 3',
    label: 'Live transfers closed',
    note: '35.9% of transfers became a sale, half within about a day.',
  },
];

// The two Website-lead figures above, multiplied out for one order:
// 100 leads x 11.2% x $2,023 = $22,658.
const PER_100_LEADS = {
  lead: 'What that means for 100 Website leads:',
  text: 'an 11.2% close rate at a $2,023 average premium is about $22,600 in annual premium written. That is premium, not your commission. Based on Website leads issued Apr 1–Aug 31, 2026.',
};

const COST_PER_SALE = [
  {
    label: 'Live transfer',
    meta: '$60 / call · 35.9% close',
    value: 167,
    premium: 2215,
  },
  {
    label: 'Website lead',
    meta: '$39 / lead · 11.2% close',
    value: 349,
    premium: 2023,
  },
];

export const FRESH_METHODOLOGY =
  "Website leads issued Apr 1–Aug 31, 2026 and live transfers connected for more than 90 seconds Jun 1–Sep 19, 2026. A sale counts only when the agent who received the lead or call wrote a policy for that person on or after delivery or recorded the sale against that lead (FEX Digital CRM and lead records, sales logged through Oct 10, 2026), for agents who mark sales in the CRM (a client upload or a policy). Unverified leads that were refunded or flagged as disconnected numbers are left out of the count. Premium comes from the client record or policy; time to sale runs to the first upload or policy. Instant Form leads (launched Sep 21, 2026) are left out until sales mature. Past results don't guarantee future results. Prices are list prices and can change.";

export default function FreshLeadSections() {
  return (
    <>
      <StatsBand
        id='fresh-leads'
        eyebrow='Fresh lead performance · 2026'
        title='Asked minutes ago. Sent only to you.'
        intro="A shopper picks a plan and asks for a call. You're the only agent who hears about it."
        stats={HEADLINE_STATS}
        footnote={PER_100_LEADS}
      />
      <CostPerSaleChart
        title='Every fresh product pays back many times over'
        bars={COST_PER_SALE}
        caption='Lead cost per sale = lead price ÷ close rate. Your results depend on your states, products and follow-up speed.'
      />
    </>
  );
}
