// Landing.jsx
// Public marketing page at "/". Logged-in agents are sent on to /business.
// Built from the FExDigital hero mockup under the Design System v2.0 rules:
// flat surfaces (no shadows or gradients), 1px hairlines, 999px capsules for
// badges and tabs, 8px card containers, 4px inputs and keys, a serif title
// face, Inter for UI and JetBrains Mono for data.
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import AgedLeadSections from './landing/AgedLeadSections';

// Brand tokens. Ink and Blue lead the page; the rest support them.
const INK = '#050A30';
const BLUE = '#233DFF';
const BLUE_HOVER = '#1A30D9';
const BLUE_TINT = '#EEF1FF';
const BLUE_BORDER = '#C9D0FF';
const INK_RULE = '#1B2150';
const INK_MUTED = '#9AA3C7';
const SLATE_BODY = '#334155';
const SLATE_MUTED = '#64748B';
const HAIRLINE = '#E2E8F0';
const HAIRLINE_STRONG = '#CBD5E1';
const SURFACE = '#F8FAFC';
const NEUTRAL = '#F1F5F9';
const SLATE_NAVY = '#2F4E6F';
const GREEN = '#2E6B4F';
const GREEN_TINT = '#EAF4EE';
const GREEN_BORDER = '#C5E0D0';

const SERIF = '"Libre Baskerville", Georgia, serif';
const SANS = '"Inter", -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

// Lead access is invite-only, so the email capture opens a request email.
const ACCESS_REQUEST_EMAIL = 'info@finalexpensedigital.com';

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

const pillSx = {
  ...eyebrowSx,
  fontSize: '0.625rem',
  letterSpacing: '0.5px',
  px: 1,
  py: '2px',
  borderRadius: CAPSULE,
  lineHeight: 1.4,
  border: '1px solid',
  whiteSpace: 'nowrap',
};

const pillTone = {
  neutral: { bgcolor: NEUTRAL, color: SLATE_BODY, borderColor: HAIRLINE },
  verified: { bgcolor: GREEN_TINT, color: GREEN, borderColor: GREEN_BORDER },
  blue: { bgcolor: BLUE_TINT, color: BLUE, borderColor: BLUE_BORDER },
};

function Pill({ tone = 'neutral', children }) {
  return (
    <Box component='span' sx={{ ...pillSx, ...pillTone[tone] }}>
      {children}
    </Box>
  );
}

const PROOF_POINTS = [
  { label: '100% Exclusive for 30 Days', dot: BLUE },
  { label: 'SMS Text-Verified Phone', dot: GREEN },
  { label: '16 Underwriting Fields Included', dot: SLATE_MUTED },
  { label: 'Zero Monthly Retainers', dot: SLATE_NAVY },
];

const SPECS = [
  { label: 'Age / State', value: '67 • Ohio' },
  { label: 'Coverage Goal', value: '$25,000' },
  { label: 'Monthly Budget', value: '$60 – $90 / mo' },
  { label: 'Health / Tobacco', value: 'Good • Non-Smoker' },
];

const DISPATCH_LOG = [
  {
    time: '09:41:02',
    desc: 'Requested final expense quote on GetSeniorQuotes',
    tag: 'Inbound',
    tone: 'neutral',
  },
  {
    time: '09:41:19',
    desc: 'Entered 6-digit confirmation pin sent via SMS',
    tag: 'Verified',
    tone: 'verified',
  },
  {
    time: '09:41:20',
    desc: 'Pushed to your FExDigital inbox and dialer queue',
    tag: 'Exclusive',
    tone: 'blue',
    emphasis: true,
  },
];

const LIFECYCLE = [
  {
    time: '09:40:15',
    desc: 'Visitor lands on the quote underwriting funnel (OH IP address confirmed)',
    tag: 'Session',
    tone: 'neutral',
  },
  {
    time: '09:41:02',
    desc: 'Completed 6-question questionnaire (Budget: $60–$90/mo, Face: $25K)',
    tag: 'Submitted',
    tone: 'neutral',
  },
  {
    time: '09:41:03',
    desc: 'One-time PIN texted to (614) 555-0142',
    tag: 'OTP Sent',
    tone: 'verified',
  },
  {
    time: '09:41:19',
    desc: '6-digit PIN submitted and validated',
    tag: 'Valid',
    tone: 'verified',
  },
  {
    time: '09:41:20',
    desc: '30-day exclusivity lock executed. Lead assigned to a single agent.',
    tag: 'Locked',
    tone: 'blue',
    emphasis: true,
  },
];

