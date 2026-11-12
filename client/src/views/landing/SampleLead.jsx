// SampleLead.jsx
// "Where your leads come from": the quotes a shopper compares on
// GetSeniorQuotes (with the one they pick), then the sample lead record that
// pick becomes, the steps in between, and the field chips. Lives below the
// fold; the hero only shows the lead arriving on a phone.
import Box from '@mui/material/Box';
import {
  ACCENT,
  ACCENT_BORDER,
  ACCENT_TINT,
  CAPSULE,
  CARD,
  Chip,
  GREEN,
  GREEN_BORDER,
  GREEN_TINT,
  HAIRLINE,
  HAIRLINE_STRONG,
  INK,
  KEY,
  MONO,
  NEUTRAL,
  SLATE_BODY,
  SLATE_MUTED,
  SURFACE,
  Section,
  WHITE,
} from './blocks';

const labelSx = {
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
};

const pillTone = {
  neutral: { bgcolor: NEUTRAL, color: SLATE_BODY, borderColor: HAIRLINE },
  verified: { bgcolor: GREEN_TINT, color: GREEN, borderColor: GREEN_BORDER },
  blue: { bgcolor: ACCENT_TINT, color: ACCENT, borderColor: ACCENT_BORDER },
};

function Pill({ tone = 'neutral', children }) {
  return (
    <Box
      component='span'
      sx={{
        ...labelSx,
        letterSpacing: '0.4px',
        px: 1,
        py: '2px',
        borderRadius: CAPSULE,
        lineHeight: 1.4,
        border: '1px solid',
        whiteSpace: 'nowrap',
        ...pillTone[tone],
      }}
    >
      {children}
    </Box>
  );
}

const SPECS = [
  { label: 'Age / State', value: '67 · Ohio' },
  { label: 'Plan picked', value: 'Whole life · $25,000' },
  { label: 'Quoted premium', value: '$68/mo', money: true },
  { label: 'Carrier', value: 'A-rated carrier' },
  { label: 'Reason', value: 'Leave a Legacy' },
  { label: 'Health / Tobacco', value: 'Good · Non-smoker' },
];

const STEPS = [
  { tag: 'Shopped', desc: 'Compared live rates from real carriers' },
  { tag: 'Chose', desc: 'Picked a plan and a premium' },
  { tag: 'Verified', desc: 'Confirmed their phone with a text code' },
  { tag: 'Yours', desc: 'Sent only to you, by text and to your CRM' },
];

// Diameter of a stepper node, in px.
const NODE = 28;

