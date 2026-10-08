// Shared building blocks for the Marketplace storefront pages, styled with
// the CRM's own conventions (Business tab header, outlined paper with a
// colored top stripe, monospaced money, muted status tints).
import {
  Box,
  Button,
  Chip,
  IconButton,
  Link,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import QtyInput from './QtyInput.jsx';
import { CART_PATH, SEGMENTS, storePath } from './cartState.js';

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

/**
 * Page title row, matching the Business tab: serif h4 on the left, actions on
 * the right. Beneath the title sits the optional subtitle and/or `breadcrumb`
 * ({ label, to }) back link.
 */
export function MarketplaceHeader({
  title = 'Marketplace',
  subtitle = '',
  breadcrumb,
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
        {subtitle && <Typography color='text.secondary'>{subtitle}</Typography>}
        {breadcrumb && (
          <Link
            component={RouterLink}
            to={breadcrumb.to}
            underline='hover'
            color='text.secondary'
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            {breadcrumb.label}
          </Link>
        )}
      </Box>
      {actions && (
        <Stack direction='row' spacing={1.5} alignItems='center'>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}

/**
 * Gold "Cart (n) • $x" action that opens the shared cart. `compact` renders a
 * quiet outlined "🛒 n" instead, for pages where another gold CTA (the store's
 * checkout bar) is already the primary path.
 */
export function CartButton({ count, total, to = CART_PATH, compact }) {
  if (compact) {
    return (
      <Button
        variant='outlined'
        color='primary'
        component={RouterLink}
        to={to}
        aria-label={`Cart, ${count} lead${count === 1 ? '' : 's'}`}
        startIcon={<ShoppingBagOutlinedIcon />}
        sx={{ borderColor: BORDER, fontFamily: MONO, fontWeight: 700 }}
      >
        {count}
      </Button>
    );
  }
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

/**
 * Switches between the 31–90 / 91–180 / Banked storefronts. `activeCount`
 * shows the selected segment's availability inline, e.g. "31–90 Day Aged (333)".
 */
export function SegmentToggle({ segmentKey, activeCount }) {
  const navigate = useNavigate();
  return (
    <ToggleButtonGroup
      value={segmentKey}
      exclusive
      size='small'
      onChange={(event, value) => {
        if (!value || value === segmentKey) return;
        navigate(storePath(value));
      }}
    >
      {SEGMENTS.map((segment) => (
        <ToggleButton
          key={segment.key}
          value={segment.key}
          sx={{ px: 2, fontWeight: 600, textTransform: 'none' }}
        >
          {segment.label}
          {segment.key === segmentKey && activeCount != null && (
            <Box
              component='span'
              sx={{
                ml: 0.75,
                fontFamily: MONO,
                fontWeight: 500,
                color: 'text.secondary',
              }}
            >
              ({activeCount.toLocaleString()})
            </Box>
          )}
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

/**
 * Segmented − [qty] + input group, squared off like the CRM's text fields;
 * typing a number is clamped to `max`.
 */
export function QtyStepper({ value, max, onChange, size = 'medium' }) {
  const height = size === 'small' ? 32 : 38;
  const buttonSx = {
    borderRadius: 0,
    width: height,
    height,
    color: 'text.secondary',
    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
    '&.Mui-disabled': { color: 'text.disabled', opacity: 0.5 },
  };
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'stretch',
        border: '1px solid #DDD',
        borderRadius: 1,
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
          fontWeight: 700,
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

/**
 * Cart / checkout summary lines, e.g. "Texas · Verified × 3", grouped under a
 * segment heading when the order spans more than one segment.
 */
export function OrderLines({ items }) {
  const groups = SEGMENTS.map((segment) => ({
    segment,
    lines: items.filter((item) => item.segment === segment.key),
  })).filter((group) => group.lines.length);
  const showHeadings = groups.length > 1;

  return (
    <Stack spacing={2}>
      {groups.map(({ segment, lines }) => (
        <Stack key={segment.key} spacing={1.25}>
          {showHeadings && (
            <Typography
              variant='caption'
              sx={{ fontWeight: 700, color: 'text.secondary' }}
            >
              {segment.label}
            </Typography>
          )}
          {lines.map((item) => (
            <Stack
              key={item.id}
              direction='row'
              justifyContent='space-between'
              alignItems='center'
              spacing={2}
            >
              <Stack
                direction='row'
                spacing={1}
                alignItems='center'
                minWidth={0}
              >
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
      ))}
    </Stack>
  );
}
