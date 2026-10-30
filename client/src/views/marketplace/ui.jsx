// Shared building blocks for the Marketplace storefront pages, styled with
// the CRM's own conventions (Business tab header, outlined paper with a
// colored top stripe, monospaced money, muted status tints).
import {
  Box,
  Button,
  CardActionArea,
  Chip,
  IconButton,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import RemoveIcon from '@mui/icons-material/Remove';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import QtyInput from './QtyInput.jsx';
import {
  CART_PATH,
  SEGMENTS,
  cartLines,
  linesCount,
  useCart,
  useMarketplaceInventory,
} from './cartState.js';

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

// A list price: "$39", but "$1.50" when there are cents to show.
export const formatPrice = (amount) =>
  Number.isInteger(Number(amount)) ? `$${amount}` : formatMoney(amount);

// The price beside a product or lead type, on the store and the hub.
export const priceSx = {
  fontWeight: 600,
  fontSize: '1.125rem',
  lineHeight: 1.3,
  fontVariantNumeric: 'tabular-nums',
};

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
 * Quiet link to the shared cart. The store's checkout bar is the primary path
 * once something is in the cart, so this stays out of the way.
 */
export function CartButton({ count, to = CART_PATH }) {
  return (
    <Button
      variant='outlined'
      color='primary'
      component={RouterLink}
      to={to}
      aria-label={`Cart, ${count} lead${count === 1 ? '' : 's'}`}
      startIcon={<ShoppingBagOutlinedIcon />}
      sx={{ borderColor: BORDER, whiteSpace: 'nowrap' }}
    >
      Cart{count > 0 && ` (${count})`}
    </Button>
  );
}

/** The cart button on the choice pages, once something is in the cart. */
export function CartLink() {
  const [cart] = useCart();
  const { prices } = useMarketplaceInventory();
  const count = linesCount(cartLines(cart, prices));
  return count > 0 ? <CartButton count={count} /> : null;
}

/**
 * A large tile that opens the next step of the Marketplace. A `disabled` tile
 * has nothing to open.
 */
export function ProductTile({
  to,
  icon: Icon,
  title,
  description,
  highlight,
  meta,
  disabled,
}) {
  return (
    <Paper
      variant='outlined'
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: disabled ? '#FAFAFA' : '#FFFFFF',
        transition: 'border-color 0.15s ease',
        '&:hover': disabled ? {} : { borderColor: INK },
      }}
    >
      <CardActionArea
        component={disabled ? 'div' : RouterLink}
        to={disabled ? undefined : to}
        disabled={disabled}
        sx={{
          p: 4,
          height: '100%',
          minHeight: { lg: 300 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            mb: 2.5,
            borderRadius: '50%',
            bgcolor: '#F4F6F8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: disabled ? 'text.disabled' : INK,
          }}
        >
          <Icon />
        </Box>
        <Typography
          variant='h5'
          component='h2'
          color={disabled ? 'text.disabled' : 'text.primary'}
        >
          {title}
        </Typography>
        <Typography
          color={disabled ? 'text.disabled' : 'text.secondary'}
          sx={{ mt: 1, flex: 1 }}
        >
          {description}
        </Typography>
        {highlight && (
          <Typography
            sx={{ mt: 2, fontWeight: 600 }}
            color={disabled ? 'text.disabled' : 'text.primary'}
          >
            {highlight}
          </Typography>
        )}
        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          sx={{ width: '100%', mt: highlight ? 0.5 : 2 }}
        >
          <Typography color={disabled ? 'text.disabled' : 'text.secondary'}>
            {meta}
          </Typography>
          {!disabled && <ArrowForwardIcon sx={{ color: INK }} />}
        </Stack>
      </CardActionArea>
    </Paper>
  );
}

/**
 * A smaller tile for the last choice before the state list: what it is, how
 * many are left and what they cost. A `disabled` tile has nothing to open.
 */
export function ChoiceTile({ to, title, note, highlight, meta, disabled }) {
  return (
    <Paper
      variant='outlined'
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: disabled ? '#FAFAFA' : '#FFFFFF',
        transition: 'border-color 0.15s ease',
        '&:hover': disabled ? {} : { borderColor: INK },
      }}
    >
      <CardActionArea
        component={disabled ? 'div' : RouterLink}
        to={disabled ? undefined : to}
        disabled={disabled}
        sx={{ p: 3 }}
      >
        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          spacing={2}
        >
          <Box>
            <Typography
              component='h3'
              sx={{ fontWeight: 600, fontSize: '1.25rem' }}
              color={disabled ? 'text.disabled' : 'text.primary'}
            >
              {title}
            </Typography>
            {note && (
              <Typography
                sx={{ mt: 0.5 }}
                color={disabled ? 'text.disabled' : 'text.secondary'}
              >
                {note}
              </Typography>
            )}
            <Typography
              sx={{ mt: 0.5, fontWeight: note ? 600 : 400 }}
              color={
                disabled
                  ? 'text.disabled'
                  : note
                    ? 'text.primary'
                    : 'text.secondary'
              }
            >
              {highlight}
              {meta ? `, ${meta}` : ''}
            </Typography>
          </Box>
          {!disabled && <ArrowForwardIcon sx={{ color: INK }} />}
        </Stack>
      </CardActionArea>
    </Paper>
  );
}

/**
 * Verified / Unverified status chip, styled like the Business page's
 * SALE / LEAD chips: the theme's chip type, a muted status tint and a
 * hairline border.
 */
export function LeadTypeChip({ verified, label }) {
  return (
    <Chip
      size='small'
      label={label || (verified ? 'Text Verified' : 'Unverified')}
      sx={{
        // Unverified stays neutral grey: gold is the marketplace's CTA and
        // "most popular" accent. Same grey as the profile's Paused chip.
        bgcolor: verified ? '#E6F1EC' : '#F3F4F6',
        color: verified ? 'success.main' : 'text.secondary',
        border: '1px solid',
        borderColor: 'divider',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Accent color for a lead type's card stripe and dots. Unverified gets the
 * landing page's muted grey stripe; its dots use a darker grey so they still
 * show up at 6px.
 */
export const leadTypeColor = (verified, { dot = false } = {}) => {
  if (verified) return 'success.main';
  return dot ? 'text.disabled' : BORDER;
};

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
                    bgcolor: leadTypeColor(item.type === 'verified', {
                      dot: true,
                    }),
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
