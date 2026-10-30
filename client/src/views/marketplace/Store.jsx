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
  IconButton,
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
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  AGED_BANKED_PATH,
  CART_PATH,
  cartLines,
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
    body: 'Never assigned to or worked by any agent.',
  },
  {
    title: 'Automatic delivery',
    body: 'Emailed to you as a CSV, and sent to any Ringy, GHL, SendBlue or InsurDial account linked to your email.',
  },
  {
    title: 'Final sale',
    body: 'No refunds or replacements, verified or unverified.',
  },
];

// Plain words for the sub-categories, folded away with the lead's fields.
const SOURCE_HELP = {
  funnel: 'Funnel leads filled out the quote form on GetSeniorQuotes and selected a quote.',
  instant: 'Instant Form leads filled out a short form on Facebook or Instagram.',
};
const VERIFIED_HELP = 'Verified means the phone number was confirmed by text.';

/**
 * One state's quantity for one lead type: what's left and a plus button, with
 * the full stepper appearing once any are picked.
 */
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
          —
        </Typography>
      ) : qty > 0 ? (
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
      ) : (
        <Stack direction='row' spacing={1.25} alignItems='center'>
          <IconButton
            size='small'
            aria-label={`Add ${label}`}
            onClick={() => onChange(1)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1,
              border: `1px solid ${BORDER}`,
              bgcolor: '#FFFFFF',
              color: 'text.primary',
            }}
          >
            <AddIcon fontSize='small' />
          </IconButton>
          <Typography variant='body2' color='text.secondary'>
            {count.toLocaleString()} left
          </Typography>
        </Stack>
      )}
    </Box>
  );
}

/** Every state with leads, with a quantity picker per lead type. */
function StateTable({ states, segment, cart, prices, search, onChange }) {
  const verifiedOnly = segment.verifiedOnly;
  const visible = states.filter(
    (s) =>
      (s.verified > 0 || (!verifiedOnly && s.unverified > 0)) &&
      s.name.toLowerCase().includes(search.toLowerCase()),
  );
  const columns = {
    xs: 'minmax(0, 1fr)',
    // A set width for the state, so the quantities sit close to it on wide screens
    md: verifiedOnly ? 'minmax(110px, 240px) 1fr' : 'minmax(110px, 240px) 1fr 1fr',
  };
  const verifiedLabel = `Verified ${formatPrice(prices.verified)}`;
  const unverifiedLabel = `Unverified ${formatPrice(prices.unverified)}`;
  return (
      <Paper
        variant='outlined'
        sx={{
          borderRadius: 2,
          overflowY: 'auto',
          maxHeight: { md: 'max(360px, calc(100vh - 340px))' },
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
        </Box>
        {visible.map((state) => {
          const qty = cart[state.name] || { verified: 0, unverified: 0 };
          const picked = qty.verified + qty.unverified > 0;
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
              <Typography sx={{ fontWeight: picked ? 600 : 500 }}>
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
  );
}

/** What the words mean and what comes with a lead, folded away until asked for. */
function AboutLeads({ help, fields }) {
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
        About these leads
        <ExpandMoreIcon
          sx={{
            fontSize: 18,
            transition: 'transform 0.15s ease',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </Link>
      <Collapse in={open}>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1.5 }}>
          {help}
        </Typography>
        <Typography variant='body2' sx={{ fontWeight: 600, mt: 1.5 }}>
          Every lead includes
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 1,
            mt: 1,
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
  const [search, setSearch] = useState('');
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
    setSearch('');
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
          breadcrumb={{ label: 'Back', to: AGED_BANKED_PATH }}
        />

        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          useFlexGap
          flexWrap='wrap'
          spacing={2}
        >
          <SegmentToggle segmentKey={segment.key} />
          <TextField
            size='small'
            placeholder='Search'
            aria-label='Search states'
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
            sx={{ width: { xs: '100%', sm: 180 } }}
          />
        </Stack>

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
            <Typography color='text.secondary'>Check back soon.</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            <StateTable
              key={segment.key}
              states={allStates}
              segment={segment}
              cart={segmentCart}
              prices={prices}
              search={search}
              onChange={setQuantity}
            />
            <AboutLeads
              help={`${SOURCE_HELP[segment.source]}${segment.verifiedOnly ? '' : ` ${VERIFIED_HELP}`}`}
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
              <Typography sx={{ fontWeight: 600 }}>
                {cartCount} {cartCount === 1 ? 'lead' : 'leads'} ·{' '}
                {formatMoney(cartTotal)}
              </Typography>
              <Button
                variant='contained'
                color='action'
                component={RouterLink}
                to={CART_PATH}
                endIcon={<ArrowForwardIcon />}
                sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
              >
                Checkout
              </Button>
            </Stack>
          </Container>
        </Paper>
      )}
    </PageContainer>
  );
}
