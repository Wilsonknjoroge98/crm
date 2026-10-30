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
  List,
  ListItemButton,
  MenuItem,
  Paper,
  Select,
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
import { MARKETPLACE_PATH } from './api.js';
import {
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
  CartButton,
  MarketplaceHeader,
  QtyStepper,
  SegmentToggle,
  formatMoney,
  formatPrice,
  priceSx,
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

/** One lead type in the state: what it is, its price, and how many to buy. */
function TierRow({ verified, source, count, price, qty, onChange }) {
  const detail =
    // Meta text-verifies every instant form phone itself
    source === 'instant'
      ? 'Instant form lead, phone text-verified'
      : verified
        ? 'Quote selected, phone text-verified'
        : 'Quote selected, phone not text-verified';
  const soldOut = count === 0;
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr auto',
          lg: 'minmax(0, 1fr) 96px 150px 88px',
        },
        alignItems: 'center',
        columnGap: 2,
        rowGap: 1.5,
        p: 2.5,
        '& + &': { borderTop: `1px solid ${DIVIDER}` },
      }}
    >
      <Box sx={{ gridColumn: { xs: '1 / -1', lg: 'auto' }, minWidth: 0 }}>
        <Typography
          sx={{ fontWeight: 600, color: soldOut ? 'text.disabled' : undefined }}
        >
          {verified ? 'Text Verified' : 'Unverified'}
        </Typography>
        <Typography
          variant='body2'
          color={soldOut ? 'text.disabled' : 'text.secondary'}
        >
          {detail}
        </Typography>
      </Box>
      <Box sx={{ textAlign: { lg: 'right' } }}>
        <Typography
          sx={{ ...priceSx, color: soldOut ? 'text.disabled' : undefined }}
        >
          {formatPrice(price)}
        </Typography>
        <Typography
          variant='caption'
          color={soldOut ? 'text.disabled' : 'text.secondary'}
        >
          per lead
        </Typography>
      </Box>
      {soldOut ? (
        <Typography
          variant='body2'
          color='text.disabled'
          sx={{ gridColumn: { lg: '3 / -1' }, textAlign: 'right' }}
        >
          None available
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              justifySelf: { xs: 'end', lg: 'center' },
              textAlign: 'center',
            }}
          >
            <QtyStepper value={qty} max={count} onChange={onChange} />
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ display: 'block', mt: 0.5 }}
            >
              {count.toLocaleString()} available
            </Typography>
          </Box>
          <Typography
            sx={{
              gridColumn: { xs: '1 / -1', lg: 'auto' },
              textAlign: 'right',
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              // Holds its column on the wide layout so the row doesn't shift
              // when it appears; takes no space when the row is stacked.
              display: { xs: qty > 0 ? 'block' : 'none', lg: 'block' },
              visibility: qty > 0 ? 'visible' : 'hidden',
            }}
          >
            {formatMoney(qty * price)}
          </Typography>
        </>
      )}
    </Box>
  );
}

