// LeadRules.jsx
// "The rules behind every lead": how numbers are checked, how a bad number
// is replaced, and what the agent controls. It closes the page on its own
// tinted band, after both the fresh and aged chapters, because it covers
// both; a rule that only applies to fresh leads carries a `scope` label.
// (When a lead leaves the market is told by the aging timeline in the aged
// chapter, so it is only a line in the intro here.)
// One split row per rule: the words on one side, a small product mock-up on
// the other, sides alternating down the page.
// Each row describes behaviour that exists in gsq / the crm today (phone
// check before the text code, litigator screen on Website leads, the 7-day refund request on unverified fresh leads, the lead-flow
// switch and state picker in Profile). Change the copy when the rule changes.
import Box from '@mui/material/Box';
import {
  ACCENT,
  ACCENT_TINT,
  CAPSULE,
  ERROR,
  ERROR_BORDER,
  ERROR_TINT,
  GREEN,
  GREEN_BORDER,
  GREEN_TINT,
  HAIRLINE,
  INK,
  KEY,
  MONO,
  NEUTRAL,
  SERIF,
  SLATE_BODY,
  SLATE_MUTED,
  SLATE_REFERENCE,
  SURFACE,
  Section,
  WHITE,
  eyebrowSx,
} from './blocks';

const PHONE = '(614) 555-0142';

// ── Small pieces shared by the mock-ups ────────────────────────────────────

const mockLabelSx = {
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  color: SLATE_MUTED,
};

function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: { bgcolor: NEUTRAL, color: SLATE_BODY, borderColor: HAIRLINE },
    good: { bgcolor: GREEN_TINT, color: GREEN, borderColor: GREEN_BORDER },
    bad: { bgcolor: ERROR_TINT, color: ERROR, borderColor: ERROR_BORDER },
  };
  return (
    <Box
      component='span'
      sx={{
        fontSize: '0.65rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        lineHeight: 1.4,
        px: 1,
        py: '2px',
        borderRadius: CAPSULE,
        border: '1px solid',
        whiteSpace: 'nowrap',
        ...tones[tone],
      }}
    >
      {children}
    </Box>
  );
}

// The white card every mock-up sits on.
function MockCard({ children }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 360,
        bgcolor: WHITE,
        border: `1px solid ${HAIRLINE}`,
        borderRadius: '10px',
        p: 2.5,
        color: INK,
        fontSize: '0.875rem',
      }}
    >
      {children}
    </Box>
  );
}

function CheckLine({ children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: GREEN,
        fontWeight: 600,
        fontSize: '0.8125rem',
      }}
    >
      <Box component='span' aria-hidden='true'>
        ✓
      </Box>
      {children}
    </Box>
  );
}

// ── The four mock-ups ──────────────────────────────────────────────────────

function VerifiedMock() {
  return (
    <MockCard>
      <Box sx={mockLabelSx}>Enter the code we texted to</Box>
      <Box sx={{ fontFamily: MONO, fontWeight: 700, mt: 0.5, mb: 2 }}>
        {PHONE}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
        {['4', '8', '1', '9', '0', '2'].map((digit, i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              aspectRatio: '1 / 1.15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${GREEN_BORDER}`,
              bgcolor: GREEN_TINT,
              borderRadius: KEY,
              fontFamily: MONO,
              fontSize: '1.125rem',
              fontWeight: 700,
            }}
          >
            {digit}
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <CheckLine>Working cell phone</CheckLine>
        <CheckLine>Code entered by the shopper</CheckLine>
      </Box>
    </MockCard>
  );
}

const SCREENED_NUMBERS = [
  { phone: '(614) 555-0142', ok: true },
  { phone: '(216) 555-0178', ok: true },
  { phone: '(330) 555-0116', ok: false },
];

function ScreenedMock() {
  return (
    <MockCard>
      <Box sx={{ ...mockLabelSx, mb: 1 }}>Litigator check</Box>
      {SCREENED_NUMBERS.map((row, i) => (
        <Box
          key={row.phone}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1.5,
            py: 1.25,
            borderTop: i === 0 ? 'none' : `1px solid ${HAIRLINE}`,
          }}
        >
          <Box
            sx={{
              fontFamily: MONO,
              fontWeight: 600,
              color: row.ok ? INK : SLATE_REFERENCE,
              textDecoration: row.ok ? 'none' : 'line-through',
            }}
          >
            {row.phone}
          </Box>
          <Pill tone={row.ok ? 'good' : 'bad'}>
            {row.ok ? '✓ Clear' : 'Blocked'}
          </Pill>
        </Box>
      ))}
    </MockCard>
  );
}

function ReplacedMock() {
  return (
    <MockCard>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Box>
          <Box sx={{ fontWeight: 800, fontSize: '1rem' }}>Robert K.</Box>
          <Box sx={{ color: SLATE_MUTED }}>Number disconnected</Box>
        </Box>
        <Pill>Unverified</Pill>
      </Box>
      <Box
        sx={{
          py: 1,
          textAlign: 'center',
          border: `1px solid ${INK}`,
          borderRadius: KEY,
          fontWeight: 700,
          fontSize: '0.8125rem',
          mb: 2,
        }}
      >
        Request refund
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          pt: 2,
          borderTop: `1px solid ${HAIRLINE}`,
        }}
      >
        <CheckLine>Approved</CheckLine>
        <Box sx={{ fontFamily: MONO, fontWeight: 700, color: GREEN }}>
          +1 lead
        </Box>
      </Box>
    </MockCard>
  );
}