const TABS = [
  { key: 'card', label: 'Lead Card' },
  { key: 'timeline', label: 'Audit Timeline' },
  { key: 'json', label: 'Webhook JSON' },
];

function Timeline({ rows, gap = 1.25 }) {
  return (
    <Box
      sx={{
        borderLeft: `2px solid ${BLUE}`,
        pl: 1.75,
        ml: 0.5,
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {rows.map((row) => (
        <Box
          key={row.time + row.tag}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            fontFamily: MONO,
            fontSize: '0.75rem',
          }}
        >
          <Box
            component='span'
            sx={{ fontWeight: 700, color: INK, flexShrink: 0 }}
          >
            {row.time}
          </Box>
          <Box
            component='span'
            sx={{
              flex: 1,
              pl: 1,
              color: row.emphasis ? BLUE : SLATE_BODY,
              fontWeight: row.emphasis ? 600 : 400,
            }}
          >
            {row.desc}
          </Box>
          <Box sx={{ flexShrink: 0 }}>
            <Pill tone={row.tone}>{row.tag}</Pill>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function SectionLabel({ children, aside }) {
  return (
    <Box
      sx={{
        ...eyebrowSx,
        color: SLATE_MUTED,
        mb: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <span>{children}</span>
      {aside}
    </Box>
  );
}

function CardFooter({ left, right }) {
  return (
    <Box
      sx={{
        borderTop: `1px solid ${HAIRLINE}`,
        pt: 1.75,
        mt: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        fontFamily: MONO,
        fontSize: '0.7rem',
        color: SLATE_MUTED,
      }}
    >
      <span>{left}</span>
      {right}
    </Box>
  );
}

function LeadCardPane() {
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          pb: 2,
          mb: 2.5,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Pill>Web Funnel • Fresh</Pill>
            <Pill tone='verified'>✓ Verified Phone</Pill>
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
              sx={{ fontSize: '1.25rem', fontWeight: 800, color: INK }}
            >
              Margaret H.
            </Box>
            <Box
              component='span'
              sx={{
                fontFamily: MONO,
                fontSize: '0.875rem',
                color: SLATE_MUTED,
              }}
            >
              (614) 555-0142
            </Box>
          </Box>
        </Box>
        <Pill tone='blue'>16 Fields Included ⓘ</Pill>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.25,
          mb: 2.5,
        }}
      >
        {SPECS.map((spec) => (
          <Box
            key={spec.label}
            sx={{
              bgcolor: SURFACE,
              border: `1px solid ${HAIRLINE}`,
              borderRadius: KEY,
              p: 1.5,
            }}
          >
            <Box
              sx={{
                ...eyebrowSx,
                fontSize: '0.625rem',
                color: SLATE_MUTED,
                mb: 0.5,
              }}
            >
              {spec.label}
            </Box>
            <Box
              sx={{
                fontFamily: MONO,
                fontSize: '0.875rem',
                fontWeight: 700,
                color: INK,
              }}
            >
              {spec.value}
            </Box>
          </Box>
        ))}
      </Box>

      <SectionLabel
        aside={
          <Box component='span' sx={{ color: GREEN }}>
            ● Direct to Dialer
          </Box>
        }
      >
        Real-Time Dispatch Log
      </SectionLabel>
      <Timeline rows={DISPATCH_LOG} />

      <CardFooter
        left='Immediate delivery via webhook, Sendblue SMS & CSV'
        right={
          <Box component='span' sx={{ color: INK, fontWeight: 700 }}>
            Exclusive Tier:{' '}
            <Box component='span' sx={{ color: GREEN }}>
              $39.00
            </Box>
          </Box>
        }
      />
    </>
  );
}

function TimelinePane() {
  return (
    <>
      <SectionLabel aside={<span>Latency: 18.2s Total</span>}>
        Full Verification Lifecycle
      </SectionLabel>
      <Timeline rows={LIFECYCLE} gap={2} />
      <CardFooter
        left='Zero-sharing guarantee enforced at the database level'
        right={
          <Box component='span' sx={{ color: INK, fontWeight: 700 }}>
            Status: Delivered
          </Box>
        }
      />
    </>
  );
}

const jsonKey = (k) => (
  <Box component='span' sx={{ color: INK_MUTED }}>
    "{k}"
  </Box>
);
const jsonStr = (v) => (
  <Box component='span' sx={{ color: '#FDE68A' }}>
    "{v}"
  </Box>
);
const jsonNum = (v) => (
  <Box component='span' sx={{ color: '#A5B4FC' }}>
    {v}
  </Box>
);
const jsonBool = (v) => (
  <Box component='span' sx={{ color: '#86EFAC', fontWeight: 700 }}>
    {String(v)}
  </Box>
);

function JsonPane() {
  return (
    <>
      <Box
        component='pre'
        sx={{
          m: 0,
          bgcolor: INK,
          color: '#E0E7FF',
          p: 2.25,
          borderRadius: KEY,
          border: `1px solid ${INK_RULE}`,
          fontFamily: MONO,
          fontSize: '0.75rem',
          lineHeight: 1.6,
          overflowX: 'auto',
        }}
      >
        <code>
          {'{\n  '}
          {jsonKey('event')}: {jsonStr('lead.verified_delivered')}
          {',\n  '}
          {jsonKey('id')}: {jsonStr('lead_fex_98a72b14')}
          {',\n  '}
          {jsonKey('timestamp')}: {jsonStr('2026-11-02T14:41:20.104Z')}
          {',\n  '}
          {jsonKey('exclusive_until')}: {jsonStr('2026-12-02T14:41:20Z')}
          {',\n  '}
          {jsonKey('contact')}
          {': {\n    '}
          {jsonKey('first_name')}: {jsonStr('Margaret')}
          {',\n    '}
          {jsonKey('phone_e164')}: {jsonStr('+16145550142')}
          {',\n    '}
          {jsonKey('sms_verified')}: {jsonBool(true)}
          {'\n  },\n  '}
          {jsonKey('underwriting')}
          {': {\n    '}
          {jsonKey('age')}: {jsonNum(67)}
          {',\n    '}
          {jsonKey('state')}: {jsonStr('OH')}
          {',\n    '}
          {jsonKey('coverage_amount')}: {jsonNum(25000)}
          {',\n    '}
          {jsonKey('monthly_budget')}: {jsonStr('$60-$90')}
          {',\n    '}
          {jsonKey('tobacco_use')}: {jsonBool(false)}
          {',\n    '}
          {jsonKey('fields_delivered')}: {jsonNum(16)}
          {'\n  }\n}'}
        </code>
      </Box>
      <CardFooter
        left='Works with any REST webhook endpoint'
        right={
          <Box component='span' sx={{ color: INK, fontWeight: 700 }}>
            HTTP 200 OK
          </Box>
        }
      />
    </>
  );
}

function DispatchPreview() {
  const [tab, setTab] = useState('card');

  return (
    <Box
      component='section'
      aria-label='Lead dispatch preview'
      sx={{
        width: '100%',
        maxWidth: 820,
        bgcolor: '#FFFFFF',
        border: `1px solid ${HAIRLINE_STRONG}`,
        borderRadius: CARD,
        overflow: 'hidden',
        textAlign: 'left',
      }}
    >
      <Box
        sx={{
          bgcolor: INK,
          color: '#FFFFFF',
          px: 2,
          py: 1.25,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: '5px' }}>
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: CAPSULE,
                  bgcolor: INK_RULE,
                }}
              />
            ))}
          </Box>
          <Box
            component='span'
            sx={{
              fontFamily: MONO,
              fontSize: '0.7rem',
              fontWeight: 600,
              color: INK_MUTED,
            }}
          >
            FEx_LEAD_DISPATCH // LIVE ROUTER
          </Box>
        </Box>

        <Box
          role='tablist'
          sx={{
            display: 'inline-flex',
            border: `1px solid ${INK_RULE}`,
            borderRadius: CAPSULE,
            p: '2px',
            gap: '2px',
          }}
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Box
                key={t.key}
                component='button'
                type='button'
                role='tab'
                aria-selected={active}
                onClick={() => setTab(t.key)}
                sx={{
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: MONO,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: CAPSULE,
                  bgcolor: active ? BLUE : 'transparent',
                  color: active ? '#FFFFFF' : INK_MUTED,
                  transition: 'background-color 0.15s, color 0.15s',
                  '&:hover': { color: '#FFFFFF' },
                  '&:focus-visible': {
                    outline: `2px solid ${BLUE}`,
                    outlineOffset: 2,
                  },
                }}
              >
                {t.label}
              </Box>
            );
          })}
        </Box>
      </Box>

      <Box role='tabpanel' sx={{ p: { xs: 2, sm: 3 } }}>
        {tab === 'card' && <LeadCardPane />}
        {tab === 'timeline' && <TimelinePane />}
        {tab === 'json' && <JsonPane />}
      </Box>
    </Box>
  );
}

