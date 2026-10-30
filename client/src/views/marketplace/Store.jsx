// Store.jsx — browse inventory by state and build a cart for one segment
// (banked, 31–90 day aged or 91–180 day aged, for quote-funnel or instant-form
// leads).
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  Collapse,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  AGED_BANKED_PATH,
  CART_PATH,
  SEGMENTS,
  cartLines,
  countAvailable,
  getSegment,
  linesCount,
  linesTotal,
  rememberStore,
  setLineQty,
  useCart,
  useMarketplaceInventory,
} from './cartState.js';
import {
  BORDER,
  DIVIDER,
  GOLD,
  CartButton,
  MarketplaceHeader,
  QtyStepper,
  SegmentToggle,
  formatMoney,
  formatPrice,
} from './ui.jsx';
import PageContainer from '../../components/PageContainer';

const INCLUDED_FIELDS = [
  'Full Name',
  'Email Address',
  'Phone Number',
  'Reason for Coverage',
  'State',
  'Gender',
  'Date of Birth',
  'Height / Weight',
  'Tobacco Use',
  'Health Rating',
  'Coverage Amount',
  'Monthly Budget',
  'Beneficiary',
  'Best Time to Call',
  'Selected Carrier',
  'Selected Plan',
];

// Meta instant forms collect contact details plus the form's own qualifying
// questions, delivered as one column.
const INSTANT_FORM_FIELDS = [
  'Full Name',
  'Email Address',
  'Phone Number',
  'State',
  'Instant Form Answers',
];

const FRESH_EXPLAINER = [
  {
    title: 'Generated, never issued',
    body: 'These leads were generated from GSQ and have never been assigned or worked by any agent.',
  },
  {
    title: 'Automatic CRM delivery',
    body: 'A CSV file is emailed to you, and leads are pushed automatically to any Ringy, GHL, SendBlue or InsurDial integration linked to your account email.',
  },
  {
    title: 'Final sale',
    body: 'All banked leads, verified and unverified, are final sale and are not eligible for refunds or replacements.',
  },
];

// Plain words for the sub-categories, shown under them.
const SOURCE_HELP = {
  funnel:
    'Funnel leads filled out the quote form on GetSeniorQuotes and selected a quote.',
  instant: 'Instant Form leads filled out a short form on Facebook or Instagram.',
};

/** One state's quantity picker for one lead type. */
function QtyCell({ label, count, qty, onChange }) {
  return (
    <Box>
      {/* The column header says this on wider screens */}
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ display: { xs: 'block', md: 'none' }, mb: 0.5 }}
      >
        {label}
      </Typography>
      {count === 0 ? (
        <Typography variant='body2' color='text.disabled'>
          None
        </Typography>
      ) : (
        <Stack direction='row' spacing={1} alignItems='center'>
          <QtyStepper size='small' value={qty} max={count} onChange={onChange} />
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ whiteSpace: 'nowrap' }}
          >
            of {count.toLocaleString()}
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