function ControlMock() {
  return (
    <MockCard>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          pb: 2,
          mb: 2,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <Box>
          <Box sx={{ fontWeight: 700 }}>Lead flow</Box>
          <Box sx={{ color: GREEN, fontWeight: 600, fontSize: '0.8125rem' }}>
            Active
          </Box>
        </Box>
        {/* Switch, on */}
        <Box
          sx={{
            width: 44,
            height: 26,
            p: '3px',
            bgcolor: ACCENT,
            borderRadius: CAPSULE,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Box
            sx={{
              width: 20,
              height: 20,
              bgcolor: WHITE,
              borderRadius: CAPSULE,
            }}
          />
        </Box>
      </Box>
      <Box sx={{ ...mockLabelSx, mb: 1 }}>Licensed states</Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
        {['OH', 'TX', 'FL', 'AZ'].map((state) => (
          <Box
            key={state}
            sx={{
              px: 1.25,
              py: 0.5,
              bgcolor: ACCENT_TINT,
              color: ACCENT,
              borderRadius: CAPSULE,
              fontFamily: MONO,
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {state}
          </Box>
        ))}
        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            border: `1px dashed ${SLATE_REFERENCE}`,
            color: SLATE_MUTED,
            borderRadius: CAPSULE,
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          + Add
        </Box>
      </Box>
    </MockCard>
  );
}

// ── Icons (24px line icons, drawn in the current colour) ───────────────────

const ICONS = {
  phone: (
    <>
      <rect x='7' y='2.5' width='10' height='19' rx='2.5' />
      <path d='M10.5 18.5h3' />
    </>
  ),
  shield: (
    <>
      <path d='M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6l8-3z' />
      <path d='M8.5 12l2.5 2.5 4.5-5' />
    </>
  ),
  swap: (
    <>
      <path d='M4 8h14l-3.5-3.5' />
      <path d='M20 16H6l3.5 3.5' />
    </>
  ),
  sliders: (
    <>
      <path d='M4 7h10M18 7h2M4 17h2M10 17h10' />
      <circle cx='16' cy='7' r='2' />
      <circle cx='8' cy='17' r='2' />
    </>
  ),
};

function Icon({ name }) {
  return (
    <Box
      aria-hidden='true'
      sx={{
        width: 44,
        height: 44,
        mb: 2,
        borderRadius: '8px',
        bgcolor: ACCENT_TINT,
        color: ACCENT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        component='svg'
        viewBox='0 0 24 24'
        sx={{
          width: 22,
          height: 22,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.75,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }}
      >
        {ICONS[name]}
      </Box>
    </Box>
  );
}

const RULES = [
  {
    tag: 'Verified',
    icon: 'phone',
    title: 'Verified means a real cell phone that answered a text',
    body: "Before we send the code, we check that the number is a working cell phone. Landlines and dead numbers don't get one.",
    Mock: VerifiedMock,
  },
  {
    tag: 'Screened',
    icon: 'shield',
    title: 'We screen out the people who sue agents',
    body: 'Every Website lead number is checked against a list of known TCPA litigators. A match is blocked before it ever reaches you.',
    Mock: ScreenedMock,
  },
  {
    tag: 'Replaced',
    scope: 'Fresh leads only',
    icon: 'swap',
    title: 'Bad number? Ask for a replacement',
    body: 'Flag an unverified fresh lead from its card within 7 days. Approved requests put a replacement lead back in your account.',
    Mock: ReplacedMock,
  },
  {
    tag: 'Your call',
    scope: 'Fresh leads only',
    icon: 'sliders',
    title: 'Pause lead flow at any time.',
    body: 'Switch lead flow off and back on from your profile, and update your licensed states yourself.',
    Mock: ControlMock,
  },
];

export default function LeadRules() {
  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: SURFACE,
        borderTop: `1px solid ${HAIRLINE}`,
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      <Section
        id='rules'
        eyebrow='The rules behind every lead'
        title='Clean numbers, and you stay in control'
        intro='A lead you mark sold is never sold again. Here is the rest of the fine print.'
      >
        <Box
          component='ul'
          sx={{
            listStyle: 'none',
            m: 0,
            p: 0,
            pt: { xs: 1, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 6, md: 9 },
          }}
        >
          {RULES.map(({ tag, scope, icon, title, body, Mock }, i) => (
            <Box
              component='li'
              key={tag}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                alignItems: 'center',
                gap: { xs: 3, md: 8 },
              }}
            >
              <Box>
                <Icon name={icon} />
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Box sx={{ ...eyebrowSx, color: ACCENT }}>{tag}</Box>
                  {scope && <Pill>{scope}</Pill>}
                </Box>
                <Box
                  component='h3'
                  sx={{
                    m: 0,
                    mb: 1.5,
                    fontFamily: SERIF,
                    fontWeight: 700,
                    fontSize: { xs: '1.25rem', md: '1.5rem' },
                    lineHeight: 1.3,
                    color: INK,
                  }}
                >
                  {title}
                </Box>
                <Box
                  component='p'
                  sx={{
                    m: 0,
                    fontSize: '1rem',
                    lineHeight: 1.65,
                    color: SLATE_BODY,
                  }}
                >
                  {body}
                </Box>
              </Box>

              {/* Decorative: the copy beside it says the same thing. */}
              <Box
                aria-hidden='true'
                sx={{
                  // Alternate sides on desktop; always under the copy on phones.
                  order: { md: i % 2 === 1 ? -1 : 0 },
                  bgcolor: WHITE,
                  border: `1px solid ${HAIRLINE}`,
                  borderRadius: '10px',
                  minHeight: { md: 300 },
                  p: { xs: 2.5, md: 4 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Mock />
              </Box>
            </Box>
          ))}
        </Box>
      </Section>
    </Box>
  );
}
