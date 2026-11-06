// Landing.jsx
// Public marketing page at "/". Logged-in agents are sent on to /business.
// Design System v2.0: flat surfaces (no shadows or gradients), 1px hairlines,
// 999px capsules, 8px cards, 4px inputs and keys, a serif title face, Inter
// for UI, JetBrains Mono for phone numbers and dollar figures.
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import AgedLeadSections from './landing/AgedLeadSections';
import FreshLeadSections from './landing/FreshLeadSections';

// Brand tokens. Ink and Blue lead the page; the rest support them.
const INK = '#050A30';
const BLUE = '#233DFF';
const BLUE_HOVER = '#1A30D9';
const INK_RULE = '#1B2150';
const INK_MUTED = '#9AA3C7';
const SLATE_BODY = '#334155';
const SLATE_MUTED = '#64748B';
const HAIRLINE = '#E2E8F0';
const SLATE_REFERENCE = '#94A3B8';
const HAIRLINE_STRONG = '#CBD5E1';
const NEUTRAL = '#F1F5F9';
const GREEN = '#2E6B4F';

const SERIF = '"Libre Baskerville", Georgia, serif';
const SANS = '"Inter", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

const BRAND = 'FEX Digital';

// Lead access isn't self-serve, so the email capture opens a request email.
const ACCESS_REQUEST_EMAIL = 'info@finalexpensedigital.com';
const CTA_LABEL = 'Request access';
const CAPTURE_ID = 'get-started';

const CAPSULE = '999px';
const CARD = '8px';
const KEY = '4px';

// Hero logo strip. Drop official logo files at these paths; until a file
// exists, the name renders as a plain wordmark in the same muted slate.
const STACK = [
  { name: 'HighLevel', src: '/integrations/gohighlevel.svg' },
  { name: 'Ringy', src: '/integrations/ringy.svg' },
  { name: 'Sendblue', src: '/integrations/sendblue.svg' },
  { name: 'CSV export' },
];

// Sample lead on the hero phone. The text matches the real agent alert
// format: "You have a new lead! {name} ({state}). Call now: {phone}".
const SAMPLE = {
  name: 'Margaret Hall',
  age: 67,
  state: 'OH',
  stateName: 'Ohio',
  phone: '(614) 555-0142',
};

const PHONE_LABEL = `Sample phone lock screen. A text reads: "You have a new lead! ${SAMPLE.name} (${SAMPLE.state}). Call now: ${SAMPLE.phone}." Below it, her lead details: whole life, $25,000 of coverage, $68 a month with an A-rated carrier, buying to leave a legacy, phone verified.`;

const card = {
  bgcolor: '#FFFFFF',
  color: INK,
  border: `1px solid ${HAIRLINE}`,
  borderRadius: '20px',
};

// Notification cards drop in once, then hold. Reduced motion skips it.
const dropIn = (delay) => ({
  animation: `fexDrop 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s both`,
});