/** Every state with leads, with a quantity picker per lead type. */
function StateTable({ states, segment, cart, prices, onChange }) {
  const [search, setSearch] = useState('');
  const verifiedOnly = segment.verifiedOnly;
  const visible = states.filter(
    (s) =>
      (s.verified > 0 || (!verifiedOnly && s.unverified > 0)) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );
  const columns = {
    xs: 'minmax(0, 1fr)',
    // Spread evenly, so the quantities sit close to their state on wide screens
    md: verifiedOnly
      ? 'minmax(110px, 1fr) minmax(160px, 1.5fr) 80px'
      : 'minmax(110px, 0.7fr) minmax(160px, 1fr) minmax(160px, 1fr) 80px',
  };
  const verifiedLabel = `Text Verified, ${formatPrice(prices.verified)} each`;
  const unverifiedLabel = `Unverified, ${formatPrice(prices.unverified)} each`;
  return (
    <Stack spacing={1.5}>
      <TextField
        size='small'
        placeholder='Search states'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <SearchOutlinedIcon fontSize='small' />
              </InputAdornment>
            ),
          },
        }}
        sx={{ width: { xs: '100%', sm: 260 } }}
      />
      <Paper
        variant='outlined'
        sx={{
          borderRadius: 2,
          overflowY: 'auto',
          maxHeight: { md: 'max(360px, calc(100vh - 430px))' },
        }}
      >
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: columns.md,
            columnGap: 2,
            px: 2.5,
            py: 1.5,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            bgcolor: '#FAFAF7',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            State
          </Typography>
          <Typography variant='body2' sx={{ fontWeight: 600 }}>
            {verifiedLabel}
          </Typography>
          {!verifiedOnly && (
            <Typography variant='body2' sx={{ fontWeight: 600 }}>
              {unverifiedLabel}
            </Typography>
          )}
          <Typography variant='body2' sx={{ fontWeight: 600, textAlign: 'right' }}>
            Total
          </Typography>
        </Box>
        {visible.map((state) => {
          const qty = cart[state.name] || { verified: 0, unverified: 0 };
          const total =
            qty.verified * prices.verified + qty.unverified * prices.unverified;
          return (
            <Box
              key={state.name}
              sx={{
                display: 'grid',
                gridTemplateColumns: columns,
                columnGap: 2,
                rowGap: 1,
                alignItems: 'center',
                px: 2.5,
                py: 1,
                '& + &': { borderTop: `1px solid ${DIVIDER}` },
              }}
            >
              <Typography sx={{ fontWeight: total > 0 ? 600 : 500 }}>
                {state.name}
              </Typography>
              <QtyCell
                label={verifiedLabel}
                count={state.verified}
                qty={qty.verified}
                onChange={(n) => onChange(state, 'verified', n)}
              />
              {!verifiedOnly && (
                <QtyCell
                  label={unverifiedLabel}
                  count={state.unverified}
                  qty={qty.unverified}
                  onChange={(n) => onChange(state, 'unverified', n)}
                />
              )}
              <Typography
                sx={{
                  textAlign: { md: 'right' },
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {total > 0 ? formatMoney(total) : ''}
              </Typography>
            </Box>
          );
        })}
        {visible.length === 0 && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ p: 3, textAlign: 'center' }}
          >
            {search ? `No states match "${search}".` : 'No leads here right now.'}
          </Typography>
        )}
      </Paper>
    </Stack>
  );
}

