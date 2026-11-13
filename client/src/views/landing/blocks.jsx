// blocks.jsx
// Shared building blocks for the landing-page product sections. Each block
// takes its figures as props, so a product section is its data plus a stack
// of these. Design System v2.0: flat surfaces, 1px hairlines, 999px capsules,
// 8px cards, 4px keys, serif titles, Inter for UI, JetBrains Mono for data.
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';

import {
  ACCENT,
  GREEN,
  GREEN_ON_INK,
  HAIRLINE,
  HAIRLINE_STRONG,
  INK,
  INK_BODY,
  INK_MUTED,
  INK_RULE,
  NEUTRAL,
  ON_INK,
  SLATE_BODY,
  SLATE_MUTED,
  SLATE_NAVY,
  SLATE_REFERENCE,
  SURFACE,
  WHITE,
} from './tokens';

// Colours live in tokens.js (all from the app theme); re-exported here so a
// section can take its blocks and its colours from one import.
export * from './tokens';

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

// border-box so a section given width 100% keeps its side padding inside the
// screen instead of adding it on top (which pushed the page off phones).
// 1088 = the 1040 content column plus the widest side padding (2 x 24).
const sectionPadding = {
  maxWidth: 1088,
  mx: 'auto',
  px: { xs: 2, sm: 3 },
  boxSizing: 'border-box',
};

