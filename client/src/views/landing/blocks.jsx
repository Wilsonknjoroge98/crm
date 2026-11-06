// blocks.jsx
// Shared building blocks for the landing-page product sections. Each block
// takes its figures as props, so a product section is its data plus a stack
// of these. Design System v2.0: flat surfaces, 1px hairlines, 999px capsules,
// 8px cards, 4px keys, serif titles, Inter for UI, JetBrains Mono for data.
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';

export const INK = '#050A30';
export const BLUE = '#233DFF';
export const BLUE_HOVER = '#1A30D9';
export const INK_RULE = '#1B2150';
export const INK_MUTED = '#9AA3C7';
export const INK_BODY = '#D5D9EC';
export const SLATE_NAVY = '#2F4E6F';
export const SLATE_BODY = '#334155';
export const SLATE_MUTED = '#64748B';
export const SLATE_REFERENCE = '#94A3B8';
export const HAIRLINE = '#E2E8F0';
export const SURFACE = '#F8FAFC';
export const NEUTRAL = '#F1F5F9';
export const GREEN = '#2E6B4F';
export const GREEN_ON_INK = '#86D3A8';

export const SERIF = '"Libre Baskerville", Georgia, serif';
export const MONO =
  '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

export const CAPSULE = '999px';
export const CARD = '8px';
export const KEY = '4px';

export const eyebrowSx = {
  fontFamily: MONO,
  fontSize: '0.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
};

const sectionPadding = { maxWidth: 1040, mx: 'auto', px: { xs: 2, sm: 3 } };

export function Section({ id, eyebrow, title, intro, children, flushTop, sx }) {
  return (
    <Box
      component='section'
      id={id}
      sx={{
        ...sectionPadding,
        pt: flushTop ? 0 : { xs: 5, md: 7 },
        pb: { xs: 5, md: 7 },
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

export function Caption({ children }) {
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

export function Chip({ children }) {
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

// Dark ink band with a serif title and three headline figures.
// stats: [{ value, label, note, currency? }]
export function StatsBand({ id, eyebrow, title, intro, stats }) {
  return (
    <Box component='section' id={id} sx={{ bgcolor: INK, color: '#FFFFFF' }}>
      <Box sx={{ ...sectionPadding, py: { xs: 5, md: 7 } }}>
        <Box sx={{ ...eyebrowSx, color: INK_MUTED, mb: 1 }}>{eyebrow}</Box>
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
          {title}
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
          {intro}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: `repeat(${stats.length}, 1fr)`,
            },
            borderTop: `1px solid ${INK_RULE}`,
          }}
        >
          {stats.map((s, i) => (
            <Box
              key={s.label}
              sx={{
                pt: 3,
                pb: { xs: 3, md: 0 },
                pl: { xs: 0, md: i === 0 ? 0 : 3 },
                pr: { md: 3 },
                borderLeft: { md: i === 0 ? 'none' : `1px solid ${INK_RULE}` },
                borderBottom: {
                  xs: i < stats.length - 1 ? `1px solid ${INK_RULE}` : 'none',
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
                sx={{ fontSize: '0.875rem', color: INK_BODY, lineHeight: 1.5 }}
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

const COMPARISON_HEADERS = [
  'Lead type',
  'Price',
  'Close rate',
  'Avg AP per sale',
  'AP per lead',
  'Lead cost per sale',
];

// rows: [{ type, detail, price, close, apPerSale, apPerLead, costPerSale,
//          reference?, pending? }]. A `pending` row shows its price and the
// pending text in place of results it doesn't have yet.
export function ComparisonTable({
  eyebrow = 'The numbers',
  title,
  rows,
  caption,
  flushTop,
}) {
  return (
    <Section eyebrow={eyebrow} title={title} flushTop={flushTop}>
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
              {COMPARISON_HEADERS.map((h, i) => (
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
            {rows.map((row) => {
              const plain = { color: row.reference ? SLATE_MUTED : INK };
              const money = { color: row.reference ? SLATE_MUTED : GREEN };
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
                  <Box component='td' sx={{ ...cellSx, ...plain }}>
                    {row.price}
                  </Box>
                  {row.pending ? (
                    <Box
                      component='td'
                      colSpan={4}
                      sx={{
                        ...cellSx,
                        fontFamily: 'inherit',
                        color: SLATE_MUTED,
                      }}
                    >
                      {row.pending}
                    </Box>
                  ) : (
                    <>
                      <Box component='td' sx={{ ...cellSx, ...plain }}>
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
                        sx={{ ...cellSx, ...plain, fontWeight: 700 }}
                      >
                        {row.costPerSale}
                      </Box>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      <Caption>{caption}</Caption>
    </Section>
  );
}

// Horizontal bars from $0 with a direct value label on each. A single series
// in Blue; a `reference` bar drops to muted slate so it reads as the benchmark.
// bars: [{ label, meta, value, reference? }]
export function CostPerSaleChart({
  title,
  bars,
  caption,
  max = 500,
  flushTop = true,
}) {
  const summary = bars.map((b) => `${b.label} $${b.value}`).join(', ');
  return (
    <Section eyebrow='Lead cost per sale' title={title} flushTop={flushTop}>
      <Box
        role='img'
        aria-label={`Lead cost per sale: ${summary}.`}
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
      >
        {bars.map((bar) => (
          <Box
            key={bar.label}
            title={`${bar.label}: $${bar.value} per sale (${bar.meta})`}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' },
              alignItems: 'center',
              gap: { xs: 0.75, sm: 2 },
              py: 0.5,
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
      <Caption>{caption}</Caption>
    </Section>
  );
}

// Two-up cards, each led by a mono figure. cards: [{ stat, title, body }]
export function StatCards({ eyebrow, title, cards, tinted = true }) {
  const grid = (
    <Section eyebrow={eyebrow} title={title}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {cards.map((c) => (
          <Box
            key={c.title}
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
              {c.stat}
            </Box>
            <Box
              sx={{ fontWeight: 700, fontSize: '1rem', color: INK, mb: 0.75 }}
            >
              {c.title}
            </Box>
            <Box
              sx={{ fontSize: '0.9rem', color: SLATE_BODY, lineHeight: 1.6 }}
            >
              {c.body}
            </Box>
          </Box>
        ))}
      </Box>
    </Section>
  );
  if (!tinted) return grid;
  return (
    <Box
      sx={{
        bgcolor: SURFACE,
        borderTop: `1px solid ${HAIRLINE}`,
        borderBottom: `1px solid ${HAIRLINE}`,
      }}
    >
      {grid}
    </Box>
  );
}

// Rows of capsule chips. chipRows: string[][]
export function ChipSection({ eyebrow, title, intro, chipRows, flushTop }) {
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro} flushTop={flushTop}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {chipRows.map((row) => (
          <Box
            key={row.join()}
            sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
          >
            {row.map((c) => (
              <Chip key={c}>{c}</Chip>
            ))}
          </Box>
        ))}
      </Box>
    </Section>
  );
}

// Numbered steps, a closing ink call-to-action card, and the methodology note.
// steps: [{ n, title, body }]; cta: { title, body, label, to }
export function GettingStarted({ title, steps, cta, methodology }) {
  return (
    <Section eyebrow='Getting started' title={title} flushTop>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 5,
        }}
      >
        {steps.map((s) => (
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
            {cta.title}
          </Box>
          <Box sx={{ fontSize: '0.9rem', color: INK_MUTED }}>{cta.body}</Box>
        </Box>
        <Box
          component={RouterLink}
          to={cta.to}
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
          {cta.label}
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
        {methodology}
      </Box>
    </Section>
  );
}
