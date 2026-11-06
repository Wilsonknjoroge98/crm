// Landing.jsx — the public front door at fexdigital.com (/). Logged-out
// visitors see what FEX Digital sells and why it converts; signed-in agents
// are sent straight to /business by the index route.
//
// Built on the FEX Digital Design System v2.0: restrained editorial finance.
// 1px hairlines instead of shadows; Deep Ink Navy anchors; Editorial Gold
// only for the main conversion; Revenue Green only for won-sale dollars;
// serif titles, Inter body, JetBrains Mono for money, counts, times and
// phones; radii of 999px (pills), 8px (cards) and 4px (keys).
import { useEffect } from 'react';
import { Box, Button, Container, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckIcon from '@mui/icons-material/Check';
import RemoveIcon from '@mui/icons-material/Remove';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import EmojiEventsOutlinedIcon from '@mui/icons-material/EmojiEventsOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { catalogItem } from '../marketplace/catalog.js';
import { formatMoney } from '../marketplace/ui.jsx';
import {
  COMPARISON,
  CRM_FEATURES,
  FACTS,
  FAQ,
  LEAD_MATRIX,
  NAV_LINKS,
  STEPS,
  VERIFIED_STATS,
} from './content.js';

// Design System v2.0 tokens.
const INK = '#051118';
const GOLD = '#D4AF37';
const GOLD_DEEP = '#C29F2F';
const GREEN = '#2E6B4F';
const SLATE = '#2F4E6F';
const SLATE_DEEP = '#1E293B';
const NEUTRAL = '#F1F5F9';
const HAIRLINE = '#E2E8F0';
const BODY = '#475569';
const ON_INK_MUTED = 'rgba(241, 245, 249, 0.68)';
const ON_INK_RULE = 'rgba(241, 245, 249, 0.14)';

const SERIF = '"Playfair Display", Georgia, serif';
const SANS = '"Inter", "Helvetica", "Arial", sans-serif';
const MONO = '"JetBrains Mono", monospace';

const NAV_HEIGHT = 64;
const SIGN_IN_PATH = '/login';
const PRIMARY = catalogItem('Website Leads');

// Tracked uppercase eyebrow, 0.7rem with 0.8px spacing.
const eyebrowSx = {
  fontFamily: MONO,
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
};

const titleSx = {
  fontFamily: SERIF,
  fontWeight: 700,
  color: INK,
  letterSpacing: '-0.01em',
  lineHeight: 1.12,
};

const goldButtonSx = {
  bgcolor: GOLD,
  color: INK,
  fontFamily: SANS,
  fontWeight: 700,
  borderRadius: '4px',
  px: 3,
  py: 1.25,
  boxShadow: 'none',
  '&:hover': { bgcolor: GOLD_DEEP, boxShadow: 'none' },
};

const outlineButtonSx = (onInk) => ({
  color: onInk ? '#FFFFFF' : INK,
  border: `1px solid ${onInk ? ON_INK_RULE : INK}`,
  fontFamily: SANS,
  fontWeight: 600,
  borderRadius: '4px',
  px: 3,
  py: 1.25,
  '&:hover': {
    borderColor: onInk ? '#FFFFFF' : INK,
    bgcolor: onInk ? 'rgba(255,255,255,0.06)' : NEUTRAL,
  },
});

const cardSx = {
  border: `1px solid ${HAIRLINE}`,
  borderRadius: '8px',
  bgcolor: '#FFFFFF',
};

/** Stadium pill. `tone` picks the semantic tint. */
function Pill({ children, tone = 'slate', sx }) {
  const tones = {
    slate: { bgcolor: NEUTRAL, color: SLATE, borderColor: '#CBD5E1' },
    green: { bgcolor: '#EAF4EE', color: GREEN, borderColor: '#B7D5C4' },
    gold: { bgcolor: '#FFF8E1', color: '#7A5400', borderColor: '#E9D18A' },
    ink: {
      bgcolor: 'transparent',
      color: '#E2E8F0',
      borderColor: ON_INK_RULE,
    },
  };
  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.4,
        border: '1px solid',
        borderRadius: '999px',
        ...eyebrowSx,
        fontSize: '0.66rem',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...tones[tone],
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Eyebrow + serif title + optional lede, with the spec's 2px ink rule. */
function SectionHead({ eyebrow, title, lede, onInk, align = 'left' }) {
  return (
    <Box sx={{ maxWidth: 760, mx: align === 'center' ? 'auto' : 0 }}>
      <Typography
        sx={{
          ...eyebrowSx,
          color: onInk ? GOLD : SLATE,
          mb: 1.5,
          textAlign: align,
        }}
      >
        {eyebrow}
      </Typography>
      <Typography
        component='h2'
        sx={{
          ...titleSx,
          color: onInk ? '#FFFFFF' : INK,
          fontSize: { xs: '1.9rem', md: '2.6rem' },
          textAlign: align,
        }}
      >
        {title}
      </Typography>
      {lede && (
        <Typography
          sx={{
            mt: 2,
            color: onInk ? ON_INK_MUTED : BODY,
            fontSize: { xs: '1rem', md: '1.08rem' },
            lineHeight: 1.65,
            textAlign: align,
          }}
        >
          {lede}
        </Typography>
      )}
    </Box>
  );
}

function Section({ id, onInk, tinted, children, sx }) {
  return (
    <Box
      component='section'
      id={id}
      sx={{
        scrollMarginTop: `${NAV_HEIGHT}px`,
        bgcolor: onInk ? INK : tinted ? '#F8FAFC' : '#FFFFFF',
        borderTop: onInk ? 'none' : `1px solid ${HAIRLINE}`,
        py: { xs: 8, md: 12 },
        ...sx,
      }}
    >
      <Container maxWidth='lg' sx={{ px: { xs: 2.5, md: 4 } }}>
        {children}
      </Container>
    </Box>
  );
}

/* ───────────────────────────── Navigation ───────────────────────────── */

function NavBar() {
  return (
    <Box
      component='header'
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: INK,
        borderBottom: `1px solid ${ON_INK_RULE}`,
      }}
    >
      <Container
        maxWidth='lg'
        sx={{
          height: NAV_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          px: { xs: 2.5, md: 4 },
        }}
      >
        <Box
          component='a'
          href='#top'
          aria-label='FEX Digital home'
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Box
            component='img'
            src='/fexdigital-logo-white.svg'
            alt='FEX Digital'
            sx={{ height: 30, display: 'block' }}
          />
        </Box>
        <Stack
          component='nav'
          direction='row'
          spacing={3.5}
          sx={{ display: { xs: 'none', md: 'flex' }, flex: 1 }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              underline='none'
              sx={{
                color: ON_INK_MUTED,
                fontFamily: SANS,
                fontSize: '0.88rem',
                fontWeight: 500,
                '&:hover': { color: '#FFFFFF' },
              }}
            >
              {link.label}
            </Link>
          ))}
        </Stack>
        <Stack
          direction='row'
          spacing={1.5}
          alignItems='center'
          sx={{ ml: 'auto' }}
        >
          <Button
            component={RouterLink}
            to={SIGN_IN_PATH}
            sx={{
              color: '#FFFFFF',
              fontWeight: 600,
              px: 1.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Sign in
          </Button>
          <Button
            href='#leads'
            sx={{
              ...goldButtonSx,
              py: 0.75,
              px: 2,
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          >
            Order leads
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

/* ──────────────────────────────── Hero ──────────────────────────────── */

const SAMPLE_FIELDS = [
  ['Age', '67'],
  ['State', 'OH'],
  ['Coverage', '$25,000'],
  ['Goal', 'Funeral costs'],
  ['Health', 'Good'],
  ['Tobacco', 'No'],
  ['Height / Wt', '5′6″ · 168 lb'],
  ['Budget', '$60–$90/mo'],
  ['Best time', 'Morning'],
];

const SAMPLE_TIMELINE = [
  ['09:41:02', 'Requested a quote on GetSeniorQuotes'],
  ['09:41:19', 'Confirmed the code texted to her cell'],
  ['09:41:20', 'Delivered to your CRM and dialer'],
  ['09:41:21', 'Text alert sent to your cell'],
];

/** Illustrative lead record: what lands in an agent's CRM. */
function LeadRecord() {
  return (
    <Box
      sx={{
        ...cardSx,
        borderColor: '#FFFFFF',
        overflow: 'hidden',
        width: '100%',
        maxWidth: 440,
        mx: 'auto',
      }}
      aria-label='Illustrative example of a delivered lead'
    >
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: NEUTRAL,
          borderBottom: `1px solid ${HAIRLINE}`,
        }}
      >
        <Typography sx={{ ...eyebrowSx, color: SLATE }}>
          New lead · Website
        </Typography>
        <Pill tone='green'>
          <CheckIcon sx={{ fontSize: 12 }} /> Verified
        </Pill>
      </Stack>

      <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
        <Stack direction='row' alignItems='baseline' spacing={1.5}>
          <Typography sx={{ ...titleSx, fontSize: '1.35rem' }}>
            Margaret H.
          </Typography>
          <Typography
            sx={{ fontFamily: MONO, fontSize: '0.8rem', color: BODY }}
          >
            (614) 555-0142
          </Typography>
        </Stack>
        <Box sx={{ mt: 1.25 }}>
          <Pill tone='slate'>
            16 fields included <InfoOutlinedIcon sx={{ fontSize: 12 }} />
          </Pill>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderTop: `1px solid ${HAIRLINE}`,
        }}
      >
        {SAMPLE_FIELDS.map(([label, value], i) => (
          <Box
            key={label}
            sx={{
              px: 2.5,
              py: 1.25,
              borderRight: i % 3 === 2 ? 'none' : `1px solid ${HAIRLINE}`,
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            <Typography
              sx={{ ...eyebrowSx, fontSize: '0.6rem', color: '#64748B' }}
            >
              {label}
            </Typography>
            <Typography
              sx={{
                fontFamily: /\d/.test(value) ? MONO : SANS,
                fontSize: '0.84rem',
                fontWeight: 600,
                color: INK,
                mt: 0.25,
              }}
            >
              {value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ px: 2.5, py: 2 }}>
        {SAMPLE_TIMELINE.map(([time, text], i) => (
          <Stack
            key={time}
            direction='row'
            spacing={1.5}
            alignItems='center'
            sx={{ py: 0.5 }}
          >
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '0.74rem',
                color: i === SAMPLE_TIMELINE.length - 1 ? INK : '#64748B',
                fontWeight: 600,
                minWidth: 64,
              }}
            >
              {time}
            </Typography>
            <Box
              sx={{
                width: 7,
                height: 7,
                borderRadius: '999px',
                bgcolor: i === 1 ? GREEN : INK,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: '0.82rem', color: BODY }}>
              {text}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

function Hero() {
  return (
    <Box
      id='top'
      component='section'
      sx={{
        bgcolor: INK,
        color: '#FFFFFF',
        pt: { xs: 7, md: 11 },
        pb: { xs: 8, md: 12 },
        // A faint ledger grid: hairlines, not decoration.
        backgroundImage: `linear-gradient(${ON_INK_RULE} 1px, transparent 1px)`,
        backgroundSize: '100% 56px',
        backgroundPosition: '0 -1px',
      }}
    >
      <Container maxWidth='lg' sx={{ px: { xs: 2.5, md: 4 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1.15fr 0.85fr' },
            gap: { xs: 6, md: 8 },
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography sx={{ ...eyebrowSx, color: GOLD, mb: 2.5 }}>
              Life insurance leads for licensed agents
            </Typography>
            <Typography
              component='h1'
              sx={{
                ...titleSx,
                color: '#FFFFFF',
                fontSize: { xs: '2.4rem', sm: '3rem', md: '3.7rem' },
                lineHeight: 1.06,
              }}
            >
              Verified senior leads, sold to one agent: you.
            </Typography>
            <Typography
              sx={{
                mt: 3,
                color: ON_INK_MUTED,
                fontSize: { xs: '1.05rem', md: '1.18rem' },
                lineHeight: 1.65,
                maxWidth: 560,
              }}
            >
              FEX Digital generates life insurance leads for ages 50–89 on
              GetSeniorQuotes.com, confirms the phone by text, and delivers each
              lead in real time to your CRM, your dialer and your phone.
              Exclusive for 30 days.
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ mt: 4.5 }}
            >
              <Button
                href={PRIMARY.href}
                target='_blank'
                rel='noopener noreferrer'
                endIcon={<ArrowForwardIcon />}
                sx={{ ...goldButtonSx, fontSize: '1rem' }}
              >
                Order Website Leads ·{' '}
                <Box component='span' sx={{ fontFamily: MONO, ml: 0.75 }}>
                  {formatMoney(PRIMARY.price).replace('.00', '')}
                </Box>
              </Button>
              <Button href='#leads' sx={outlineButtonSx(true)}>
                Compare lead types
              </Button>
            </Stack>
            <Typography
              sx={{ mt: 2.5, fontSize: '0.86rem', color: ON_INK_MUTED }}
            >
              No contract. Pay per order through Stripe. Already a client?{' '}
              <Link
                component={RouterLink}
                to={SIGN_IN_PATH}
                sx={{ color: '#FFFFFF', fontWeight: 600 }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
          <Box>
            <LeadRecord />
            <Typography
              sx={{
                mt: 1.5,
                textAlign: 'center',
                fontSize: '0.72rem',
                color: ON_INK_MUTED,
              }}
            >
              Illustrative lead. Name, number and times are examples.
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

/** Hairline strip of facts under the hero. */
function FactStrip() {
  return (
    <Box sx={{ borderBottom: `1px solid ${HAIRLINE}`, bgcolor: '#FFFFFF' }}>
      <Container maxWidth='lg' sx={{ px: { xs: 0, md: 4 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: `repeat(${FACTS.length}, 1fr)`,
            },
          }}
        >
          {FACTS.map((fact, i) => (
            <Box
              key={fact.label}
              sx={{
                px: { xs: 2.5, md: 3 },
                py: 3,
                // An odd last fact spans the full row on the two-column grid.
                gridColumn: {
                  xs: i === FACTS.length - 1 && i % 2 === 0 ? '1 / -1' : 'auto',
                  md: 'auto',
                },
                borderLeft: {
                  xs: i % 2 ? `1px solid ${HAIRLINE}` : 'none',
                  md: i ? `1px solid ${HAIRLINE}` : 'none',
                },
                borderTop: {
                  xs: i > 1 ? `1px solid ${HAIRLINE}` : 'none',
                  md: 'none',
                },
              }}
            >
              <Typography
                sx={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: { xs: '1.15rem', md: '1.35rem' },
                  color: INK,
                }}
              >
                {fact.value}
              </Typography>
              <Typography
                sx={{
                  ...eyebrowSx,
                  fontSize: '0.64rem',
                  color: '#64748B',
                  mt: 0.5,
                }}
              >
                {fact.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}

/* ───────────────────────────── Comparison ───────────────────────────── */

function Comparison() {
  const cell = { px: { xs: 2, md: 3 }, py: 2.25 };
  return (
    <Section>
      <SectionHead
        eyebrow='Why agents switch'
        title='Most leads are a phone number and a guess.'
        lede='A shared, unverified lead sends you into a race with other agents for someone who may never pick up. Ours start with a real person, a confirmed phone and their quote details in hand.'
      />
      <Box sx={{ ...cardSx, mt: 6, overflow: 'hidden' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', md: '0.8fr 1fr 1.2fr' },
            bgcolor: INK,
          }}
        >
          <Box
            sx={{ ...cell, py: 1.5, display: { xs: 'none', md: 'block' } }}
          />
          <Typography
            sx={{ ...cell, py: 1.5, ...eyebrowSx, color: ON_INK_MUTED }}
          >
            Commodity lead lists
          </Typography>
          <Typography sx={{ ...cell, py: 1.5, ...eyebrowSx, color: GOLD }}>
            FEX Digital
          </Typography>
        </Box>
        {COMPARISON.map((row, i) => (
          <Box
            key={row.topic}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: '0.8fr 1fr 1.2fr' },
              borderTop: i ? `1px solid ${HAIRLINE}` : 'none',
              bgcolor: i % 2 ? '#FBFCFD' : '#FFFFFF',
            }}
          >
            <Typography
              sx={{
                ...cell,
                gridColumn: { xs: '1 / -1', md: 'auto' },
                pb: { xs: 0, md: 2.25 },
                fontWeight: 700,
                color: INK,
                fontSize: '0.92rem',
              }}
            >
              {row.topic}
            </Typography>
            <Stack direction='row' spacing={1} sx={cell}>
              <RemoveIcon sx={{ fontSize: 18, color: '#94A3B8', mt: '2px' }} />
              <Typography sx={{ color: '#64748B', fontSize: '0.92rem' }}>
                {row.them}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1} sx={cell}>
              <CheckIcon sx={{ fontSize: 18, color: INK, mt: '2px' }} />
              <Typography
                sx={{ color: INK, fontSize: '0.92rem', fontWeight: 500 }}
              >
                {row.us}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ──────────────────────────── Lead matrix ──────────────────────────── */

function MatrixRow({ row, first }) {
  const product = row.catalog ? catalogItem(row.catalog) : null;
  const fieldText = row.fields.length
    ? `${row.fieldsLabel}: ${row.fields.join(' • ')}${
        row.moreFields ? ` +${row.moreFields} more` : ''
      }`
    : row.fieldsLabel;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.6fr 0.75fr 0.8fr' },
        alignItems: 'center',
        gap: { xs: 2, md: 3 },
        px: { xs: 2.5, md: 3.5 },
        py: 3,
        borderTop: first ? 'none' : `1px solid ${HAIRLINE}`,
        borderLeft: `3px solid ${row.flagship ? GOLD : 'transparent'}`,
      }}
    >
      <Box>
        <Stack
          direction='row'
          spacing={1.5}
          alignItems='center'
          flexWrap='wrap'
          useFlexGap
        >
          <Typography sx={{ ...titleSx, fontSize: '1.3rem' }}>
            {row.name}
          </Typography>
          {row.flagship && <Pill tone='gold'>Most ordered</Pill>}
        </Stack>
        <Typography sx={{ mt: 0.75, color: BODY, fontSize: '0.95rem' }}>
          {row.summary}
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <Pill tone='slate' sx={{ whiteSpace: 'normal' }}>
            {fieldText}
            {row.fields.length > 0 && (
              <InfoOutlinedIcon sx={{ fontSize: 12 }} />
            )}
          </Pill>
        </Box>
      </Box>
      <Typography
        sx={{ fontSize: '0.88rem', color: SLATE_DEEP, fontWeight: 500 }}
      >
        {row.terms}
      </Typography>
      <Stack
        direction={{ xs: 'row', md: 'column' }}
        alignItems={{ xs: 'center', md: 'flex-end' }}
        justifyContent='space-between'
        spacing={1.25}
      >
        {product ? (
          <Typography
            sx={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: '1.5rem',
              color: INK,
            }}
          >
            {formatMoney(product.price)}
            <Box
              component='span'
              sx={{
                fontSize: '0.78rem',
                color: '#64748B',
                ml: 0.75,
                fontWeight: 500,
              }}
            >
              / {product.unit}
            </Box>
          </Typography>
        ) : (
          <Typography
            sx={{ ...eyebrowSx, color: '#64748B', fontSize: '0.66rem' }}
          >
            {row.inventory}
          </Typography>
        )}
        {product ? (
          <Button
            href={product.href}
            target='_blank'
            rel='noopener noreferrer'
            sx={
              row.flagship
                ? { ...goldButtonSx, py: 0.9 }
                : { ...outlineButtonSx(false), py: 0.9 }
            }
          >
            Order
          </Button>
        ) : (
          <Button
            component={RouterLink}
            to={SIGN_IN_PATH}
            endIcon={<ArrowForwardIcon />}
            sx={{
              ...outlineButtonSx(false),
              py: 0.9,
              borderColor: HAIRLINE,
              whiteSpace: 'nowrap',
            }}
          >
            Sign in to browse
          </Button>
        )}
      </Stack>
    </Box>
  );
}

function LeadMatrix() {
  return (
    <Section id='leads' tinted>
      <SectionHead
        eyebrow='Lead types & pricing'
        title='Every lead type, priced in plain sight.'
        lede='Fresh leads are generated on demand and delivered as they come in. Aged and banked inventory is sold by state from the Marketplace inside the CRM.'
      />
      <Box sx={{ ...cardSx, mt: 6, overflow: 'hidden' }}>
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: '1.6fr 0.75fr 0.8fr',
            gap: 3,
            px: 3.5,
            py: 1.5,
            bgcolor: INK,
          }}
        >
          {['Product', 'Terms', 'Price'].map((h, i) => (
            <Typography
              key={h}
              sx={{
                ...eyebrowSx,
                color: '#E2E8F0',
                textAlign: i === 2 ? 'right' : 'left',
              }}
            >
              {h}
            </Typography>
          ))}
        </Box>
        {LEAD_MATRIX.map((row, i) => (
          <MatrixRow key={row.name} row={row} first={i === 0} />
        ))}
      </Box>
      <Typography sx={{ mt: 2, fontSize: '0.8rem', color: '#64748B' }}>
        Leads are sold only for states where you hold an active life insurance
        license. Prices exclude applicable sales tax.
      </Typography>
    </Section>
  );
}

/* ─────────────────────────── Verification ─────────────────────────── */

function RateBar({ label, value, max, strong }) {
  return (
    <Box>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='baseline'
      >
        <Typography
          sx={{ ...eyebrowSx, color: strong ? '#FFFFFF' : ON_INK_MUTED }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: strong ? '2rem' : '1.4rem',
            color: strong ? '#FFFFFF' : ON_INK_MUTED,
          }}
        >
          {value.toFixed(1)}%
        </Typography>
      </Stack>
      <Box
        sx={{
          mt: 1,
          height: 10,
          bgcolor: 'rgba(255,255,255,0.06)',
          borderRadius: '4px',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${(value / max) * 100}%`,
            bgcolor: strong ? GOLD : 'rgba(241,245,249,0.35)',
            borderRadius: '4px',
          }}
        />
      </Box>
    </Box>
  );
}

function Verification() {
  const { verified, unverified, window } = VERIFIED_STATS;
  const multiple = (verified / unverified).toFixed(1);
  return (
    <Section id='verified' onInk>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 6, md: 10 },
          alignItems: 'center',
        }}
      >
        <Box>
          <SectionHead
            onInk
            eyebrow='Text verification'
            title='A real person, on a real phone, before you dial.'
            lede='Before a Website lead is delivered as Verified, the consumer enters a 6-digit code we text to their cell. Instant Form leads are verified through Meta. You spend your day on conversations, not disconnected numbers.'
          />
          <Stack spacing={1.25} sx={{ mt: 4 }}>
            {[
              'Code texted at the moment of the quote request',
              'Verified and Unverified clearly labeled on every lead',
              'Unverified Website leads with a bad number are replaceable for 7 days',
            ].map((line) => (
              <Stack
                key={line}
                direction='row'
                spacing={1.25}
                alignItems='flex-start'
              >
                <CheckIcon sx={{ fontSize: 18, color: GOLD, mt: '3px' }} />
                <Typography sx={{ color: '#E2E8F0', fontSize: '0.95rem' }}>
                  {line}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Box
          sx={{
            border: `1px solid ${ON_INK_RULE}`,
            borderRadius: '8px',
            p: { xs: 3, md: 4 },
          }}
        >
          <Typography sx={{ ...eyebrowSx, color: GOLD }}>
            Close rate by lead
          </Typography>
          <Typography
            sx={{ ...titleSx, color: '#FFFFFF', fontSize: '1.7rem', mt: 1 }}
          >
            Verified leads closed at{' '}
            <Box component='span' sx={{ fontFamily: MONO }}>
              {multiple}×
            </Box>{' '}
            the rate.
          </Typography>
          <Stack spacing={3} sx={{ mt: 4 }}>
            <RateBar label='Verified' value={verified} max={verified} strong />
            <RateBar label='Unverified' value={unverified} max={verified} />
          </Stack>
          <Typography
            sx={{
              mt: 3,
              fontSize: '0.75rem',
              color: ON_INK_MUTED,
              lineHeight: 1.5,
            }}
          >
            {window}. Past results do not guarantee future sales.
          </Typography>
        </Box>
      </Box>
    </Section>
  );
}

/* ───────────────────────────── Texting ───────────────────────────── */

const THREADS = [
  {
    name: 'Margaret H.',
    time: '09:44',
    text: 'Yes, 10 tomorrow works.',
    unread: true,
    active: true,
  },
  {
    name: 'Robert K.',
    time: '09:31',
    text: 'Can you do $40 a month?',
    unread: true,
  },
  { name: 'Linda P.', time: '08:57', text: 'Thank you, talk then.' },
  { name: 'James W.', time: 'Yest.', text: 'What info do you need?' },
];

const MESSAGES = [
  {
    from: 'agent',
    text: 'Hi Margaret, this is Dana following up on your quote request from Get Senior Quotes. Is morning still a good time for a quick call?',
  },
  { from: 'lead', text: 'Yes, tomorrow at 10 works.' },
  {
    from: 'agent',
    text: 'You’re all set for tomorrow at 10:00 AM. Dana will call you from this number.',
  },
];

/** Unified Inbox in miniature: master list + conversation pane (spec C). */
function InboxMock() {
  return (
    <Box
      sx={{
        ...cardSx,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '42% 58%' },
      }}
    >
      <Box
        sx={{
          borderRight: { sm: `1px solid ${HAIRLINE}` },
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Stack
          direction='row'
          spacing={1}
          sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${HAIRLINE}` }}
        >
          <Pill tone='slate'>All (128)</Pill>
          <Pill tone='gold'>Unread (2)</Pill>
        </Stack>
        {THREADS.map((t) => (
          <Box
            key={t.name}
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: `1px solid ${HAIRLINE}`,
              borderLeft: `3px solid ${t.active ? INK : 'transparent'}`,
              bgcolor: t.active ? NEUTRAL : '#FFFFFF',
            }}
          >
            <Stack direction='row' justifyContent='space-between'>
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  fontWeight: t.unread ? 700 : 500,
                  color: INK,
                }}
              >
                {t.name}
              </Typography>
              <Typography
                sx={{ fontFamily: MONO, fontSize: '0.7rem', color: '#64748B' }}
              >
                {t.time}
              </Typography>
            </Stack>
            <Typography
              noWrap
              sx={{ fontSize: '0.76rem', color: BODY, mt: 0.25 }}
            >
              {t.text}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          p: 2,
          bgcolor: '#FBFCFD',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.25,
        }}
      >
        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          sx={{ pb: 1, borderBottom: `1px solid ${HAIRLINE}` }}
        >
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: INK }}>
            Margaret H.
          </Typography>
          <Typography
            sx={{ fontFamily: MONO, fontSize: '0.72rem', color: '#64748B' }}
          >
            (614) 555-0142
          </Typography>
        </Stack>
        {MESSAGES.map((m, i) => (
          <Box
            key={i}
            sx={{
              alignSelf: m.from === 'agent' ? 'flex-end' : 'flex-start',
              maxWidth: '65%',
              px: 1.5,
              py: 1,
              borderRadius: '8px',
              fontSize: '0.8rem',
              lineHeight: 1.45,
              bgcolor: m.from === 'agent' ? INK : '#FFFFFF',
              color: m.from === 'agent' ? '#FFFFFF' : INK,
              border: m.from === 'agent' ? 'none' : `1px solid ${HAIRLINE}`,
            }}
          >
            {m.text}
          </Box>
        ))}
        <Box sx={{ alignSelf: 'flex-end' }}>
          <Pill tone='green'>Appointment booked</Pill>
        </Box>
      </Box>
    </Box>
  );
}

function SubscriptionCard({ title, body }) {
  const product = catalogItem(title);
  return (
    <Box sx={{ ...cardSx, p: 3, borderTop: `3px solid ${INK}`, flex: 1 }}>
      <Typography sx={{ ...eyebrowSx, color: SLATE }}>{title}</Typography>
      <Typography
        sx={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: '1.6rem',
          color: INK,
          mt: 1,
        }}
      >
        {formatMoney(product.price)}
        <Box
          component='span'
          sx={{
            fontSize: '0.78rem',
            color: '#64748B',
            ml: 0.75,
            fontWeight: 500,
          }}
        >
          / {product.unit}
        </Box>
      </Typography>
      <Typography
        sx={{ mt: 1.25, color: BODY, fontSize: '0.92rem', lineHeight: 1.55 }}
      >
        {body}
      </Typography>
      <Button
        href={product.href}
        target='_blank'
        rel='noopener noreferrer'
        sx={{ ...outlineButtonSx(false), mt: 2.5, py: 0.8 }}
      >
        {product.cta}
      </Button>
    </Box>
  );
}

function Texting() {
  return (
    <Section id='texting'>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '0.95fr 1.05fr' },
          gap: { xs: 6, md: 8 },
          alignItems: 'center',
        }}
      >
        <Box>
          <SectionHead
            eyebrow='Speed to lead'
            title='The first conversation wins the appointment.'
            lede='Give every lead a text within moments, from your own business number. Add the assistant and it follows up, answers the first questions and books the call while you are on another one.'
          />
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mt: 4 }}
          >
            <SubscriptionCard
              title='Sendblue Line'
              body='Your own iMessage and SMS number, with every thread in the CRM inbox.'
            />
            <SubscriptionCard
              title='Sendblue Bot'
              body='AI follow-up that texts new leads and books appointments for you.'
            />
          </Stack>
        </Box>
        <InboxMock />
      </Box>
    </Section>
  );
}