// "1 · What the lead sees" / "2 · What lands in your CRM": the two halves of the
// lead's trip from the quote page to the agent.
function StepLabel({ n, children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <Box
        sx={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: CAPSULE,
          bgcolor: INK,
          color: WHITE,
          fontFamily: MONO,
          fontSize: '0.8125rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {n}
      </Box>
      <Box sx={{ ...labelSx, fontSize: '0.75rem', color: SLATE_MUTED }}>
        {children}
      </Box>
      <Box sx={{ flex: 1, height: '1px', bgcolor: HAIRLINE }} />
    </Box>
  );
}

// The rates a shopper compares on GetSeniorQuotes, laid out like its result
// cards (carrier, AM Best rating, monthly premium, plan, the "See If You
// Qualify" button). The middle one is the plan in the sample record below.
const QUOTES = [
  { rating: 'A', premium: '$64' },
  { rating: 'A+', premium: '$68', picked: true },
  { rating: 'A', premium: '$73' },
];

// Hand cursor, pressing the picked quote's button.
function PointerCursor() {
  return (
    <Box
      component='svg'
      viewBox='0 0 24 24'
      sx={{
        position: 'absolute',
        right: { xs: 10, sm: 22 },
        bottom: -14,
        width: 34,
        height: 34,
        fill: WHITE,
        stroke: INK,
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }}
    >
      <path d='M9 11.5V4.5a1.75 1.75 0 0 1 3.5 0V10l5.2.9a2.5 2.5 0 0 1 2.05 2.8l-.6 4.3A4.5 4.5 0 0 1 14.7 22H12a5 5 0 0 1-3.9-1.9l-3.7-4.6a1.6 1.6 0 0 1 2.3-2.2L9 15.2z' />
    </Box>
  );
}

function QuoteResults() {
  return (
    <Box sx={{ mb: { xs: 5, md: 8 } }}>
      <StepLabel n='1'>What the lead sees on our site</StepLabel>
      <Box
        aria-hidden='true'
        sx={{
          bgcolor: NEUTRAL,
          borderRadius: '10px',
          p: { xs: 1.5, sm: 3, md: 5 },
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: { xs: 1, sm: 2, md: 3 },
          alignItems: 'center',
        }}
      >
        {QUOTES.map((quote) => (
          <Box
            key={quote.premium}
            sx={{
              position: 'relative',
              bgcolor: WHITE,
              border: `1px solid ${quote.picked ? INK : HAIRLINE}`,
              borderRadius: CARD,
              p: { xs: 1.25, sm: 2.5, md: 3.5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              // The other two sit back, so the eye lands on the picked plan.
              opacity: quote.picked ? 1 : 0.7,
            }}
          >
            {/* Stands in for the carrier's logo. */}
            <Box
              sx={{
                width: { xs: 36, sm: 56 },
                height: { xs: 36, sm: 56 },
                borderRadius: KEY,
                bgcolor: NEUTRAL,
                mb: 1.5,
              }}
            />
            <Box
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.75rem', sm: '1rem' },
                color: INK,
              }}
            >
              A-rated carrier
            </Box>
            <Box
              sx={{
                fontSize: { xs: '0.65rem', sm: '0.8125rem' },
                color: SLATE_MUTED,
              }}
            >
              AM Best Rating: {quote.rating}
            </Box>
            <Box
              sx={{
                width: '100%',
                borderTop: `1px solid ${HAIRLINE}`,
                mt: { xs: 1.25, md: 2 },
                pt: { xs: 1.25, md: 2 },
              }}
            >
              <Box
                sx={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: { xs: '0.9375rem', sm: '1.5rem' },
                  color: INK,
                }}
              >
                {quote.premium}
                <Box
                  component='span'
                  sx={{
                    fontSize: '0.7em',
                    fontWeight: 500,
                    color: SLATE_MUTED,
                  }}
                >
                  {' '}
                  / month
                </Box>
              </Box>
              <Box
                sx={{
                  fontSize: { xs: '0.65rem', sm: '0.8125rem' },
                  color: SLATE_MUTED,
                }}
              >
                Whole life · $25,000
              </Box>
            </Box>
            <Box
              sx={{
                width: '100%',
                mt: { xs: 1.5, md: 2.5 },
                py: { xs: 0.75, sm: 1.25 },
                borderRadius: KEY,
                border: `1px solid ${INK}`,
                bgcolor: quote.picked ? INK : WHITE,
                color: quote.picked ? WHITE : INK,
                fontSize: { xs: '0.625rem', sm: '0.875rem' },
                fontWeight: 600,
              }}
            >
              See If You Qualify
            </Box>
            {quote.picked && <PointerCursor />}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function SampleLeadCard() {
  return (
    <Box
      sx={{
        border: `1px solid ${HAIRLINE}`,
        borderRadius: CARD,
        bgcolor: WHITE,
        p: { xs: 2, sm: 3, md: 5 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          pb: 3,
          mb: 3,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Pill>Website lead · Fresh</Pill>
            <Pill tone='verified'>✓ Verified phone</Pill>
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box
              component='span'
              sx={{ fontSize: '1.5rem', fontWeight: 800, color: INK }}
            >
              Margaret H.
            </Box>
            <Box
              component='span'
              sx={{
                fontFamily: MONO,
                fontSize: '1rem',
                color: SLATE_MUTED,
              }}
            >
              (614) 555-0142
            </Box>
          </Box>
        </Box>
        <Pill tone='blue'>16 fields included</Pill>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: { xs: 1.25, md: 2 },
          mb: { xs: 3, md: 5 },
        }}
      >
        {SPECS.map((spec) => (
          <Box
            key={spec.label}
            sx={{
              bgcolor: SURFACE,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: KEY,
              p: { xs: 1.5, md: 2.5 },
            }}
          >
            <Box sx={{ ...labelSx, color: SLATE_MUTED, mb: 0.75 }}>
              {spec.label}
            </Box>
            <Box
              sx={{
                fontSize: '1.0625rem',
                fontWeight: 700,
                color: spec.money ? GREEN : INK,
                fontFamily: spec.money ? MONO : 'inherit',
              }}
            >
              {spec.value}
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ ...labelSx, color: SLATE_MUTED, mb: 2.5 }}>
        How they got to you
      </Box>
      {/* A stepper: four nodes on one line on desktop, stacked down a rail
          on phones. The last step, where the lead becomes yours, is filled. */}
      <Box
        component='ol'
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
        }}
      >
        {STEPS.map((row, i) => {
          const last = i === STEPS.length - 1;
          return (
            <Box
              component='li'
              key={row.tag}
              sx={{
                position: 'relative',
                display: { xs: 'grid', md: 'block' },
                gridTemplateColumns: `${NODE}px minmax(0, 1fr)`,
                columnGap: 2,
                pb: { xs: last ? 0 : 3, md: 0 },
                pr: { md: 3 },
                // The rail from this node to the next one.
                '&::before': last
                  ? undefined
                  : {
                      content: '""',
                      position: 'absolute',
                      bgcolor: HAIRLINE_STRONG,
                      left: { xs: NODE / 2 - 1, md: NODE + 10 },
                      top: { xs: NODE + 6, md: NODE / 2 - 1 },
                      bottom: { xs: 6, md: 'auto' },
                      right: { xs: 'auto', md: 10 },
                      width: { xs: 2, md: 'auto' },
                      height: { xs: 'auto', md: 2 },
                    },
              }}
            >
              <Box
                aria-hidden='true'
                sx={{
                  width: NODE,
                  height: NODE,
                  borderRadius: CAPSULE,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${last ? INK : ACCENT_BORDER}`,
                  bgcolor: last ? INK : ACCENT_TINT,
                  color: last ? WHITE : ACCENT,
                  mb: { md: 2 },
                }}
              >
                <Box
                  component='svg'
                  viewBox='0 0 24 24'
                  sx={{
                    width: 16,
                    height: 16,
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 2.5,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  }}
                >
                  <path d='M5 12.5l4.5 4.5L19 7.5' />
                </Box>
              </Box>
              <Box>
                <Box
                  sx={{
                    fontWeight: 700,
                    fontSize: '1rem',
                    lineHeight: `${NODE}px`,
                    color: INK,
                    mb: { xs: 0, md: 0.25 },
                  }}
                >
                  {row.tag}
                </Box>
                <Box
                  sx={{
                    fontSize: '0.9375rem',
                    lineHeight: 1.55,
                    color: SLATE_BODY,
                  }}
                >
                  {row.desc}
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default function SampleLeadSection({ eyebrow, title, intro, chipRows }) {
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro}>
      <QuoteResults />
      <StepLabel n='2'>What lands in your CRM</StepLabel>
      <SampleLeadCard />
      {chipRows?.length > 0 && (
        <Box
          sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 1.25 }}
        >
          {chipRows.map((row) => (
            <Box
              key={row.join('|')}
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
            >
              {row.map((c) => (
                <Chip key={c}>{c}</Chip>
              ))}
            </Box>
          ))}
        </Box>
      )}
    </Section>
  );
}
