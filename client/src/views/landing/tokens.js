// tokens.js
// The landing page's colours, every one taken from the app theme
// (utils/theme.js) so the public page and the logged-in CRM share one
// palette. Nothing here is a new colour: each token is a theme value, or a
// theme value at reduced opacity. To recolour the page, change the theme.
import { alpha } from '@mui/material/styles';
import { createAppTheme } from '../../utils/theme';

const theme = createAppTheme();
const { palette } = theme;

// Deep Ink Navy: the brand anchor. Headlines, dark bands, primary buttons.
export const INK = palette.primary.main;
// Slate Blue: links, tags, rules and other quiet accents.
export const ACCENT = palette.secondary.main;
export const ACCENT_TINT = palette.secondary.light;
export const ACCENT_BORDER = alpha(palette.secondary.main, 0.25);
export const SLATE_NAVY = palette.secondary.main;

// On an Ink background.
export const ON_INK = palette.primary.contrastText;
export const INK_BODY = alpha(palette.primary.contrastText, 0.82);
export const INK_MUTED = alpha(palette.primary.contrastText, 0.6);
export const INK_RULE = alpha(palette.primary.contrastText, 0.14);

// Text on white: body, supporting, and reference (the quietest).
export const SLATE_BODY = palette.text.primary;
export const SLATE_MUTED = palette.text.secondary;
export const SLATE_REFERENCE = palette.text.disabled;

// Surfaces and lines.
export const WHITE = palette.background.paper;
export const SURFACE = palette.background.tinted;
export const NEUTRAL = palette.background.muted;
export const HAIRLINE =
  theme.components.MuiPaper.styleOverrides.outlined.borderColor;
export const HAIRLINE_STRONG =
  theme.components.MuiOutlinedInput.styleOverrides.notchedOutline.borderColor;

// Revenue green: dollar figures and verified milestones only.
export const GREEN = palette.success.main;
export const GREEN_TINT = palette.success.light;
export const GREEN_BORDER = alpha(palette.success.main, 0.2);
export const GREEN_ON_INK = palette.success.light;

// Blocked / destructive states.
export const ERROR = palette.error.main;
export const ERROR_TINT = palette.error.light;
export const ERROR_BORDER = alpha(palette.error.main, 0.2);