/** The lead's data fields, folded away until someone asks for them. */
function IncludedFields({ fields }) {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Link
        component='button'
        type='button'
        underline='hover'
        color='text.secondary'
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        What's included with every lead
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </Link>
      <Collapse in={open}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 1,
            mt: 1.5,
          }}
        >
          {fields.map((field) => (
            <Typography key={field} variant='body2' color='text.secondary'>
              {field}
            </Typography>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export default function Store() {
  const { leadType } = useParams();
  const [searchParams] = useSearchParams();
  const tier = searchParams.get('tier') === 'third' ? 'third' : 'second';
  const segment = getSegment(leadType, tier, searchParams.get('source'));
  // The explainer describes quote-funnel banked leads
  const isFresh = segment.key === 'banked';
  // One cart across every segment; this page edits its own segment's slice.
  const [cart, updateCart] = useCart();
  const segmentCart = cart[segment.key] || {};
  const [showExplainer, setShowExplainer] = useState(() => {
    if (!isFresh) return false;
    try {
      return !localStorage.getItem('fex-fresh-explainer-seen');
    } catch {
      return false;
    }
  });

  const handleCloseExplainer = () => {
    try {
      localStorage.setItem('fex-fresh-explainer-seen', '1');
    } catch {
      // ignore — storage unavailable (e.g. Safari private mode)
    }
    setShowExplainer(false);
  };

  useEffect(() => {
    rememberStore(segment.key);
  }, [segment.key]);

  // Every segment's inventory: this page's for the picker, all of them to
  // price the shared cart.
  const marketplaceInventory = useMarketplaceInventory();
  const {
    data: inventory,
    isLoading: loading,
    isError: error,
    refetch: refetchInventory,
  } = marketplaceInventory.bySegment[segment.key];

  const states = inventory?.states;
  const verifiedPrice = inventory?.prices?.verified ?? 0;
  const unverifiedPrice = inventory?.prices?.unverified ?? 0;

  const allStates = states
    ? Object.entries(states)
        .map(([name, counts]) => ({
          name,
          ...counts,
          total: counts.verified + counts.unverified,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const prices = {
    verified: verifiedPrice,
    unverified: unverifiedPrice,
  };

  const setQuantity = (state, type, value) => {
    updateCart((prev) =>
      setLineQty(prev, segment.key, state.name, type, Math.min(value, state[type])),
    );
  };

  // What each sub-category holds, shown on its button.
  const counts = Object.fromEntries(
    SEGMENTS.map(({ key }) => {
      const { data } = marketplaceInventory.bySegment[key];
      return [key, data ? countAvailable(data) : null];
    }),
  );

  // Totals cover the whole shared cart, not just this segment.
  const lines = cartLines(cart, marketplaceInventory.prices);
  const cartCount = linesCount(lines);
  const cartTotal = linesTotal(lines);

  return (
    // Capped at lg (1200px) like the marketplace landing page.
    <PageContainer sx={{ pb: cartCount > 0 ? 12 : 3 }}>
      <Dialog
        open={showExplainer}
        onClose={handleCloseExplainer}
        maxWidth='xs'
        fullWidth
      >
        <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: `1px solid ${BORDER}` }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'warning.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            <BoltOutlinedIcon sx={{ color: 'warning.dark' }} />
          </Box>
          <Typography variant='h6'>Banked Leads</Typography>
          <Typography variant='body2' color='text.secondary'>
            A quick overview before you browse inventory.
          </Typography>
        </Box>
        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2}>
            {FRESH_EXPLAINER.map(({ title, body }) => (
              <Stack key={title} direction='row' spacing={1.5}>
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    mt: 0.9,
                    flexShrink: 0,
                    borderRadius: '50%',
                    bgcolor: GOLD,
                  }}
                />
                <Box>
                  <Typography variant='body2' sx={{ fontWeight: 700 }}>
                    {title}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {body}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 0 }}>
          <Button
            fullWidth
            variant='contained'
            color='primary'
            onClick={handleCloseExplainer}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <Stack spacing={2.5}>
        <MarketplaceHeader
          title={segment.leadType === 'fresh' ? 'Banked Leads' : 'Aged Leads'}
          breadcrumb={{ label: 'Aged & Banked Leads', to: AGED_BANKED_PATH }}
          actions={<CartButton count={cartCount} />}
        />

        <Box>
          <SegmentToggle segmentKey={segment.key} counts={counts} />
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
            {SOURCE_HELP[segment.source]} {segment.window}.
            {!segment.verifiedOnly &&
              ' Text Verified means the phone number was confirmed by text.'}
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress color='inherit' />
          </Box>
        ) : error ? (
          <Alert
            severity='error'
            action={
              <Button
                color='inherit'
                size='small'
                onClick={() => refetchInventory()}
              >
                Retry
              </Button>
            }
          >
            Failed to load inventory.
          </Alert>
        ) : allStates.length === 0 ? (
          // the top bar already names the segment
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant='h6'>No leads available right now</Typography>
            <Typography color='text.secondary'>
              Inventory is replenished continuously - check back soon.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            <StateTable
              key={segment.key}
              states={allStates}
              segment={segment}
              cart={segmentCart}
              prices={prices}
              onChange={setQuantity}
            />
            <IncludedFields
              fields={
                segment.source === 'instant'
                  ? INSTANT_FORM_FIELDS
                  : INCLUDED_FIELDS
              }
            />
          </Stack>
        )}
      </Stack>

      {/* Floating checkout bar, only once something is in the cart */}
      {cartCount > 0 && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 220, // clear the CRM side panel
            right: 0,
            zIndex: 40,
            borderTop: `1px solid ${BORDER}`,
            borderRadius: 0,
            boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
          }}
        >
          {/* the bar spans the viewport; its contents line up with the page */}
          <Container maxWidth='lg' sx={{ px: { xs: 2, md: 3 } }}>
            <Stack
              direction='row'
              justifyContent='space-between'
              alignItems='center'
              spacing={2}
              sx={{ py: 1.5 }}
            >
              <Typography variant='body2' color='text.secondary'>
                <Box
                  component='span'
                  sx={{ fontWeight: 700, color: 'text.primary' }}
                >
                  {cartCount}
                </Box>{' '}
                {cartCount === 1 ? 'lead' : 'leads'} in cart •{' '}
                <Box component='span' sx={{ fontWeight: 600 }}>
                  Total:
                </Box>{' '}
                <Box
                  component='span'
                  sx={{ fontWeight: 700, color: 'text.primary' }}
                >
                  {formatMoney(cartTotal)}
                </Box>
              </Typography>
              <Button
                variant='contained'
                color='action'
                component={RouterLink}
                to={CART_PATH}
                endIcon={<ArrowForwardIcon />}
                sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Review Order & Checkout
              </Button>
            </Stack>
          </Container>
        </Paper>
      )}
    </PageContainer>
  );
}
