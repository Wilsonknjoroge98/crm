// AgedLeadSections.jsx
// Landing-page sections for aged (second- and third-chance) leads, built from
// the 2026 aged-lead performance rollup. Every figure here
// comes from that rollup; update METHODOLOGY alongside any number you change.
import Box from '@mui/material/Box';
import {
  BLUE,
  ChipSection,
  ComparisonTable,
  CostPerSaleChart,
  GettingStarted,
  HAIRLINE,
  INK,
  MONO,
  SLATE_BODY,
  SLATE_MUTED,
  SLATE_REFERENCE,
  Section,
  StatCards,
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
    note: 'Fresh Website leads: about $349 per sale on the same measure.',
  },
  {
    value: '4 days',
    label: 'Median time to sale',
    note: 'From delivery to sale. 90% of sales came within 30 days.',
  },
];

const COMPARISON = [
  {
    type: 'Second chance · verified',
    detail: '31–90 days old, phone verified',
    price: '$6',
    close: '1.63%',
    apPerSale: '$1,758',
    apPerLead: '$28.66',
    costPerSale: '~$368',
  },
  {
    type: 'Second chance · unverified',
    detail: '31–90 days old',
    price: '$4',
    close: '1.31%',
    apPerSale: '$1,905',
    apPerLead: '$24.96',
    costPerSale: '~$305',
  },
  {
    type: 'Fresh Website lead',
    detail: 'For reference, same measure',
    price: '$39',
    close: '11.2%',
    apPerSale: '$2,023',
    apPerLead: '$226',
    costPerSale: '~$349',
    reference: true,
  },
];

const COST_PER_SALE = [
  {
    label: '2nd chance · unverified',
    meta: '$4 / lead · 1.31% close',
    value: 305,
  },
  {
    label: 'Fresh Website lead',
    meta: '$39 / lead · 11.2% close',
    value: 349,
    reference: true,
  },
  {
    label: '2nd chance · verified',
    meta: '$6 / lead · 1.63% close',
    value: 368,
  },
];

const REASONS = [
  {
    stat: '$100',
    title: 'Buys 16–25 real leads',
    body: 'Judge our lead quality on your own phones before you commit to $39 fresh leads.',
  },
  {
    stat: '90%',
    title: "They're still shopping",
    body: 'Leads are about six weeks old at resale. Half of aged-lead sales were made within 4 days of delivery, and 90% within 30 days.',
  },
  {
    stat: '2–3%',
    title: 'Strong agents close more',
    body: 'The top agents who worked 250+ aged leads closed 2.0%, 2.3% and 2.8%. Overall, about 1 in 61 verified second-chance leads became a sale.',
  },
  {
    stat: '56%',
    title: 'Agents come back for more',
    body: 'More than half of the agents who bought aged leads came back and bought again on a later day.',
  },
];

const LEAD_CHIPS = [
  [
    '16 data fields',
    'DOB',
    'BMI',
    'Health',
    'Budget',
    'Plan',
    'Goal: Funeral · Legacy · Mortgage',
  ],
  ['CSV within minutes', 'Filter by state', 'No minimum order'],
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
    body: "If it isn't marked sold, it can be sold one more time.",
    rule: BLUE,
  },
  {
    window: 'Day 91–180',
    stage: 'Third chance',
    price: '$3 verified · $1.50',
    body: 'Sold once more as a final sale. Best for dialer volume.',
    rule: SLATE_REFERENCE,
  },
  {
    window: 'After',
    stage: 'Retired',
    price: null,
    body: 'Never sold again. A lead marked sold leaves the market for good.',
    rule: HAIRLINE,
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Pick your states',
    body: 'The marketplace shows aged inventory state by state.',
  },
  {
    n: '02',
    title: 'Order a test batch',
    body: 'Start with $100 of second-chance leads, verified or unverified.',
  },
  {
    n: '03',
    title: 'Call fast, then scale',
    body: 'Most aged sales come in the first few days. Track your cost per sale, then move up to fresh leads.',
  },
];

const CTA = {
  title: 'Test leads from interested shoppers for $100.',
  body: 'Order aged leads in the marketplace, or email us for help getting set up.',
  label: 'Order aged leads',
  to: '/login',
};

const METHODOLOGY =
  "Website leads created Apr 1–Sep 12, 2026 and resold as aged leads. A sale counts only when the agent who bought the aged lead marked that person sold or wrote a policy for them on or after delivery (matched by phone or email, sales logged through Oct 10, 2026). Close rates cover agents who mark sales in the FEX Digital CRM (a client upload or a policy). Unverified leads that were refunded or flagged as disconnected numbers are left out of the count. Premium comes from the client record or policy; time to sale runs to the first upload or policy. Past results don't guarantee future results. Prices are list prices and can change.";

function LeadAging() {
  return (
    <Section
      eyebrow='How a lead ages'
      title="Labeled, limited, and retired once it's marked sold"
      flushTop
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
          gap: { xs: 3, md: 0 },
        }}
      >
        {AGING.map((a) => (
          <Box
            component='li'
            key={a.stage}
            sx={{ borderTop: `3px solid ${a.rule}`, pt: 2, pr: { md: 2.5 } }}
          >
            <Box
              sx={{
                fontFamily: MONO,
                fontSize: '0.75rem',
                color: SLATE_MUTED,
                mb: 0.75,
              }}
            >
              {a.window}
            </Box>
            <Box
              sx={{ fontWeight: 700, fontSize: '1rem', color: INK, mb: 0.5 }}
            >
              {a.stage}
            </Box>
            <Box
              sx={{
                fontFamily: MONO,
                fontSize: '0.875rem',
                color: INK,
                minHeight: '1.4em',
                mb: 1,
              }}
            >
              {a.price}
            </Box>
            <Box
              sx={{ fontSize: '0.875rem', color: SLATE_BODY, lineHeight: 1.6 }}
            >
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
        title='Aged leads: the low-cost way to test leads from interested shoppers'
        intro='Second-chance leads are real Website leads from interested shoppers, 31–90 days old, at $4–$6 each. When agents close them, the policies are nearly as big as fresh-lead policies, and the lead cost per sale lands in the same range.'
        stats={HEADLINE_STATS}
      />
      <ComparisonTable
        title='How second-chance leads compare with fresh leads'
        rows={COMPARISON}
        caption='AP = annual premium. Lead cost per sale = lead price ÷ close rate. Every $6 verified lead has returned about $29 in annual premium (4.8×), and every $4 unverified lead about $25 (6.2×).'
      />
      <CostPerSaleChart
        title='A sale costs about the same, but you start for far less'
        bars={COST_PER_SALE}
        caption='Lead cost per sale. Bars start at $0. Your results depend on your states, products and follow-up speed.'
      />
      <StatCards
        eyebrow='Why agents start with aged leads'
        title='Real demand, at a test-sized price'
        cards={REASONS}
      />
      <ChipSection
        eyebrow="What's in every lead"
        title='The full Website lead record, not a name and number'
        intro='An interested shopper compared life insurance quotes online and asked to be contacted.'
        chipRows={LEAD_CHIPS}
      />
      <LeadAging />
      <GettingStarted
        title='Three steps to your first aged order'
        steps={STEPS}
        cta={CTA}
        methodology={METHODOLOGY}
      />
    </>
  );
}
