// ProducerPage.jsx
// "They meet you before you call": the page a shopper lands on right after
// confirming their number on GetSeniorQuotes. It shows the agent the lead was
// issued to (photo, name, bio, reviews) with a Call Now button, and is the
// same card that is pinned to the top of the quotes if they come back. The
// mock-up follows gsq's thank-you page (ThankYou.tsx / AgentCard.tsx); an
// agent gets one once they add a photo in the CRM.
import Box from '@mui/material/Box';
import {
  ACCENT,
  CAPSULE,
  GREEN,
  GREEN_BORDER,
  GREEN_TINT,
  HAIRLINE,
  INK,
  INK_BODY,
  INK_MUTED,
  INK_RULE,
  KEY,
  NEUTRAL,
  ON_INK,
  SERIF,
  SLATE_BODY,
  SLATE_MUTED,
  Section,
  WHITE,
  eyebrowSx,
} from './blocks';

const POINTS = [
  'Your photo, name, bio and Google reviews',
  'A Call Now button that rings your phone',
  'Pinned to the top if they come back for more quotes',
];

function Check() {
  return (
    <Box
      component='svg'
      viewBox='0 0 24 24'
      aria-hidden='true'
      sx={{
        width: 18,
        height: 18,
        flexShrink: 0,
        mt: '3px',
        fill: 'none',
        stroke: ACCENT,
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }}
    >
      <path d='M5 12.5l4.5 4.5L19 7.5' />
    </Box>
  );
}

function PhoneGlyph() {
  return (
    <Box
      component='svg'
      viewBox='0 0 24 24'
      sx={{ width: 14, height: 14, fill: 'currentColor' }}
    >
      <path d='M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z' />
    </Box>
  );
}

// The shopper's thank-you page, at a glance.
function PageMock() {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 420,
        bgcolor: WHITE,
        border: `1px solid ${HAIRLINE}`,
        borderRadius: '10px',
        p: { xs: 2, sm: 3 },
        textAlign: 'center',
      }}
    >
      <Box
        component='span'
        sx={{
          display: 'inline-block',
          px: 1.25,
          py: '3px',
          borderRadius: CAPSULE,
          border: `1px solid ${GREEN_BORDER}`,
          bgcolor: GREEN_TINT,
          color: GREEN,
          fontSize: '0.65rem',
          fontWeight: 700,
        }}
      >
        ✓ Request Received
      </Box>
      <Box
        sx={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: '1.25rem',
          color: INK,
          mt: 1,
        }}
      >
        You’re All Set!
      </Box>
      <Box sx={{ fontSize: '0.75rem', color: SLATE_MUTED, mt: 0.5, mb: 2 }}>
        Meet your dedicated licensed advisor.
      </Box>

      {/* The agent card */}
      <Box
        sx={{
          bgcolor: INK,
          borderRadius: '8px',
          p: 2,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 84px',
          gap: 2,
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        <Box>
          <Box
            component='span'
            sx={{
              display: 'inline-block',
              px: 1,
              py: '2px',
              borderRadius: CAPSULE,
              border: `1px solid ${INK_RULE}`,
              color: INK_BODY,
              fontSize: '0.625rem',
              fontWeight: 600,
            }}
          >
            Licensed in Ohio
          </Box>
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: '1.25rem',
              lineHeight: 1.2,
              color: ON_INK,
              mt: 1,
            }}
          >
            Your Name
          </Box>
          <Box
            sx={{
              fontSize: '0.75rem',
              lineHeight: 1.5,
              color: INK_MUTED,
              mt: 0.5,
            }}
          >
            12 years helping families find coverage that fits their budget.
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              mt: 1.5,
              px: 1.75,
              py: 0.75,
              borderRadius: KEY,
              bgcolor: WHITE,
              color: INK,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            <PhoneGlyph />
            Call Now
          </Box>
        </Box>

        {/* Where the agent's headshot goes. */}
        <Box
          sx={{
            aspectRatio: '4 / 5',
            borderRadius: '8px',
            border: `1px solid ${INK_RULE}`,
            color: INK_MUTED,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            fontSize: '0.6rem',
            fontWeight: 600,
          }}
        >
          <Box
            component='svg'
            viewBox='0 0 24 24'
            sx={{
              width: 30,
              height: 30,
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: 1.5,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
            }}
          >
            <circle cx='12' cy='8' r='4' />
            <path d='M4 21a8 8 0 0 1 16 0' />
          </Box>
          Your photo
        </Box>
      </Box>
    </Box>
  );
}

export default function ProducerPage() {
  return (
    <Section
      eyebrow='Your producer page'
      title='Your lead meets you before the call'
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          alignItems: 'center',
          gap: { xs: 3, md: 8 },
        }}
      >
        <Box>
          <Box
            component='p'
            sx={{
              m: 0,
              mb: 3,
              fontSize: { xs: '1rem', md: '1.0625rem' },
              lineHeight: 1.65,
              color: SLATE_BODY,
            }}
          >
            The moment they confirm their number, they land on a page about you.
            So when your call comes in, they already know who it is.
          </Box>
          <Box
            component='ul'
            sx={{
              listStyle: 'none',
              m: 0,
              p: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.75,
            }}
          >
            {POINTS.map((point) => (
              <Box
                component='li'
                key={point}
                sx={{
                  display: 'flex',
                  gap: 1.25,
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  color: INK,
                  fontWeight: 600,
                }}
              >
                <Check />
                {point}
              </Box>
            ))}
          </Box>
          <Box sx={{ ...eyebrowSx, color: SLATE_MUTED, mt: 4 }}>
            Add your photo in the CRM to switch it on
          </Box>
        </Box>

        {/* Decorative: the copy beside it says the same thing. */}
        <Box
          aria-hidden='true'
          sx={{
            bgcolor: NEUTRAL,
            borderRadius: '10px',
            p: { xs: 2, md: 5 },
            minHeight: { md: 360 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PageMock />
        </Box>
      </Box>
    </Section>
  );
}
