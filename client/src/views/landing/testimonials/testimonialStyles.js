// testimonialStyles.js
// The one place a testimonial's look is defined. Every value comes from the
// landing tokens (and so from the app theme). The card and section take no
// sx, className or style props, so nothing local can override this: to
// change how reviews look, change it here and every card follows.
import {
  CARD,
  HAIRLINE,
  INK,
  MONO,
  NEUTRAL,
  SERIF,
  SLATE_BODY,
  SLATE_MUTED,
  SLATE_REFERENCE,
  SURFACE,
  WHITE,
} from '../blocks';

const freeze = (o) => Object.freeze(o);

export const TESTIMONIAL_STYLES = freeze({
  band: freeze({
    width: '100%',
    bgcolor: SURFACE,
    borderTop: `1px solid ${HAIRLINE}`,
    borderBottom: `1px solid ${HAIRLINE}`,
  }),
  grid: freeze({
    listStyle: 'none',
    m: 0,
    p: 0,
    display: 'grid',
    gridTemplateColumns: {
      xs: 'minmax(0, 1fr)',
      sm: 'repeat(2, minmax(0, 1fr))',
      md: 'repeat(3, minmax(0, 1fr))',
    },
    gap: { xs: 2, md: 3 },
  }),
  card: freeze({
    m: 0,
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    bgcolor: WHITE,
    border: `1px solid ${HAIRLINE}`,
    borderRadius: CARD,
    p: { xs: 3, md: 3.5 },
  }),
  mark: freeze({
    fontFamily: SERIF,
    fontSize: '2.75rem',
    lineHeight: 1,
    height: 28,
    color: SLATE_REFERENCE,
    mb: 1.5,
    userSelect: 'none',
  }),
  quote: freeze({
    m: 0,
    flex: 1,
    color: SLATE_BODY,
    fontSize: '1rem',
    lineHeight: 1.65,
    quotes: 'none',
  }),
  footer: freeze({
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    mt: 3,
    pt: 2.5,
    borderTop: `1px solid ${HAIRLINE}`,
  }),
  avatar: freeze({
    flex: 'none',
    width: 44,
    height: 44,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    bgcolor: NEUTRAL,
    border: `1px solid ${HAIRLINE}`,
    color: INK,
    fontFamily: MONO,
    fontSize: '0.8rem',
    fontWeight: 700,
    '& img': {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      display: 'block',
    },
  }),
  name: freeze({
    fontStyle: 'normal',
    fontWeight: 700,
    fontSize: '0.95rem',
    color: INK,
    lineHeight: 1.3,
  }),
  byline: freeze({
    fontSize: '0.8125rem',
    color: SLATE_MUTED,
    lineHeight: 1.4,
  }),
  disclosure: freeze({
    m: 0,
    mt: 1.5,
    fontSize: '0.75rem',
    color: SLATE_REFERENCE,
    lineHeight: 1.5,
  }),
  disclaimer: freeze({
    m: 0,
    mt: 3,
    maxWidth: 760,
    fontSize: '0.8125rem',
    color: SLATE_MUTED,
    lineHeight: 1.6,
  }),
});
