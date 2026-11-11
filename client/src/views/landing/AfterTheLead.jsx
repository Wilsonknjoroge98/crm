// AfterTheLead.jsx
// "What happens after the lead lands": the three texts an agent gets over the
// life of a fresh lead, each shown as a phone notification. The wording
// follows the real alerts sent by gsq (new lead, came back, calling now);
// keep it in step with them.
import Box from '@mui/material/Box';
import {
  CARD,
  HAIRLINE,
  INK,
  NEUTRAL,
  SLATE_BODY,
  SLATE_MUTED,
  SERIF,
  Section,
  WHITE,
  eyebrowSx,
} from './blocks';

const LEAD = { name: 'Margaret Hall', state: 'OH', phone: '(614) 555-0142' };

const MOMENTS = [
  {
    when: 'Minute one',
    stamp: 'now',
    text: `You have a new lead! ${LEAD.name} (${LEAD.state}). Call now:`,
    phone: LEAD.phone,
    title: 'They ask. Your phone buzzes.',
    body: 'The moment they confirm their number, you get a text and their full record lands in your CRM.',
  },
  {
    when: 'A week later',
    stamp: 'Tue 2:14 PM',
    text: `Your lead ${LEAD.name} came back and asked for a quote again. Call now:`,
    phone: LEAD.phone,
    title: 'They come back. You hear about it.',
    body: "If they ask for another quote in your 30 days, we text you. They aren't sold to anyone else.",
  },
  {
    when: 'Any time',
    stamp: 'now',
    text: `Your lead ${LEAD.name} is calling now. Pick up to connect.`,
    phone: LEAD.phone,
    title: 'They call us. Your phone rings.',
    body: 'When your lead calls our number, the call skips the line and goes straight to you.',
  },
];

function Notification({ stamp, text, phone }) {
  return (
    <Box
      aria-hidden='true'
      sx={{
        bgcolor: NEUTRAL,
        borderRadius: CARD,
        p: { xs: 2, md: 3 },
        // Same height in every column, so the copy below lines up.
        minHeight: { md: 210 },
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          width: '100%',
          bgcolor: WHITE,
          border: `1px solid ${HAIRLINE}`,
          borderRadius: '16px',
          p: 2,
          display: 'flex',
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            flexShrink: 0,
            borderRadius: '9px',
            bgcolor: INK,
            color: WHITE,
            fontSize: '0.575rem',
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
              gap: 1,
              mb: 0.25,
              fontSize: '0.875rem',
            }}
          >
            <Box component='span' sx={{ fontWeight: 700, color: INK }}>
              FEX Digital
            </Box>
            <Box
              component='span'
              sx={{ color: SLATE_MUTED, whiteSpace: 'nowrap' }}
            >
              {stamp}
            </Box>
          </Box>
          <Box sx={{ fontSize: '0.875rem', lineHeight: 1.45, color: INK }}>
            {text}
            {phone && (
              <>
                {' '}
                <Box component='span' sx={{ whiteSpace: 'nowrap' }}>
                  {phone}
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function AfterTheLead() {
  return (
    <Section
      eyebrow='After the lead lands'
      title="Your lead stays yours, and we tell you when they're ready"
      intro='Most vendors send a name and move on. We keep watching your lead and text you the moment they make a move.'
    >
      <Box
        component='ol'
        sx={{
          listStyle: 'none',
          m: 0,
          p: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: { xs: 5, md: 4 },
        }}
      >
        {MOMENTS.map((m) => (
          <Box component='li' key={m.title} sx={{ position: 'relative' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                mb: 2,
              }}
            >
              <Box sx={{ ...eyebrowSx, color: SLATE_MUTED }}>{m.when}</Box>
              <Box sx={{ flex: 1, height: '1px', bgcolor: HAIRLINE }} />
            </Box>

            <Notification stamp={m.stamp} text={m.text} phone={m.phone} />
            {/* The notification is decorative; this carries it for readers. */}
            <Box
              component='span'
              sx={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
                whiteSpace: 'nowrap',
              }}
            >
              Text from FEX Digital: {m.text} {m.phone}
            </Box>

            <Box
              component='h3'
              sx={{
                m: 0,
                mt: 3,
                mb: 1,
                fontFamily: SERIF,
                fontSize: '1.25rem',
                lineHeight: 1.3,
                fontWeight: 700,
                color: INK,
              }}
            >
              {m.title}
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
              {m.body}
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
}