// Every section on the page shares this rhythm: the same space above and
// below, the same heading size, and body copy at 1rem or larger.
export function Section({ id, eyebrow, title, intro, children, sx }) {
  return (
    <Box
      component='section'
      id={id}
      sx={{
        ...sectionPadding,
        // Sections sit in the page's flex column, so they need a set width.
        width: '100%',
        py: { xs: 5, md: 8 },
        ...sx,
      }}
    >
      <Box sx={{ ...eyebrowSx, color: SLATE_NAVY, mb: 1.5 }}>{eyebrow}</Box>
      <Box
        component='h2'
        sx={{
          m: 0,
          mb: intro ? 1.5 : { xs: 3, md: 5 },
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: { xs: '1.625rem', md: '2.125rem' },
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
            mb: { xs: 3, md: 5 },
            maxWidth: 720,
            color: SLATE_BODY,
            fontSize: { xs: '1rem', md: '1.0625rem' },
            lineHeight: 1.65,
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
        mt: 2.5,
        fontSize: '0.875rem',
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
// footnote: { lead, text }, an optional line under the figures.
export function StatsBand({ id, eyebrow, title, intro, stats, footnote }) {
  return (
    <Box component='section' id={id} sx={{ bgcolor: INK, color: ON_INK }}>
      <Box sx={{ ...sectionPadding, py: { xs: 5, md: 8 } }}>
        <Box sx={{ ...eyebrowSx, color: INK_MUTED, mb: 1.5 }}>{eyebrow}</Box>
        <Box
          component='h2'
          sx={{
            m: 0,
            mb: 1.5,
            maxWidth: 900,
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
            mb: { xs: 4, md: 6 },
            maxWidth: 680,
            color: INK_MUTED,
            fontSize: { xs: '1rem', md: '1.0625rem' },
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
                pt: { xs: 3, md: 4 },
                pb: { xs: 3, md: 0 },
                pl: { xs: 0, md: i === 0 ? 0 : 4 },
                pr: { md: 4 },
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
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  fontWeight: 500,
                  lineHeight: 1.1,
                  color: s.currency ? GREEN_ON_INK : ON_INK,
                  mb: 1.75,
                }}
              >
                {s.value}
              </Box>
              <Box sx={{ ...eyebrowSx, color: INK_MUTED, mb: 1 }}>
                {s.label}
              </Box>
              <Box sx={{ fontSize: '1rem', color: INK_BODY, lineHeight: 1.6 }}>
                {s.note}
              </Box>
            </Box>
          ))}
        </Box>
        {footnote && (
          <Box
            component='p'
            sx={{
              m: 0,
              mt: { xs: 0, md: 5 },
              pt: 3,
              borderTop: `1px solid ${INK_RULE}`,
              maxWidth: 820,
              fontSize: '1rem',
              lineHeight: 1.6,
              color: INK_BODY,
            }}
          >
            <Box component='strong' sx={{ color: ON_INK, fontWeight: 600 }}>
              {footnote.lead}
            </Box>{' '}
            {footnote.text}
          </Box>
        )}
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

// What a sale costs in leads next to what a sale brings in. Each product gets
// two bars on one dollar scale from $0 (lead cost per sale in Ink, average
// annual premium in Green) and the multiple between them. A `reference` row
// drops to muted slate so it reads as the benchmark.
// bars: [{ label, meta, value, premium, reference? }]
const CHART_SERIES = [
  {
    key: 'value',
    name: 'Lead cost per sale',
    color: INK,
    muted: SLATE_REFERENCE,
  },
  {
    key: 'premium',
    name: 'Average annual premium per sale',
    color: GREEN,
    muted: HAIRLINE_STRONG,
  },
];

const dollars = (n) => `$${n.toLocaleString('en-US')}`;
const multiple = (bar) => `${(bar.premium / bar.value).toFixed(1)}×`;

export function CostPerSaleChart({ title, bars, caption }) {
  const max = Math.max(...bars.map((b) => b.premium));
  const summary = bars
    .map(
      (b) =>
        `${b.label}: ${dollars(b.value)} in leads per sale, ${dollars(b.premium)} average annual premium, ${multiple(b)}`,
    )
    .join('. ');
  return (
    <Section eyebrow='Lead cost per sale' title={title}>
      <Box
        aria-hidden='true'
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          columnGap: 3,
          rowGap: 0.75,
          mb: 3,
          fontSize: '0.9375rem',
          color: SLATE_BODY,
        }}
      >
        {CHART_SERIES.map((series) => (
          <Box
            key={series.key}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box
              sx={{
                width: 14,
                height: 14,
                borderRadius: '3px',
                bgcolor: series.color,
              }}
            />
            {series.name}
          </Box>
        ))}
      </Box>

      <Box
        role='img'
        aria-label={`Lead cost per sale compared with average annual premium. ${summary}.`}
        sx={{ borderTop: `1px solid ${HAIRLINE}` }}
      >
        {bars.map((bar) => (
          <Box
            key={bar.label}
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr) auto',
                md: '250px minmax(0, 1fr) 170px',
              },
              alignItems: 'center',
              columnGap: { xs: 2, md: 4 },
              rowGap: 2,
              py: { xs: 3, md: 4 },
              borderBottom: `1px solid ${HAIRLINE}`,
            }}
          >
            <Box>
              <Box
                sx={{
                  fontWeight: 700,
                  fontSize: '1.0625rem',
                  color: INK,
                  mb: 0.5,
                }}
              >
                {bar.label}
              </Box>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.8125rem',
                  color: SLATE_MUTED,
                }}
              >
                {bar.meta}
              </Box>
            </Box>

            <Box
              sx={{
                // Under the label and the multiple on phones.
                gridColumn: { xs: '1 / -1', md: 'auto' },
                gridRow: { xs: 2, md: 'auto' },
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderLeft: `1px solid ${HAIRLINE}`,
              }}
            >
              {CHART_SERIES.map((series) => (
                <Box
                  key={series.key}
                  title={`${bar.label}: ${dollars(bar[series.key])} ${series.name.toLowerCase()}`}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}
                >
                  <Box
                    sx={{
                      height: 28,
                      // The value label sits after the bar, so leave it room.
                      width: `calc((100% - 80px) * ${bar[series.key] / max})`,
                      minWidth: 4,
                      bgcolor: bar.reference ? series.muted : series.color,
                      borderRadius: `0 ${KEY} ${KEY} 0`,
                    }}
                  />
                  <Box
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: bar.reference ? SLATE_MUTED : INK,
                    }}
                  >
                    {dollars(bar[series.key])}
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ textAlign: 'right' }}>
              <Box
                sx={{
                  fontFamily: MONO,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  fontWeight: 500,
                  lineHeight: 1.1,
                  mb: 0.5,
                  color: bar.reference ? SLATE_MUTED : INK,
                }}
              >
                {multiple(bar)}
              </Box>
              <Box sx={{ fontSize: '0.8125rem', color: SLATE_MUTED }}>
                premium per $1 spent
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
          gap: { xs: 2, md: 3 },
        }}
      >
        {cards.map((c) => (
          <Box
            key={c.title}
            sx={{
              bgcolor: WHITE,
              border: `1px solid ${HAIRLINE}`,
              borderTop: `3px solid ${ACCENT}`,
              borderRadius: CARD,
              p: { xs: 3, md: 4 },
            }}
          >
            <Box
              sx={{
                fontFamily: MONO,
                fontSize: { xs: '1.75rem', md: '2.25rem' },
                fontWeight: 500,
                lineHeight: 1.1,
                color: INK,
                mb: 2,
              }}
            >
              {c.stat}
            </Box>
            <Box
              sx={{
                fontFamily: SERIF,
                fontWeight: 700,
                fontSize: '1.25rem',
                lineHeight: 1.3,
                color: INK,
                mb: 1,
              }}
            >
              {c.title}
            </Box>
            <Box sx={{ fontSize: '1rem', color: SLATE_BODY, lineHeight: 1.65 }}>
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

// The "How we measured it" footnote behind every published figure.
function MethodologyText({ methodology, label = 'How we measured it.', sx }) {
  return (
    <Box
      component='p'
      sx={{
        m: 0,
        pt: 2,
        borderTop: `1px solid ${HAIRLINE}`,
        fontSize: '0.75rem',
        color: SLATE_MUTED,
        lineHeight: 1.6,
        ...sx,
      }}
    >
      <Box component='strong' sx={{ color: SLATE_BODY }}>
        {label}
      </Box>{' '}
      {methodology}
    </Box>
  );
}

// The footnotes on their own, once, at the foot of the page.
// notes: [{ label, text }]
export function MethodologyNote({ notes }) {
  return (
    <Box
      sx={{
        ...sectionPadding,
        width: '100%',
        py: { xs: 4, md: 5 },
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {notes.map((n) => (
        <MethodologyText
          key={n.label}
          label={n.label}
          methodology={n.text}
          sx={{ pt: 0, border: 'none' }}
        />
      ))}
    </Box>
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
                color: ACCENT,
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
              color: WHITE,
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
            bgcolor: ACCENT,
            border: `1px solid ${ACCENT}`,
            color: WHITE,
            textDecoration: 'none',
            fontWeight: 700,
            fontSize: '0.9375rem',
            px: 3,
            py: 1.5,
            borderRadius: KEY,
            transition: 'background-color 0.15s',
            '&:hover': { bgcolor: SLATE_NAVY, borderColor: SLATE_NAVY },
            '&:focus-visible': {
              outline: '2px solid ${WHITE}',
              outlineOffset: 2,
            },
          }}
        >
          {cta.label}
        </Box>
      </Box>

      <MethodologyText methodology={methodology} sx={{ mt: 3 }} />
    </Section>
  );
}