/* ─────────────────────────────── CRM ─────────────────────────────── */

const FEATURE_ICONS = {
  leads: PersonOutlineIcon,
  inbox: ForumOutlinedIcon,
  business: WorkOutlineIcon,
  leaderboard: EmojiEventsOutlinedIcon,
  insights: InsightsOutlinedIcon,
  marketplace: StorefrontOutlinedIcon,
};

const BOARD = [
  { rank: 1, name: 'Dana R.', sales: 14, premium: 21480 },
  { rank: 2, name: 'Marcus T.', sales: 11, premium: 17325 },
  { rank: 3, name: 'Alicia M.', sales: 9, premium: 13950 },
];

function LeaderboardMock() {
  return (
    <Box sx={{ ...cardSx, overflow: 'hidden' }}>
      <Stack
        direction='row'
        justifyContent='space-between'
        sx={{ px: 2.5, py: 1.5, bgcolor: SLATE }}
      >
        <Typography sx={{ ...eyebrowSx, color: '#FFFFFF' }}>
          Leaderboard · This month
        </Typography>
        <Typography sx={{ ...eyebrowSx, color: '#CBD5E1' }}>Example</Typography>
      </Stack>
      {BOARD.map((row) => (
        <Stack
          key={row.rank}
          direction='row'
          alignItems='center'
          spacing={2}
          sx={{ px: 2.5, py: 1.75, borderTop: `1px solid ${HAIRLINE}` }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '999px',
              display: 'grid',
              placeItems: 'center',
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: '0.8rem',
              bgcolor: row.rank === 1 ? GOLD : NEUTRAL,
              color: INK,
            }}
          >
            {row.rank}
          </Box>
          <Typography
            sx={{ flex: 1, fontWeight: 600, color: INK, fontSize: '0.92rem' }}
          >
            {row.name}
          </Typography>
          <Pill tone='slate'>{row.sales} sales</Pill>
          <Typography
            sx={{
              fontFamily: MONO,
              fontWeight: 700,
              color: GREEN,
              minWidth: 92,
              textAlign: 'right',
            }}
          >
            {formatMoney(row.premium).replace('.00', '')}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

function Crm() {
  return (
    <Section id='crm' tinted>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.1fr 0.9fr' },
          gap: { xs: 5, md: 8 },
          alignItems: 'end',
        }}
      >
        <SectionHead
          eyebrow='The FEX Digital CRM'
          title='One workspace, from first text to issued policy.'
          lede='Your leads land in a CRM built for life insurance agents: work them, text them, track the policies they become and see how you stack up.'
        />
        <LeaderboardMock />
      </Box>
      <Box
        sx={{
          mt: 6,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(3, 1fr)',
          },
          border: `1px solid ${HAIRLINE}`,
          borderRadius: '8px',
          overflow: 'hidden',
          bgcolor: '#FFFFFF',
        }}
      >
        {CRM_FEATURES.map((f, i) => {
          const Icon = FEATURE_ICONS[f.key];
          return (
            <Box
              key={f.key}
              sx={{
                p: 3.5,
                borderTop: {
                  xs: i ? `1px solid ${HAIRLINE}` : 'none',
                  sm: i > 1 ? `1px solid ${HAIRLINE}` : 'none',
                  md: i > 2 ? `1px solid ${HAIRLINE}` : 'none',
                },
                borderLeft: {
                  xs: 'none',
                  sm: i % 2 ? `1px solid ${HAIRLINE}` : 'none',
                  md: i % 3 ? `1px solid ${HAIRLINE}` : 'none',
                },
              }}
            >
              <Icon sx={{ fontSize: 22, color: SLATE }} />
              <Typography sx={{ ...titleSx, fontSize: '1.15rem', mt: 1.5 }}>
                {f.title}
              </Typography>
              <Typography
                sx={{
                  mt: 1,
                  color: BODY,
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                }}
              >
                {f.body}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Section>
  );
}

/* ─────────────────────────── How it works ─────────────────────────── */

function HowItWorks() {
  return (
    <Section>
      <SectionHead
        eyebrow='How it works'
        title='From order to first call in four steps.'
      />
      <Box
        sx={{
          mt: 6,
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: 'repeat(4, 1fr)',
          },
          gap: { xs: 4, md: 4 },
        }}
      >
        {STEPS.map((step, i) => (
          <Box key={step.title} sx={{ borderTop: `2px solid ${INK}`, pt: 2.5 }}>
            <Typography
              sx={{
                fontFamily: MONO,
                fontWeight: 700,
                color: SLATE,
                fontSize: '0.85rem',
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </Typography>
            <Typography sx={{ ...titleSx, fontSize: '1.3rem', mt: 1 }}>
              {step.title}
            </Typography>
            <Typography
              sx={{ mt: 1, color: BODY, fontSize: '0.93rem', lineHeight: 1.6 }}
            >
              {step.body}
            </Typography>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

/* ─────────────────────────────── FAQ ─────────────────────────────── */

function Faq() {
  return (
    <Section id='faq' tinted>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' },
          gap: { xs: 4, md: 8 },
        }}
      >
        <SectionHead
          eyebrow='Questions'
          title='Straight answers.'
          lede='The full details are in our Terms of Service. Anything else, email info@fexdigital.com.'
        />
        <Box sx={{ borderTop: `1px solid ${INK}` }}>
          {FAQ.map((item) => (
            <Box
              key={item.q}
              component='details'
              sx={{
                borderBottom: `1px solid ${HAIRLINE}`,
                '& summary': { listStyle: 'none' },
                '& summary::-webkit-details-marker': { display: 'none' },
                '&[open] .faq-sign': { transform: 'rotate(45deg)' },
              }}
            >
              <Box
                component='summary'
                sx={{
                  py: 2.25,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 2,
                  fontWeight: 600,
                  color: INK,
                  fontSize: '1rem',
                }}
              >
                {item.q}
                <Box
                  className='faq-sign'
                  component='span'
                  sx={{
                    fontFamily: MONO,
                    fontSize: '1.2rem',
                    color: SLATE,
                    transition: 'transform 0.15s ease',
                    lineHeight: 1,
                  }}
                >
                  +
                </Box>
              </Box>
              <Typography
                sx={{
                  pb: 2.5,
                  color: BODY,
                  fontSize: '0.95rem',
                  lineHeight: 1.65,
                  maxWidth: 640,
                }}
              >
                {item.a}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

/* ───────────────────────── Final CTA + footer ───────────────────────── */

function FinalCta() {
  return (
    <Section onInk sx={{ textAlign: 'center' }}>
      <SectionHead
        onInk
        align='center'
        eyebrow='Ready when you are'
        title='Put verified, exclusive leads on your calendar this week.'
        lede='Order in minutes. Leads start arriving in your CRM as soon as your states are set.'
      />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent='center'
        sx={{ mt: 5 }}
      >
        <Button
          href={PRIMARY.href}
          target='_blank'
          rel='noopener noreferrer'
          endIcon={<ArrowForwardIcon />}
          sx={{ ...goldButtonSx, fontSize: '1rem' }}
        >
          Order Website Leads
        </Button>
        <Button
          component={RouterLink}
          to={SIGN_IN_PATH}
          sx={outlineButtonSx(true)}
        >
          Agent sign in
        </Button>
      </Stack>
    </Section>
  );
}

function Footer() {
  return (
    <Box
      component='footer'
      sx={{ bgcolor: INK, borderTop: `1px solid ${ON_INK_RULE}`, py: 5 }}
    >
      <Container maxWidth='lg' sx={{ px: { xs: 2.5, md: 4 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ md: 'center' }}
          spacing={3}
        >
          <Box
            component='img'
            src='/fexdigital-logo-white.svg'
            alt='FEX Digital'
            sx={{ height: 26, alignSelf: 'flex-start' }}
          />
          <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
            {[
              { label: 'Terms of Service', to: '/terms-of-service' },
              { label: 'Privacy Policy', to: '/privacy-policy' },
              { label: 'Sign in', to: SIGN_IN_PATH },
            ].map((l) => (
              <Link
                key={l.to}
                component={RouterLink}
                to={l.to}
                underline='hover'
                sx={{ color: ON_INK_MUTED, fontSize: '0.85rem' }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href='mailto:info@fexdigital.com'
              underline='hover'
              sx={{ color: ON_INK_MUTED, fontSize: '0.85rem' }}
            >
              info@fexdigital.com
            </Link>
          </Stack>
        </Stack>
        <Typography
          sx={{
            mt: 4,
            fontSize: '0.75rem',
            color: 'rgba(241,245,249,0.5)',
            lineHeight: 1.6,
            maxWidth: 820,
          }}
        >
          © {new Date().getFullYear()} Final Expense Digital, LLC. FEX Digital
          sells leads, live transfers and software to licensed life insurance
          agents. FEX Digital is not an insurance company and does not issue
          policies. Leads are generated on GetSeniorQuotes.com.
        </Typography>
      </Container>
    </Box>
  );
}

const Landing = () => {
  useEffect(() => {
    const previous = document.title;
    document.title = 'FEX Digital · Verified, exclusive life insurance leads';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <Box
      sx={{
        width: '100%',
        fontFamily: SANS,
        bgcolor: '#FFFFFF',
        scrollBehavior: 'smooth',
      }}
    >
      <NavBar />
      <main>
        <Hero />
        <FactStrip />
        <Comparison />
        <LeadMatrix />
        <Verification />
        <Texting />
        <Crm />
        <HowItWorks />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </Box>
  );
};

export default Landing;