function HeroPhone() {
  return (
    <Box
      sx={{
        width: '100%',
        alignSelf: 'end',
        display: 'flex',
        justifyContent: 'center',
        // The device bleeds off the bottom of the hero into the navy band.
        maxHeight: { xs: 470, md: 590 },
        overflow: 'hidden',
        '@keyframes fexDrop': {
          from: { opacity: 0, transform: 'translateY(-16px) scale(0.98)' },
          to: { opacity: 1, transform: 'none' },
        },
        '@media (prefers-reduced-motion: reduce)': {
          '& .fex-anim': { animation: 'none' },
        },
      }}
    >
      <Box
        role='img'
        aria-label={PHONE_LABEL}
        sx={{
          width: { xs: 280, md: 320 },
          aspectRatio: '9 / 19.5',
          flexShrink: 0,
          bgcolor: INK,
          borderRadius: '52px',
          p: '11px',
        }}
      >
        <Box
          aria-hidden='true'
          sx={{
            height: '100%',
            borderRadius: '42px',
            bgcolor: NEUTRAL,
            color: INK,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            px: 1.25,
            textAlign: 'left',
          }}
        >
          <Box
            sx={{
              width: 96,
              height: 28,
              mt: 1.25,
              bgcolor: '#000000',
              borderRadius: CAPSULE,
            }}
          />
          <Box
            sx={{
              mt: 2.5,
              fontSize: '0.9rem',
              fontWeight: 500,
              color: SLATE_BODY,
            }}
          >
            Thursday, November 5
          </Box>
          <Box
            sx={{
              fontSize: { xs: '4.25rem', md: '5rem' },
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-2px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            9:41
          </Box>

          <Box
            sx={{
              mt: 3,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {/* The text alert agents receive */}
            <Box
              className='fex-anim'
              sx={{
                ...card,
                ...dropIn(0.6),
                p: 1.5,
                display: 'flex',
                gap: 1.25,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  borderRadius: '9px',
                  bgcolor: INK,
                  color: '#FFFFFF',
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                FEX
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem',
                  }}
                >
                  <Box component='span' sx={{ fontWeight: 700 }}>
                    {BRAND}
                  </Box>
                  <Box component='span' sx={{ color: SLATE_MUTED }}>
                    now
                  </Box>
                </Box>
                <Box sx={{ fontSize: '0.8rem', lineHeight: 1.35 }}>
                  {`You have a new lead! ${SAMPLE.name} (${SAMPLE.state}). Call now: ${SAMPLE.phone}`}
                </Box>
              </Box>
            </Box>

            {/* What lands in the CRM at the same moment */}
            <Box
              className='fex-anim'
              sx={{ ...card, ...dropIn(1.5), p: 1.5, fontSize: '0.8rem' }}
            >
              <Box
                sx={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: SLATE_MUTED,
                  mb: 0.5,
                }}
              >
                Lead details · in your CRM
              </Box>
              <Box sx={{ fontSize: '0.95rem', fontWeight: 800 }}>
                {SAMPLE.name}, {SAMPLE.age} · {SAMPLE.stateName}
              </Box>
              <Box sx={{ fontWeight: 600, mt: 0.25 }}>
                Whole life · $25,000 ·{' '}
                <Box component='span' sx={{ fontFamily: MONO }}>
                  $68/mo
                </Box>
              </Box>
              <Box sx={{ color: SLATE_MUTED }}>A-rated carrier</Box>
              <Box
                sx={{
                  borderTop: `1px solid ${HAIRLINE}`,
                  mt: 1,
                  pt: 1,
                  lineHeight: 1.5,
                }}
              >
                <Box>
                  <Box component='span' sx={{ color: SLATE_MUTED }}>
                    Reason:
                  </Box>{' '}
                  Leave a Legacy
                </Box>
                <Box sx={{ color: GREEN, fontWeight: 600 }}>
                  ✓ Phone verified
                </Box>
              </Box>
              <Box
                sx={{
                  mt: 1.25,
                  py: 0.875,
                  borderRadius: CAPSULE,
                  bgcolor: BLUE,
                  color: '#FFFFFF',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.75,
                }}
              >
                <Box
                  component='svg'
                  viewBox='0 0 24 24'
                  sx={{ width: 15, height: 15, fill: '#FFFFFF' }}
                >
                  <path d='M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z' />
                </Box>
                Call now
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function CaptureForm() {
  const [email, setEmail] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Access request: ${BRAND} leads`);
    const body = encodeURIComponent(
      `Hi ${BRAND} team,\n\nI'd like to request access. You can reach me at ${email}.\n`,
    );
    window.location.href = `mailto:${ACCESS_REQUEST_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <Box
      component='form'
      id={CAPTURE_ID}
      onSubmit={onSubmit}
      sx={{ width: '100%', maxWidth: 520, mx: { xs: 'auto', md: 0 }, mb: 2.5 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'stretch',
          bgcolor: '#FFFFFF',
          border: `1px solid ${HAIRLINE_STRONG}`,
          borderRadius: CARD,
          height: { sm: 52 },
          p: '4px',
          gap: '4px',
          transition: 'border-color 0.15s',
          '&:focus-within': { borderColor: BLUE },
        }}
      >
        <Box
          component='label'
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: { xs: 1, sm: 0 },
          }}
        >
          <Box
            component='svg'
            viewBox='0 0 24 24'
            aria-hidden='true'
            sx={{
              width: 18,
              height: 18,
              mr: 1.25,
              flexShrink: 0,
              fill: 'none',
              stroke: SLATE_MUTED,
              strokeWidth: 2,
            }}
          >
            <path d='M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z' />
            <polyline points='22,6 12,13 2,6' />
          </Box>
          <Box
            component='input'
            type='email'
            required
            aria-label='Your email'
            placeholder='Your email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              width: '100%',
              border: 'none',
              outline: 'none',
              bgcolor: 'transparent',
              fontFamily: SANS,
              fontSize: '0.95rem',
              color: INK,
              '&::placeholder': { color: SLATE_MUTED, opacity: 1 },
            }}
          />
        </Box>
        <Box
          component='button'
          type='submit'
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            border: `1px solid ${BLUE}`,
            bgcolor: BLUE,
            color: '#FFFFFF',
            fontFamily: SANS,
            fontSize: '0.875rem',
            fontWeight: 700,
            px: 2.5,
            py: { xs: 1.5, sm: 0 },
            height: { sm: '100%' },
            borderRadius: KEY,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background-color 0.15s',
            '&:hover': { bgcolor: BLUE_HOVER, borderColor: BLUE_HOVER },
            '&:focus-visible': {
              outline: `2px solid ${INK}`,
              outlineOffset: 2,
            },
          }}
        >
          {CTA_LABEL}
          <Box
            component='svg'
            viewBox='0 0 24 24'
            aria-hidden='true'
            sx={{
              width: 14,
              height: 14,
              fill: 'none',
              stroke: '#FFFFFF',
              strokeWidth: 2.5,
            }}
          >
            <polyline points='9 18 15 12 9 6' />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function StackLogo({ name, src }) {
  const [failed, setFailed] = useState(!src);
  const tone = {
    color: SLATE_MUTED,
    transition: 'color 0.15s, filter 0.15s',
    '&:hover': { color: INK },
  };
  if (failed) {
    return (
      <Box
        component='span'
        sx={{
          ...tone,
          fontSize: '0.875rem',
          fontWeight: 700,
          lineHeight: '19px',
        }}
      >
        {name}
      </Box>
    );
  }
  return (
    <Box
      component='img'
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      sx={{
        ...tone,
        height: 19,
        width: 'auto',
        display: 'block',
        filter: 'grayscale(1) opacity(0.75)',
        '&:hover': { filter: 'grayscale(1) brightness(0.3)' },
      }}
    />
  );
}

// "Pushes directly to your stack": the CRMs and dialers leads land in.
function StackBar() {
  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          fontFamily: MONO,
          fontSize: '0.65rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: SLATE_REFERENCE,
          mb: 1,
        }}
      >
        Pushes directly to your stack
      </Box>
      <Box
        component='ul'
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', md: 'flex-start' },
          alignItems: 'center',
          columnGap: { xs: 2, sm: 3 },
          rowGap: 1.5,
        }}
      >
        {STACK.map((item) => (
          <Box component='li' key={item.name}>
            <StackLogo {...item} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// One published result, linking to the full numbers.
const statSx = { fontFamily: MONO, fontWeight: 700, color: INK };

function ProofLine() {
  return (
    <Box sx={{ fontSize: '0.875rem', color: SLATE_BODY, lineHeight: 1.6 }}>
      <Box component='strong' sx={statSx}>
        $22,600
      </Box>{' '}
      avg. annual premium per 100 leads{' '}
      <Box component='span' sx={{ color: SLATE_MUTED }}>
        (11.2% close rate at $2,023 avg. premium)
      </Box>{' '}
      ·{' '}
      <Box
        component='a'
        href='#fresh-leads'
        sx={{
          color: BLUE,
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          '&:hover': { textDecoration: 'underline' },
        }}
      >
        See the full breakdown →
      </Box>
    </Box>
  );
}

function Header() {
  return (
    <Box
      component='header'
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: '#FFFFFF',
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box
          component={RouterLink}
          to='/'
          aria-label={`${BRAND} home`}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Box
            component='img'
            src='/fexdigital-logo-blue.svg'
            alt={BRAND}
            sx={{ height: 30, display: 'block' }}
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          <Box
            component={RouterLink}
            to='/login'
            sx={{
              fontFamily: SANS,
              fontSize: '0.875rem',
              fontWeight: 600,
              color: INK,
              textDecoration: 'none',
              px: 1.5,
              py: 1,
              borderRadius: KEY,
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: NEUTRAL },
            }}
          >
            Sign In
          </Box>
          <Box
            component='a'
            href={`#${CAPTURE_ID}`}
            onClick={() => {
              // Land the cursor in the email box after the scroll.
              setTimeout(
                () => document.querySelector(`#${CAPTURE_ID} input`)?.focus(),
                300,
              );
            }}
            sx={{
              fontFamily: SANS,
              fontSize: '0.8125rem',
              fontWeight: 700,
              color: '#FFFFFF',
              textDecoration: 'none',
              bgcolor: BLUE,
              border: `1px solid ${BLUE}`,
              px: 2,
              py: 1,
              borderRadius: KEY,
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: BLUE_HOVER, borderColor: BLUE_HOVER },
            }}
          >
            {CTA_LABEL}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function Footer() {
  const linkSx = {
    color: INK_MUTED,
    textDecoration: 'none',
    '&:hover': { color: '#FFFFFF' },
  };
  return (
    <Box
      component='footer'
      sx={{
        bgcolor: INK,
        borderTop: `1px solid ${INK_RULE}`,
        px: { xs: 2, sm: 3 },
        py: 3,
        fontSize: '0.8125rem',
        color: INK_MUTED,
      }}
    >
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <span>© {new Date().getFullYear()} Final Expense Digital, LLC</span>
        <Box sx={{ display: 'flex', gap: 2.5 }}>
          <Box component={RouterLink} to='/terms-of-service' sx={linkSx}>
            Terms
          </Box>
          <Box component={RouterLink} to='/privacy-policy' sx={linkSx}>
            Privacy
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function Landing() {
  const { isAuthenticated } = useSelector((state) => state.user);

  // Supabase password-recovery links can land on the site root.
  if (window.location.hash.includes('type=recovery')) {
    return <Navigate to='/reset-password' replace />;
  }
  if (isAuthenticated) return <Navigate to='/business' replace />;

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#FFFFFF',
        color: INK,
        fontFamily: SANS,
        // Flat architecture: nothing on this page casts a shadow.
        '& *': { boxShadow: 'none', textShadow: 'none' },
        // In-page links (#fresh-leads, #get-started) clear the sticky header.
        '& [id]': { scrollMarginTop: '72px' },
      }}
    >
      <Header />

      <Box
        component='main'
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pt: { xs: 5, md: 8 },
          pb: 0,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr)',
            md: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
          },
          alignItems: 'center',
          gap: { xs: 5, md: 6 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'center', md: 'flex-start' },
            textAlign: { xs: 'center', md: 'left' },
            pb: { md: 9 },
          }}
        >
          <Box
            component='h1'
            sx={{
              m: 0,
              mb: 2.5,
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: { xs: '2.5rem', sm: '3.25rem', md: '4rem' },
              lineHeight: 1.08,
              letterSpacing: { xs: '-0.5px', md: '-1.5px' },
              color: INK,
            }}
          >
            <Box component='span' sx={{ display: { md: 'block' } }}>
              Real Intent.
            </Box>{' '}
            Real Results.
          </Box>

          <Box
            component='p'
            sx={{
              m: 0,
              mb: 4,
              maxWidth: 560,
              fontSize: { xs: '1rem', md: '1.125rem' },
              lineHeight: 1.6,
              color: SLATE_BODY,
            }}
          >
            Shoppers compare live rates from real carriers, and most pick a plan
            before they reach you, so you get the carrier, the premium and the
            reason they're buying.
          </Box>

          <CaptureForm />
          <StackBar />
          <ProofLine />
        </Box>

        <HeroPhone />
      </Box>

      <FreshLeadSections />
      <AgedLeadSections />

      <Footer />
    </Box>
  );
}