/** Searchable list of states with inventory, left of the lead types. */
function StateRail({ states, cart, selectedState, onSelect }) {
  const [search, setSearch] = useState('');
  const visible = states.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Paper
      variant='outlined'
      sx={{
        width: 240,
        flexShrink: 0,
        borderRadius: 2,
        overflow: 'hidden',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignSelf: 'flex-start',
        position: 'sticky',
        top: 16,
      }}
    >
      <Box sx={{ p: 1.5, borderBottom: `1px solid ${BORDER}` }}>
        <TextField
          size='small'
          fullWidth
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
          sx={{ '& input': { fontSize: '0.85rem' } }}
        />
      </Box>
      <List disablePadding sx={{ maxHeight: 560, overflowY: 'auto', py: 0.5 }}>
        {visible.map((state) => {
          const isSelected = selectedState === state.name;
          const inCart =
            (cart[state.name]?.verified || 0) +
            (cart[state.name]?.unverified || 0);
          return (
            <ListItemButton
              key={state.name}
              selected={isSelected}
              onClick={() => onSelect(state.name)}
              sx={{ py: 0.75, px: 1.5, gap: 1, alignItems: 'baseline' }}
            >
              <Typography
                sx={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '0.875rem',
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {state.name}
              </Typography>
              {inCart > 0 && (
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'warning.main',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inCart} in cart
                </Typography>
              )}
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: 'text.secondary',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {state.total.toLocaleString()}
              </Typography>
            </ListItemButton>
          );
        })}
        {visible.length === 0 && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ p: 2, textAlign: 'center' }}
          >
            No states match "{search}".
          </Typography>
        )}
      </List>
    </Paper>
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
  const [selectedState, setSelectedState] = useState(null);
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

  // Switching segments starts the state picker over.
  useEffect(() => {
    setSelectedState(null);
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

  // Auto-select the first state once inventory first arrives. Runs only
  // while selectedState is null, so refetches don't hijack a state the user
  // has clicked on.
  useEffect(() => {
    if (states && !selectedState) {
      const firstState = Object.keys(states).sort()[0];
      if (firstState) setSelectedState(firstState);
    }
  }, [states, selectedState]);

  const allStates = states
    ? Object.entries(states)
        .map(([name, counts]) => ({
          name,
          ...counts,
          total: counts.verified + counts.unverified,
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const totalAvailable = allStates.reduce((sum, s) => sum + s.total, 0);

  const activeState =
    selectedState && states?.[selectedState]
      ? { name: selectedState, ...states[selectedState] }
      : null;

  const setQuantity = (type, value) => {
    if (!activeState) return;
    updateCart((prev) =>
      setLineQty(
        prev,
        segment.key,
        selectedState,
        type,
        Math.min(value, activeState[type]),
      ),
    );
  };

  // Totals cover the whole shared cart, not just this segment.
  const lines = cartLines(cart, marketplaceInventory.prices);
  const cartCount = linesCount(lines);
  const cartTotal = linesTotal(lines);
  const currentQty = segmentCart[selectedState] || {
    verified: 0,
    unverified: 0,
  };

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
          title='Aged & Banked Leads'
          breadcrumb={{ label: 'Marketplace', to: MARKETPLACE_PATH }}
          actions={<CartButton count={cartCount} />}
        />

        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          useFlexGap
          flexWrap='wrap'
          spacing={1.5}
        >
          <SegmentToggle segmentKey={segment.key} />
          {!loading && !error && (
            <Typography variant='body2' color='text.secondary'>
              {totalAvailable.toLocaleString()} leads available
            </Typography>
          )}
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
            <Typography color='text.secondary'>
              Inventory is replenished continuously - check back soon.
            </Typography>
          </Box>
        ) : (
          <Stack direction='row' spacing={3} alignItems='flex-start'>
            <StateRail
              states={allStates}
              cart={segmentCart}
              selectedState={selectedState}
              onSelect={setSelectedState}
            />

            <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
              {/* State picker for narrow screens, where the rail is hidden */}
              <Select
                size='small'
                value={selectedState || ''}
                onChange={(e) => setSelectedState(e.target.value)}
                sx={{ display: { xs: 'flex', md: 'none' } }}
              >
                {allStates.map((state) => (
                  <MenuItem key={state.name} value={state.name}>
                    {state.name} — {state.total} available
                  </MenuItem>
                ))}
              </Select>

              {activeState && (
                <>
                  <Box>
                    <Typography variant='h5'>{activeState.name}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {(
                        activeState.verified + activeState.unverified
                      ).toLocaleString()}{' '}
                      leads available. {segment.window}.
                    </Typography>
                  </Box>

                  <Paper variant='outlined' sx={{ borderRadius: 2 }}>
                    <TierRow
                      verified
                      source={segment.source}
                      count={activeState.verified}
                      price={verifiedPrice}
                      qty={currentQty.verified}
                      onChange={(n) => setQuantity('verified', n)}
                    />
                    {!segment.verifiedOnly && (
                      <TierRow
                        verified={false}
                        source={segment.source}
                        count={activeState.unverified}
                        price={unverifiedPrice}
                        qty={currentQty.unverified}
                        onChange={(n) => setQuantity('unverified', n)}
                      />
                    )}
                  </Paper>
                </>
              )}

              <IncludedFields
                fields={
                  segment.source === 'instant'
                    ? INSTANT_FORM_FIELDS
                    : INCLUDED_FIELDS
                }
              />
            </Stack>
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
