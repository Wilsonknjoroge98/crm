// SampleLead.jsx
// "Where your leads come from": the quotes a shopper compares on
// GetSeniorQuotes (with the one they pick), then chips naming the fields
// that come with the lead. The lead record itself is shown on the hero's
// phone.
import Box from '@mui/material/Box';
import {
  CARD,
  Chip,
  HAIRLINE,
  INK,
  KEY,
  MONO,
  NEUTRAL,
  SLATE_MUTED,
  Section,
  WHITE,
} from './blocks';

const labelSx = {
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
};

// A small caption with a rule running out to the right.
function StepLabel({ children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
      <Box sx={{ ...labelSx, fontSize: '0.75rem', color: SLATE_MUTED }}>
        {children}
      </Box>
      <Box sx={{ flex: 1, height: '1px', bgcolor: HAIRLINE }} />
    </Box>
  );
}

// The rates a shopper compares on GetSeniorQuotes, laid out like its result
// cards (carrier, AM Best rating, monthly premium, plan, the "See If You
// Qualify" button). The middle one is the plan on the hero's sample lead.
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
    <Box>
      <StepLabel>What the lead sees on our site</StepLabel>
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

export default function SampleLeadSection({ eyebrow, title, intro, chipRows }) {
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro}>
      <QuoteResults />
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
