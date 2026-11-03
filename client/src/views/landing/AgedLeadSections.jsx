// AgedLeadSections.jsx
// Landing-page sections below the hero, built from the 2026 GetSeniorQuotes
// aged-lead performance rollup. Every figure here comes from that rollup;
// update METHODOLOGY alongside any number you change.
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';

const INK = '#050A30';
const BLUE = '#233DFF';
const BLUE_HOVER = '#1A30D9';
const INK_RULE = '#1B2150';
const INK_MUTED = '#9AA3C7';
const SLATE_NAVY = '#2F4E6F';
const SLATE_BODY = '#334155';
const SLATE_MUTED = '#64748B';
const SLATE_REFERENCE = '#94A3B8';
const HAIRLINE = '#E2E8F0';
const SURFACE = '#F8FAFC';
const NEUTRAL = '#F1F5F9';
const GREEN = '#2E6B4F';
const GREEN_ON_INK = '#86D3A8';

const SERIF = '"Libre Baskerville", Georgia, serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

const CAPSULE = '999px';
const CARD = '8px';
const KEY = '4px';

const eyebrowSx = {
  fontFamily: MONO,
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

// ---------------------------------------------------------------------------
// Rollup data
// ---------------------------------------------------------------------------

const HEADLINE_STATS = [
  {
    value: '$1,794',
    label: 'Average annual premium',
    note: 'Per aged-lead sale. Fresh-lead sales averaged $2,019.',
    currency: true,
  },
  {
    value: '$374–451',
    label: 'Lead cost per sale',
    note: 'Fresh Website leads: about $433 per sale on the same measure.',
  },
  {
    value: '4 days',
    label: 'Median time to sale',
    note: 'From delivery to policy. 89% of sales came within 30 days.',
  },
];

const COMPARISON = [
  {
    type: 'Second chance · verified',
    detail: '31–90 days old, phone verified',
    price: '$6',
    close: '1.33%',
    apPerSale: '$1,758',
    apPerLead: '$23.34',
    costPerSale: '~$451',
  },
  {
    type: 'Second chance · unverified',
    detail: '31–90 days old',
    price: '$4',
    close: '1.07%',
    apPerSale: '$1,905',
    apPerLead: '$20.41',
    costPerSale: '~$374',
  },
  {
    type: 'Fresh Website lead',
    detail: 'For reference, same measure',
    price: '$39',
    close: '9.0%',
    apPerSale: '$2,019',
    apPerLead: '$182',
    costPerSale: '~$433',
    reference: true,
  },
];

const COST_PER_SALE = [
  {
    label: '2nd chance · unverified',
    meta: '$4 / lead · 1.07% close',
    value: 374,
  },
  {
    label: 'Fresh Website lead',
    meta: '$39 / lead · 9.0% close',
    value: 433,
    reference: true,
  },
  {
    label: '2nd chance · verified',
    meta: '$6 / lead · 1.33% close',
    value: 451,
  },
];

const REASONS = [
  {
    stat: '$100',
    title: 'Buys 16–25 real leads',
    body: 'Judge GetSeniorQuotes lead quality on your own phones before you commit to $39 fresh leads.',
  },
  {
    stat: '89%',
    title: "They're still shopping",
    body: 'Leads are about six weeks old at resale. Half of aged-lead sales were written within 4 days of delivery, and 89% within 30 days.',
  },
  {
    stat: '2–3%',
    title: 'Strong agents close more',
    body: 'The top agents who worked 250+ aged leads closed 2.0%, 2.2% and 2.8%. Overall, about 1 in 75 verified second-chance leads became a policy.',
  },
  {
    stat: '56%',
    title: 'Agents come back for more',
    body: 'More than half of the agents who bought aged leads came back and bought again on a later day.',
  },
];

const LEAD_FIELDS = [
  '16 data fields',
  'DOB',
  'BMI',
  'Health',
  'Budget',
  'Plan',
  'Goal: Funeral · Legacy · Mortgage',
];
const LEAD_DELIVERY = [
  'CSV within minutes',
  'Filter by state',
  'No minimum order',
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

const METHODOLOGY =
  "GetSeniorQuotes Website leads created Apr 1–Sep 12, 2026 and resold as aged leads. A sale counts only when the agent who bought the aged lead wrote a policy for that person on or after delivery (matched by phone or email, policies logged through Oct 10, 2026). Close rates include agents who log their policies in the FEX Digital CRM; across every buyer, including agents who don't log sales, the rate was 1.16%. Past results don't guarantee future results. Prices are list prices and can change.";

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function Section({ eyebrow, title, intro, children, sx }) {
  return (
    <Box
      component='section'
      sx={{
        maxWidth: 1040,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        py: { xs: 5, md: 7 },
        ...sx,
      }}
    >
      <Box sx={{ ...eyebrowSx, color: SLATE_NAVY, mb: 1 }}>{eyebrow}</Box>
      <Box
        component='h2'
        sx={{
          m: 0,
          mb: intro ? 1.25 : 3,
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: { xs: '1.5rem', md: '1.875rem' },
          lineHeight: 1.25,
          color: INK,
        }}
      >
        {title}
      </Box>
      {intro && (
        <Box
          component='p'
          sx={{
            m: 0,
            mb: 3,
            color: SLATE_BODY,
            fontSize: '1rem',
            lineHeight: 1.6,
          }}
        >
          {intro}
        </Box>
      )}
      {children}
    </Box>
  );
}

function Caption({ children }) {
  return (
    <Box
      component='p'
      sx={{
        m: 0,
        mt: 1.5,
        fontSize: '0.8125rem',
        color: SLATE_MUTED,
        lineHeight: 1.6,
      }}
    >
      {children}
    </Box>
  );
}

function Chip({ children }) {
  return (
    <Box
      component='span'
      sx={{
        ...eyebrowSx,
        fontSize: '0.65rem',
        letterSpacing: '0.5px',
        color: SLATE_BODY,
        bgcolor: NEUTRAL,
        border: `1px solid ${HAIRLINE}`,
        borderRadius: CAPSULE,
        px: 1.25,
        py: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function StatsBand() {
  return (
    <Box
      component='section'
      aria-label='Aged lead results'
      sx={{ bgcolor: INK, color: '#FFFFFF' }}
    >
      <Box
        sx={{
          maxWidth: 1040,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          py: { xs: 5, md: 7 },
        }}
      >
        <Box sx={{ ...eyebrowSx, color: INK_MUTED, mb: 1 }}>
          GetSeniorQuotes aged lead performance · 2026
        </Box>
        <Box
          component='h2'
          sx={{
            m: 0,
            mb: 1.5,
            maxWidth: 760,
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: { xs: '1.625rem', md: '2.25rem' },
            lineHeight: 1.2,
          }}
        >
          Aged leads: the low-cost way to test GetSeniorQuotes leads
        </Box>
        <Box
          component='p'
          sx={{
            m: 0,
            mb: 4,
            maxWidth: 680,
            color: INK_MUTED,
            fontSize: '1rem',
            lineHeight: 1.6,
          }}
        >
          Second-chance leads are real GetSeniorQuotes Website leads, 31–90 days
          old, at $4–$6 each. When agents close them, the policies are nearly as
          big as fresh-lead policies, and the lead cost per sale lands in the
          same range.
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            borderTop: `1px solid ${INK_RULE}`,
          }}
        >
          {HEADLINE_STATS.map((s, i) => (
            <Box
              key={s.label}
              sx={{
                pt: 3,
                pb: { xs: 3, md: 0 },
                pl: { xs: 0, md: i === 0 ? 0 : 3 },
                pr: { md: 3 },
                borderLeft: { md: i === 0 ? 'none' : `1px solid ${INK_RULE}` },
                borderBottom: {
                  xs:
                    i < HEADLINE_STATS.length - 1
                      ? `1px solid ${INK_RULE}`
                      : 'none',
                  md: 'none',
                },
              }}
            >
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: { xs: '2rem', md: '2.25rem' },
                  fontWeight: 500,
                  lineHeight: 1.1,
                  color: s.currency ? GREEN_ON_INK : '#FFFFFF',
                  mb: 1.25,
                }}
              >
                {s.value}
              </Box>
              <Box sx={{ ...eyebrowSx, color: INK_MUTED, mb: 0.75 }}>
                {s.label}
              </Box>
              <Box
                sx={{ fontSize: '0.875rem', color: '#D5D9EC', lineHeight: 1.5 }}
              >
                {s.note}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

const cellSx = {
  px: 1.5,
  py: 1.75,
  borderBottom: `1px solid ${HAIRLINE}`,
  fontFamily: MONO,
  fontSize: '0.875rem',
  textAlign: 'right',
  whiteSpace: 'nowrap',
};

function ComparisonTable() {
  const headers = [
    'Lead type',
    'Price',
    'Close rate',
    'Avg AP per sale',
    'AP per lead',
    'Lead cost per sale',
  ];
  return (
    <Section
      eyebrow='The numbers'
      title='How second-chance leads compare with fresh leads'
    >
      <Box
        sx={{
          overflowX: 'auto',
          borderTop: `2px solid ${INK}`,
          borderBottom: `2px solid ${INK}`,
        }}
      >
        <Box
          component='table'
          sx={{ width: '100%', minWidth: 720, borderCollapse: 'collapse' }}
        >
          <Box component='thead'>
            <Box component='tr' sx={{ bgcolor: NEUTRAL }}>
              {headers.map((h, i) => (
                <Box
                  component='th'
                  key={h}
                  scope='col'
                  sx={{
                    ...eyebrowSx,
                    fontSize: '0.65rem',
                    color: SLATE_NAVY,
                    px: 1.5,
                    py: 1.5,
                    textAlign: i === 0 ? 'left' : 'right',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component='tbody'>
            {COMPARISON.map((row) => {
              const muted = row.reference
                ? { color: SLATE_MUTED }
                : { color: INK };
              const money = row.reference
                ? { color: SLATE_MUTED }
                : { color: GREEN };
              return (
                <Box component='tr' key={row.type}>
                  <Box
                    component='th'
                    scope='row'
                    sx={{ ...cellSx, textAlign: 'left', fontFamily: 'inherit' }}
                  >
                    <Box
                      sx={{
                        fontWeight: 600,
                        color: INK,
                        fontSize: '0.9375rem',
                      }}
                    >
                      {row.type}
                    </Box>
                    <Box
                      sx={{
                        fontWeight: 400,
                        color: SLATE_MUTED,
                        fontSize: '0.8125rem',
                      }}
                    >
                      {row.detail}
                    </Box>
                  </Box>
                  <Box component='td' sx={{ ...cellSx, ...muted }}>
                    {row.price}
                  </Box>
                  <Box component='td' sx={{ ...cellSx, ...muted }}>
                    {row.close}
                  </Box>
                  <Box component='td' sx={{ ...cellSx, ...money }}>
                    {row.apPerSale}
                  </Box>
                  <Box component='td' sx={{ ...cellSx, ...money }}>
                    {row.apPerLead}
                  </Box>
                  <Box
                    component='td'
                    sx={{ ...cellSx, ...muted, fontWeight: 700 }}
                  >
                    {row.costPerSale}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      <Caption>
        AP = annual premium. Lead cost per sale = lead price ÷ close rate. Every
        $6 verified lead has returned about $23 in annual premium (3.9×), and
        every $4 unverified lead about $20 (5.1×).
      </Caption>
    </Section>
  );
}

function CostPerSaleChart() {
  // Bars start at $0; the axis max leaves room for the direct labels.
  const max = 500;
  return (
    <Section
      eyebrow='Lead cost per sale'
      title='A sale costs about the same, but you start for far less'
      sx={{ pt: { xs: 0, md: 0 } }}
    >
      <Box
        role='img'
        aria-label='Lead cost per sale: second chance unverified $374, fresh Website lead $433, second chance verified $451.'
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        {COST_PER_SALE.map((bar) => (
          <Box
            key={bar.label}
            title={`${bar.label}: $${bar.value} per sale (${bar.meta})`}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
              alignItems: 'center',
              gap: { xs: 0.75, sm: 2 },
              py: 0.5,
              borderRadius: KEY,
              '&:hover .bar-fill': { opacity: 0.85 },
            }}
          >
            <Box>
              <Box sx={{ fontWeight: 600, fontSize: '0.9375rem', color: INK }}>
                {bar.label}
              </Box>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.75rem',
                  color: SLATE_MUTED,
                }}
              >
                {bar.meta}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                borderLeft: `1px solid ${HAIRLINE}`,
              }}
            >
              <Box
                className='bar-fill'
                sx={{
                  height: 24,
                  width: `${(bar.value / max) * 85}%`,
                  bgcolor: bar.reference ? SLATE_REFERENCE : BLUE,
                  borderRadius: `0 ${KEY} ${KEY} 0`,
                  transition: 'opacity 0.15s',
                }}
              />
              <Box
                sx={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  color: INK,
                }}
              >
                ${bar.value}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
      <Caption>
        Lead cost per policy written. Bars start at $0. Your results depend on
        your states, products and follow-up speed.
      </Caption>
    </Section>
  );
}

function Reasons() {
  return (
    <Box
      sx={{
        bgcolor: SURFACE,
        borderTop: `1px solid ${HAIRLINE}`,
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      <Section
        eyebrow='Why agents start with aged leads'
        title='Real demand, at a test-sized price'
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {REASONS.map((r) => (
            <Box
              key={r.title}
              sx={{
                bgcolor: '#FFFFFF',
                border: `1px solid ${HAIRLINE}`,
                borderTop: `3px solid ${BLUE}`,
                borderRadius: CARD,
                p: 3,
              }}
            >
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: '1.75rem',
                  fontWeight: 500,
                  color: INK,
                  mb: 1,
                }}
              >
                {r.stat}
              </Box>
              <Box
                sx={{ fontWeight: 700, fontSize: '1rem', color: INK, mb: 0.75 }}
              >
                {r.title}
              </Box>
              <Box
                sx={{ fontSize: '0.9rem', color: SLATE_BODY, lineHeight: 1.6 }}
              >
                {r.body}
              </Box>
            </Box>
          ))}
        </Box>
      </Section>
    </Box>
  );
}

function LeadRecord() {
  return (
    <Section
      eyebrow="What's in every lead"
      title='The full Website lead record, not a name and number'
      intro='Someone aged 50–89 compared life insurance quotes on GetSeniorQuotes.com and asked to be contacted.'
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        {LEAD_FIELDS.map((f) => (
          <Chip key={f}>{f}</Chip>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {LEAD_DELIVERY.map((f) => (
          <Chip key={f}>{f}</Chip>
        ))}
      </Box>
    </Section>
  );
}

function LeadAging() {
  return (
    <Section
      eyebrow='How a lead ages'
      title="Labeled, limited, and retired once it's marked sold"
      sx={{ pt: { xs: 0, md: 0 } }}
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

function GettingStarted() {
  return (
    <Section
      eyebrow='Getting started'
      title='Three steps to your first aged order'
      sx={{ pt: { xs: 0, md: 0 } }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 5,
        }}
      >
        {STEPS.map((s) => (
          <Box key={s.n}>
            <Box
              sx={{
                fontFamily: MONO,
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: BLUE,
                mb: 1,
              }}
            >
              {s.n}
            </Box>
            <Box
              sx={{ fontWeight: 700, fontSize: '1rem', color: INK, mb: 0.75 }}
            >
              {s.title}
            </Box>
            <Box
              sx={{ fontSize: '0.9rem', color: SLATE_BODY, lineHeight: 1.6 }}
            >
              {s.body}
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          bgcolor: INK,
          borderRadius: CARD,
          px: { xs: 3, md: 4 },
          py: { xs: 3, md: 3.5 },
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2.5,
        }}
      >
        <Box>
          <Box
            component='h3'
            sx={{
              m: 0,
              mb: 0.75,
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: '1.375rem',
              color: '#FFFFFF',
            }}
          >
            Test GetSeniorQuotes leads for $100.
          </Box>
          <Box sx={{ fontSize: '0.9rem', color: INK_MUTED }}>
            Order aged leads in the marketplace, or email us for help getting
            set up.
          </Box>
        </Box>
        <Box
          component={RouterLink}
          to='/login'
          sx={{
            flexShrink: 0,
            bgcolor: BLUE,
            border: `1px solid ${BLUE}`,
            color: '#FFFFFF',
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9375rem',
            px: 3,
            py: 1.5,
            borderRadius: KEY,
            transition: 'background-color 0.15s',
            '&:hover': { bgcolor: BLUE_HOVER, borderColor: BLUE_HOVER },
            '&:focus-visible': {
              outline: '2px solid #FFFFFF',
              outlineOffset: 2,
            },
          }}
        >
          Order aged leads
        </Box>
      </Box>

      <Box
        component='p'
        sx={{
          m: 0,
          mt: 3,
          pt: 2,
          borderTop: `1px solid ${HAIRLINE}`,
          fontSize: '0.75rem',
          color: SLATE_MUTED,
          lineHeight: 1.6,
        }}
      >
        <Box component='strong' sx={{ color: SLATE_BODY }}>
          How we measured it.
        </Box>{' '}
        {METHODOLOGY}
      </Box>
    </Section>
  );
}

export default function AgedLeadSections() {
  return (
    <>
      <StatsBand />
      <ComparisonTable />
      <CostPerSaleChart />
      <Reasons />
      <LeadRecord />
      <LeadAging />
      <GettingStarted />
    </>
  );
}
