// FreshLeadSections.jsx
// Landing-page sections for the flagship fresh-lead products (Website leads,
// Instant Form leads, live transfers), built from the 2026
// fresh-lead pitch sheet. Every figure here comes from that sheet; update
// METHODOLOGY alongside any number you change.
import Box from '@mui/material/Box';
import {
  BLUE,
  CARD,
  ComparisonTable,
  CostPerSaleChart,
  GettingStarted,
  HAIRLINE,
  INK,
  MONO,
  SLATE_BODY,
  SLATE_MUTED,
  Section,
  StatCards,
  StatsBand,
} from './blocks';
import SampleLeadSection from './SampleLead';

const HEADLINE_STATS = [
  {
    value: '11.2%',
    label: 'Website lead close rate',
    note: 'About 1 sale for every 9 leads.',
  },
  {
    value: '$2,023',
    label: 'Average annual premium',
    note: 'Per Website-lead sale. Live-transfer sales averaged $2,215.',
    currency: true,
  },
  {
    value: '1 in 5',
    label: 'Live transfers closed',
    note: '20.6% of transfers became a sale, half within about a day.',
  },
];

const COMPARISON = [
  {
    type: 'Website lead',
    detail: 'Standard pack',
    price: '$39',
    close: '11.2%',
    apPerSale: '$2,023',
    apPerLead: '$226',
    costPerSale: '~$349',
  },
  {
    type: 'Live transfer',
    detail: 'Inbound call, connected live to you',
    price: '$60',
    close: '20.6%',
    apPerSale: '$2,215',
    apPerLead: '$456',
    costPerSale: '~$291',
  },
  {
    type: 'Instant Form lead',
    detail: 'Facebook / Instagram · new Sep 2026',
    price: '$25',
    pending: 'Too new to report. Sales are still coming in.',
  },
];

const COST_PER_SALE = [
  { label: 'Live transfer', meta: '$60 / call · 20.6% close', value: 291 },
  {
    label: 'Website lead · standard pack',
    meta: '$39 / lead · 11.2% close',
    value: 349,
  },
];

const PRODUCTS = [
  {
    price: '$39',
    name: 'Website leads',
    points: [
      'Compared life insurance quotes online and asked to be contacted',
      '16-field record: DOB, health, BMI, budget, plan, goal',
      'Verified leads arrive in real time. Unverified leads go out hourly',
    ],
  },
  {
    price: '$25',
    name: 'Instant Form leads',
    points: [
      'Filled out a short form inside Facebook or Instagram',
      'Identity comes from their Meta profile',
      'Name, phone, email and state, plus form answers like age, coverage and tobacco',
    ],
  },
  {
    price: '$60',
    name: 'Live transfers',
    points: [
      'An interested shopper calls in and is connected to you live',
      'Only calls connected for more than 90 seconds count',
      'If they call back, they ring you first, at no extra charge',
    ],
  },
];

const REASONS = [
  {
    stat: '4 days',
    title: 'Median time to sale',
    body: 'Half of Website-lead sales were made within 4 days, and more than 6 in 10 within a week.',
  },
  {
    stat: '30 days',
    title: 'One agent per lead',
    body: "A phone number can't be issued to another agent for 30 days, from the website or an Instant Form.",
  },
  {
    stat: '14–17%',
    title: 'Strong agents close more',
    body: 'Among agents with 200+ Website leads, the top quarter closed 14%+ and the best 16.7%.',
  },
  {
    stat: '32 min',
    title: 'Transfers are real conversations',
    body: 'The median counted transfer lasted 32 minutes: time to quote and apply.',
  },
];

const LEAD_CHIPS = [
  [
    'Age 50–89',
    'DOB',
    'BMI',
    'Health',
    'Budget',
    'Plan',
    'Goal: Funeral · Legacy · Mortgage',
  ],
  ['Text verified: Yes / No', 'Text alert + CRM push', 'Filter by state'],
];

const STEPS = [
  {
    n: '01',
    title: 'Set your states',
    body: "Leads and transfers only come from states where you're licensed.",
  },
  {
    n: '02',
    title: 'Choose your mix',
    body: 'Website, Instant Form, live transfers, or all three.',
  },
  {
    n: '03',
    title: 'Switch on and call fast',
    body: 'Leads hit your phone and CRM in real time. Track cost per sale, then scale what works.',
  },
];