function CaptureForm() {
  const [email, setEmail] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent('Lead access request');
    const body = encodeURIComponent(
      `Hi FExDigital team,\n\nI'd like access to exclusive leads. My work email is ${email}.\n`,
    );
    window.location.href = `mailto:${ACCESS_REQUEST_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <Box
      component='form'
      onSubmit={onSubmit}
      sx={{ width: '100%', maxWidth: 540, mx: 'auto', mb: 2.5 }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'stretch',
          bgcolor: '#FFFFFF',
          border: `1px solid ${HAIRLINE_STRONG}`,
          borderRadius: KEY,
          p: 0.5,
          gap: 0.5,
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
            aria-label='Work email'
            placeholder="What's your work email?"
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
            px: 2.75,
            py: 1.5,
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
          Request lead access
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

function Header() {
  return (
    <Box
      component='header'
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: INK,
        borderBottom: `1px solid ${INK_RULE}`,
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
          aria-label='FExDigital home'
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Box
            component='img'
            src='/fexdigital-logo-white.svg'
            alt='FExDigital'
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
              color: '#FFFFFF',
              textDecoration: 'none',
              px: 1.5,
              py: 1,
              borderRadius: KEY,
              transition: 'background-color 0.15s',
              '&:hover': { bgcolor: INK_RULE },
            }}
          >
            Sign In
          </Box>
          <Box
            component={RouterLink}
            to='/login'
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
            Access Leads
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
        fontFamily: MONO,
        fontSize: '0.75rem',
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
      }}
    >
      <Header />

      <Box
        component='main'
        sx={{
          flex: 1,
          width: '100%',
          maxWidth: 1040,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pt: { xs: 5, md: 8 },
          pb: { xs: 6, md: 10 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: BLUE_TINT,
            border: `1px solid ${BLUE_BORDER}`,
            borderRadius: CAPSULE,
            pl: 0.75,
            pr: 1.5,
            py: 0.5,
            mb: 3,
            fontSize: '0.75rem',
            fontWeight: 600,
            color: INK,
          }}
        >
          <Box
            component='span'
            sx={{
              ...pillSx,
              bgcolor: BLUE,
              borderColor: BLUE,
              color: '#FFFFFF',
            }}
          >
            New
          </Box>
          Instant CRM delivery &amp; real-time lead alerts
        </Box>

        <Box
          component='h1'
          sx={{
            m: 0,
            mb: 2.5,
            maxWidth: 900,
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
            lineHeight: 1.1,
            letterSpacing: { xs: '-0.5px', md: '-1px' },
            color: INK,
          }}
        >
          Life insurance leads,{' '}
          <Box component='span' sx={{ color: BLUE, whiteSpace: 'nowrap' }}>
            solved.
          </Box>
        </Box>

        <Box
          component='p'
          sx={{
            m: 0,
            mb: 4,
            maxWidth: 660,
            fontSize: { xs: '1rem', md: '1.125rem' },
            lineHeight: 1.55,
            color: SLATE_BODY,
          }}
        >
          Exclusive web-funnel and live-transfer leads, SMS-verified and
          delivered straight to your CRM in real time. Zero shared inventory.
        </Box>

        <CaptureForm />

        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: { xs: 1.5, sm: 2.5 },
            mb: 7,
            fontSize: '0.8125rem',
            fontWeight: 500,
            color: SLATE_MUTED,
          }}
        >
          {PROOF_POINTS.map((p) => (
            <Box
              key={p.label}
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
            >
              <Box
                component='span'
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: CAPSULE,
                  bgcolor: p.dot,
                }}
              />
              {p.label}
            </Box>
          ))}
        </Box>

        <DispatchPreview />
      </Box>

      <AgedLeadSections />

      <Footer />
    </Box>
  );
}
