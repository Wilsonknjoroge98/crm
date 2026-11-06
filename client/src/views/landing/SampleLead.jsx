// SampleLead.jsx
// "What's in every Website lead": one sample lead record, the three steps the
// shopper took to become it, and the field chips. Lives below the fold; the
// hero only shows the lead arriving on a phone.
import Box from '@mui/material/Box';
import {
  BLUE,
  CAPSULE,
  CARD,
  Chip,
  GREEN,
  HAIRLINE,
  INK,
  KEY,
  MONO,
  NEUTRAL,
  SLATE_BODY,
  SLATE_MUTED,
  SURFACE,
  Section,
} from './blocks';

const GREEN_TINT = '#EAF4EE';
const GREEN_BORDER = '#C5E0D0';
const BLUE_TINT = '#EEF1FF';
const BLUE_BORDER = '#C9D0FF';

const labelSx = {
  fontSize: '0.65rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
};

const pillTone = {
  neutral: { bgcolor: NEUTRAL, color: SLATE_BODY, borderColor: HAIRLINE },
  verified: { bgcolor: GREEN_TINT, color: GREEN, borderColor: GREEN_BORDER },
  blue: { bgcolor: BLUE_TINT, color: BLUE, borderColor: BLUE_BORDER },
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
  { desc: 'Compared live rates from real carriers', tag: 'Shopped' },
  { desc: 'Picked a plan and a premium', tag: 'Chose' },
  { desc: 'Confirmed her phone with a text code', tag: 'Verified' },
  {
    desc: 'Sent only to you, by text and to your CRM',
    tag: 'Yours',
    emphasis: true,
  },
];

const TAG_TONE = {
  Shopped: 'neutral',
  Chose: 'neutral',
  Verified: 'verified',
  Yours: 'blue',
};

function SampleLeadCard() {
  return (
    <Box
      sx={{
        border: `1px solid ${HAIRLINE}`,
        borderRadius: CARD,
        bgcolor: '#FFFFFF',
        p: { xs: 2, sm: 3 },
      }}
    >
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
        <Pill tone='blue'>16 fields included</Pill>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 1.25,
          mb: 3,
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
            <Box sx={{ ...labelSx, color: SLATE_MUTED, mb: 0.5 }}>
              {spec.label}
            </Box>
            <Box
              sx={{
                fontSize: '0.9375rem',
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

      <Box sx={{ ...labelSx, color: SLATE_MUTED, mb: 1.5 }}>
        How she got to you
      </Box>
      <Box
        component='ol'
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          pl: 1.75,
          ml: 0.5,
          borderLeft: `2px solid ${BLUE}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {STEPS.map((row) => (
          <Box
            component='li'
            key={row.desc}
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 1.5,
              fontSize: '0.875rem',
            }}
          >
            <Box
              component='span'
              sx={{
                color: row.emphasis ? BLUE : SLATE_BODY,
                fontWeight: row.emphasis ? 600 : 400,
              }}
            >
              {row.desc}
            </Box>
            <Box sx={{ flexShrink: 0 }}>
              <Pill tone={TAG_TONE[row.tag]}>{row.tag}</Pill>
            </Box>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          borderTop: `1px solid ${HAIRLINE}`,
          pt: 1.75,
          mt: 2.5,
          fontSize: '0.8125rem',
          color: SLATE_MUTED,
        }}
      >
        Sample lead. Unsold leads can be resold as aged leads after 30 days.
      </Box>
    </Box>
  );
}

export default function SampleLeadSection({ eyebrow, title, intro, chipRows }) {
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro}>
      <SampleLeadCard />
      {chipRows?.length > 0 && (
        <Box
          sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.25 }}
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