const CTA = {
  title: 'Put fresh leads from interested shoppers on your phone today.',
  body: 'Order in the marketplace, or email us for help getting set up.',
  label: 'Order fresh leads',
  to: '/login',
};

const METHODOLOGY =
  "Website leads issued Apr 1–Aug 31, 2026 and live transfers connected for more than 90 seconds Jun 1–Sep 19, 2026. A sale counts only when the agent who received the lead or call wrote a policy for that person on or after delivery or recorded the sale against that lead (FEX Digital CRM and lead records, sales logged through Oct 10, 2026), for agents who mark sales in the CRM (a client upload or a policy). Unverified leads that were refunded or flagged as disconnected numbers are left out of the count. Premium comes from the client record or policy; time to sale runs to the first upload or policy. Instant Form leads (launched Sep 21, 2026) are left out until sales mature. Past results don't guarantee future results. Prices are list prices and can change.";

function ProductCards() {
  return (
    <Section
      eyebrow='Three ways to buy fresh'
      title='Pick the lead that fits how you sell'
      flushTop
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {PRODUCTS.map((p) => (
          <Box
            key={p.name}
            sx={{
              border: `1px solid ${HAIRLINE}`,
              borderTop: `3px solid ${INK}`,
              borderRadius: CARD,
              p: 3,
              bgcolor: '#FFFFFF',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 1,
                mb: 1,
              }}
            >
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: '1.75rem',
                  fontWeight: 500,
                  color: INK,
                }}
              >
                {p.price}
              </Box>
              {p.priceNote && (
                <Box
                  sx={{
                    fontFamily: MONO,
                    fontSize: '0.75rem',
                    color: SLATE_MUTED,
                  }}
                >
                  · {p.priceNote}
                </Box>
              )}
            </Box>
            <Box
              sx={{
                fontWeight: 700,
                fontSize: '1.0625rem',
                color: INK,
                mb: 1.25,
              }}
            >
              {p.name}
            </Box>
            <Box
              component='ul'
              sx={{
                m: 0,
                p: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              {p.points.map((pt) => (
                <Box
                  component='li'
                  key={pt}
                  sx={{
                    position: 'relative',
                    pl: 2,
                    fontSize: '0.875rem',
                    color: SLATE_BODY,
                    lineHeight: 1.55,
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: '0.6em',
                      width: 6,
                      height: 6,
                      borderRadius: '999px',
                      bgcolor: BLUE,
                    },
                  }}
                >
                  {pt}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

export default function FreshLeadSections() {
  return (
    <>
      <StatsBand
        id='fresh-leads'
        eyebrow='Fresh lead performance · 2026'
        title='Fresh leads: interested shoppers in real time, issued to one agent'
        intro='Interested shoppers who asked about life insurance minutes ago, delivered to a single agent. Agents who work them close sales averaging over $2,000 in annual premium.'
        stats={HEADLINE_STATS}
      />
      <ComparisonTable
        title='How our fresh leads perform'
        rows={COMPARISON}
        caption='AP = annual premium. Lead cost per sale = lead price ÷ close rate. Every $39 Website lead has returned about $226 in annual premium (5.8×), and every $60 live transfer about $456 (7.6×).'
      />
      <CostPerSaleChart
        title='Every fresh product pays back many times over'
        bars={COST_PER_SALE}
        caption='Lead cost per sale. Bars start at $0. Your results depend on your states, products and follow-up speed.'
      />
      <ProductCards />
      <StatCards
        eyebrow='Why agents buy fresh'
        title='Speed and ownership win the sale'
        cards={REASONS}
      />
      <SampleLeadSection
        eyebrow="What's in every Website lead"
        title='A full quote record, not a name and number'
        intro='The shopper compared live rates, picked a plan and told us why. You get all of it.'
        chipRows={LEAD_CHIPS}
      />
      <GettingStarted
        title='Three steps to live lead flow'
        steps={STEPS}
        cta={CTA}
        methodology={METHODOLOGY}
      />
    </>
  );
}
