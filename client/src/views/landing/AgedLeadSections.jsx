// AgedLeadSections.jsx
// Landing-page sections for aged (second- and third-chance) leads, built from
// the 2026 aged-lead performance rollup. Every figure here comes from that
// rollup; update AGED_METHODOLOGY alongside any number you change. The
// chapter opens with how a lead ages, since that is what an aged lead is.
import Box from '@mui/material/Box';
import {
  ACCENT,
  CostPerSaleChart,
  HAIRLINE,
  INK,
  MONO,
  SERIF,
  SLATE_BODY,
  SLATE_MUTED,
  SLATE_REFERENCE,
  Section,
  StatsBand,
} from './blocks';

const HEADLINE_STATS = [
  {
    value: '$1,809',
    label: 'Average annual premium',
    note: 'Per aged-lead sale. Fresh-lead sales averaged $2,023.',
    currency: true,
  },
  {
    value: '$305–368',
    label: 'Lead cost per sale',
    note: 'About the same as fresh Website leads ($349). The top agents with 250+ aged leads closed 2–3%.',
  },
  {
    value: '4 days',
    label: 'Median time to sale',
    note: 'From delivery to sale. 90% of sales came within 30 days.',
  },
];

const COST_PER_SALE = [
  {
    label: '2nd chance · unverified',
    meta: '$4 / lead · 1.31% close',
    value: 305,
    premium: 1905,
  },
  {
    label: 'Fresh Website lead',
    meta: '$39 / lead · 11.2% close',
    value: 349,
    premium: 2023,
    reference: true,
  },
  {
    label: '2nd chance · verified',
    meta: '$6 / lead · 1.63% close',
    value: 368,
    premium: 1758,
  },
];

const AGING = [
  {
    window: 'Day 0–30',
    stage: 'Fresh',
    price: '$39',
    body: "Issued to one agent. The number can't be issued to anyone else for 30 days.",
    rule: INK,
  },
  {
    window: 'Day 31–90',
    stage: 'Second chance',
    price: '$6 verified · $4',
    body: "If it isn't marked sold.",
    rule: ACCENT,
  },
  {
    window: 'Day 91–180',
    stage: 'Third chance',
    price: '$3 verified · $1.50',
    body: 'Sold once more as a final sale.',
    rule: SLATE_REFERENCE,
  },
  {
    window: 'After',
    stage: 'Retired',
    price: null,
    body: 'A lead marked sold leaves the market for good.',
    rule: HAIRLINE,
  },
];

export const AGED_METHODOLOGY =
  "Website leads created Apr 1–Sep 12, 2026 and resold as aged leads. A sale counts only when the agent who bought the aged lead marked that person sold or wrote a policy for them on or after delivery (matched by phone or email, sales logged through Oct 10, 2026). Close rates cover agents who mark sales in the FEX Digital CRM (a client upload or a policy). Unverified leads that were refunded or flagged as disconnected numbers are left out of the count. Premium comes from the client record or policy; time to sale runs to the first upload or policy. Past results don't guarantee future results. Prices are list prices and can change.";

function LeadAging() {
  return (
    <Section
      eyebrow='How a lead ages'
      title="Labeled, limited, and retired once it's marked sold"
    >
      <Box
        component='ol'
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 4,
        }}
      >
        {AGING.map((a) => (
          <Box
            component='li'
            key={a.stage}
            sx={{ borderTop: `3px solid ${a.rule}`, pt: 3 }}
          >
            <Box
              sx={{
                fontFamily: MONO,
                fontSize: '0.8125rem',
                color: SLATE_MUTED,
                mb: 1.5,
              }}
            >
              {a.window}
            </Box>
            <Box
              sx={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: '1.25rem',
                lineHeight: 1.3,
                color: INK,
                mb: 0.75,
              }}
            >
              {a.stage}
            </Box>
            <Box
              sx={{
                fontFamily: MONO,
                fontSize: '1rem',
                color: INK,
                minHeight: '1.5em',
                mb: 2,
              }}
            >
              {a.price}
            </Box>
            <Box sx={{ fontSize: '1rem', color: SLATE_BODY, lineHeight: 1.65 }}>
              {a.body}
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

export default function AgedLeadSections() {
  return (
    <>
      <StatsBand
        id='aged-leads'
        eyebrow='Aged lead performance · 2026'
        title='Same shoppers. A fraction of the price.'
        intro='Real Website leads, 31 to 180 days old, for $1.50 to $6 each. The cheapest way to test our leads.'
        stats={HEADLINE_STATS}
      />
      <LeadAging />
      <CostPerSaleChart
        title='A sale costs about the same, but you start for far less'
        bars={COST_PER_SALE}
        caption='Lead cost per sale = lead price ÷ close rate. Your results depend on your states, products and follow-up speed.'
      />
    </>
  );
}
