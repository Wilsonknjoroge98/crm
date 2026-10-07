// Shared building blocks for the Marketplace storefront pages, styled with
// the CRM's own conventions (Business tab header, outlined paper with a
// colored top stripe, monospaced money, muted status tints).
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import QtyInput from './QtyInput.jsx';
import { MARKETPLACE_PATH } from './api.js';

export const MONO = '"JetBrains Mono", monospace';
export const SANS = '"Inter", sans-serif';
export const BORDER = '#E0E0E0';
export const DIVIDER = '#F0F0F0';
export const INK = '#051118';
export const SLATE = '#2F4E6F';
export const GOLD = '#D4AF37';

// Small uppercase label used above values and sections across the CRM.
export const labelSx = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: '0.7rem',
  color: 'text.secondary',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  display: 'block',
};

export const formatMoney = (amount) =>
  `$${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// The three things the storefront sells, in order of sales volume. `fresh`
// is what the CRM calls Banked Leads; aged is split into two age windows
// (`tier`).
export const SEGMENTS = [
  {
    key: 'second',
    leadType: 'aged',
    tier: 'second',
    label: '31–90 Day Aged',
    unit: 'aged lead',
    window: 'Submitted 31–90 days ago',
  },
  {
    key: 'third',
    leadType: 'aged',
    tier: 'third',
    label: '91–180 Day Aged',
    unit: 'aged lead',
    window: 'Submitted 91–180 days ago',
  },
  {
    key: 'fresh',
    leadType: 'fresh',
    tier: null,
    label: 'Banked Leads',
    unit: 'banked lead',
    window: 'Submitted within the last 72 hours',
  },
];

export const getSegment = (leadType, tier) =>
  SEGMENTS.find((s) =>
    leadType === 'fresh'
      ? s.key === 'fresh'
      : s.key === (tier === 'third' ? 'third' : 'second'),
  );

// URL of a storefront page ('store' | 'cart' | 'checkout') for a segment.
export const segmentPath = (leadType, tier, page) =>
  `${MARKETPLACE_PATH}/${leadType}/${page}${
    leadType === 'fresh' ? '' : `?tier=${tier === 'third' ? 'third' : 'second'}`
  }`;

// Each segment keeps its own cart in localStorage.
export const cartKeyFor = (leadType, tier) =>
  leadType === 'fresh'
    ? `fex-cart-${leadType}`
    : `fex-cart-${leadType}-${tier === 'third' ? 'third' : 'second'}`;

export const readCart = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
};

/**
 * Page title row, matching the Business tab: serif h4 + subtitle on the left,
 * actions on the right.
 */
export function MarketplaceHeader({
  title = 'Marketplace',
  subtitle = 'Order leads directly to your pipeline.',
  actions,
}) {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent='space-between'
      alignItems={{ md: 'center' }}
      spacing={2}
    >
      <Box>
        <Typography variant='h4'>{title}</Typography>
        <Typography color='text.secondary'>{subtitle}</Typography>
      </Box>
      {actions && (
        <Stack direction='row' spacing={1.5} alignItems='center'>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

/** Gold "Cart (n) • $x" action that opens the segment's cart. */
export function CartButton({ count, total, to }) {
  return (
    <Button
      variant='contained'
      color='action'
      component={RouterLink}
      to={to}
      startIcon={<ShoppingBagOutlinedIcon />}
      sx={{ fontWeight: 700, px: 2.5, whiteSpace: 'nowrap' }}
    >
      Cart (
      <Box component='span' sx={{ fontFamily: MONO }}>
        {count}
      </Box>
      )
      <Box component='span' sx={{ mx: 0.75, opacity: 0.6 }}>
        •
      </Box>
      <Box component='span' sx={{ fontFamily: MONO }}>
        {formatMoney(total)}
      </Box>
    </Button>
  );
}

/** Switches between Banked / 31–90 / 91–180 storefronts. */
export function SegmentToggle({ leadType, tier }) {
  const navigate = useNavigate();
  const current = getSegment(leadType, tier).key;
  return (
    <ToggleButtonGroup
      value={current}
      exclusive
      size='small'
      onChange={(event, value) => {
        if (!value || value === current) return;
        const next = SEGMENTS.find((s) => s.key === value);
        navigate(segmentPath(next.leadType, next.tier, 'store'));
      }}
    >
      {SEGMENTS.map((segment) => (
        <ToggleButton
          key={segment.key}
          value={segment.key}
          sx={{ px: 2, fontWeight: 600, textTransform: 'none' }}
        >
          {segment.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** Verified / Unverified pill, in the CRM's muted status tints. */
export function LeadTypeChip({ verified, label }) {
  return verified ? (
    <Chip
      size='small'
      icon={<CheckCircleOutlinedIcon />}
      label={label || 'Text Verified'}
      sx={{
        bgcolor: 'success.light',
        color: 'success.main',
        '& .MuiChip-icon': { color: 'success.main', fontSize: 16 },
      }}
    />
  ) : (
    <Chip
      size='small'
      label={label || 'Unverified'}
      sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}
    />
  );
}

/** Accent color for a lead type's card stripe and dots. */
export const leadTypeColor = (verified) =>
  verified ? 'success.main' : 'warning.main';

/** Segmented − [qty] + stepper; typing a number is clamped to `max`. */
export function QtyStepper({ value, max, onChange, size = 'medium' }) {
  const height = size === 'small' ? 32 : 38;
  const buttonSx = {
    borderRadius: 0,
    width: height,
    height,
    color: 'text.secondary',
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
  };
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'stretch',
        border: '1px solid #DDD',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#FFFFFF',
      }}
    >
      <IconButton
        aria-label='Decrease quantity'
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        sx={buttonSx}
      >
        <RemoveIcon fontSize='small' />
      </IconButton>
      <QtyInput
        value={value}
        max={max}
        onChange={onChange}
        sx={{
          width: size === 'small' ? 44 : 56,
          fontFamily: MONO,
          fontSize: '0.875rem',
          color: 'text.primary',
          borderLeft: '1px solid #DDD',
          borderRight: '1px solid #DDD',
        }}
      />
      <IconButton
        aria-label='Increase quantity'
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        sx={buttonSx}
      >
        <AddIcon fontSize='small' />
      </IconButton>
    </Box>
  );
}

/** A label/value row in an order summary; values are monospaced. */
export function SummaryRow({ label, value, strong, color }) {
  return (
    <Stack direction='row' justifyContent='space-between' alignItems='baseline'>
      <Typography
        variant='body2'
        sx={{
          color: color || (strong ? 'text.primary' : 'text.secondary'),
          fontWeight: strong ? 700 : 500,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: strong ? '1.05rem' : '0.875rem',
          color: color || 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/** Cart / checkout line label, e.g. "Texas · Verified × 3". */
export function OrderLines({ items }) {
  return (
    <Stack spacing={1.25}>
      {items.map((item) => (
        <Stack
          key={item.id}
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          spacing={2}
        >
          <Stack direction='row' spacing={1} alignItems='center' minWidth={0}>
            <Box
              sx={{
                width: 6,
                height: 6,
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: leadTypeColor(item.type === 'verified'),
              }}
            />
            <Typography variant='body2' noWrap>
              {item.state} ·{' '}
              {item.type === 'verified' ? 'Verified' : 'Unverified'}
              <Box
                component='span'
                sx={{ fontFamily: MONO, color: 'text.secondary', ml: 0.75 }}
              >
                ×{item.qty}
              </Box>
            </Typography>
          </Stack>
          <Typography
            sx={{ fontFamily: MONO, fontWeight: 600, fontSize: '0.875rem' }}
          >
            {formatMoney(item.qty * item.price)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}
