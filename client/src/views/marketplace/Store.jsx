// Store.jsx — browse inventory by state and build a cart for one segment
// (banked, 31–90 day aged or 91–180 day aged).
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
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
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import { MARKETPLACE_PATH, marketplaceFetch } from './api.js';
import {
  BORDER,
  DIVIDER,
  GOLD,
  INK,
  MONO,
  SANS,
  CartButton,
  LeadTypeChip,
  MarketplaceHeader,
  QtyStepper,
  SegmentToggle,
  cartKeyFor,
  formatMoney,
  getSegment,
  labelSx,
  leadTypeColor,
  readCart,
  segmentPath,
} from './ui.jsx';

const STATE_ABBR = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};

const stateCode = (name) => STATE_ABBR[name] || name.slice(0, 2).toUpperCase();

const INCLUDED_FIELDS = [
  'Full Name',
  'Email Address',
  'Phone Number',
  'State',
  'Date of Birth',
  'Gender',
  'Height',
  'Weight',
  'Selected Coverage Amount',
  'Selected Premium',
  'Selected Carrier',
  'Selected Plan Type',
  'Beneficiary Information',
  'Blood Pressure Medication',
  'Cholesterol Medication',
  'Reason for Coverage',
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
    title: 'Refunds',
    body: 'Unverified leads are eligible for refunds through Ringy "bad number" disposition tags, or by emailing info@fexdigital.com for non-Ringy agents.',
  },
];

/** Price + stepper card for one lead type (verified or unverified). */
function TierCard({ verified, unit, count, price, qty, onChange }) {
  return (
    <Paper
      variant='outlined'
      sx={{
        flex: 1,
        p: 2.5,
        borderRadius: 2,
        borderColor: BORDER,
        borderTop: '3px solid',
        borderTopColor: leadTypeColor(verified),
        bgcolor: '#FFFFFF',
      }}
    >
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <LeadTypeChip verified={verified} />
        <Typography
          variant='caption'
          sx={{
            fontWeight: 600,
            color: count > 0 ? 'text.secondary' : 'text.disabled',
          }}
        >
          <Box component='span' sx={{ fontFamily: MONO }}>
            {count.toLocaleString()}
          </Box>{' '}
          available
        </Typography>
      </Stack>

      <Typography
        variant='h4'
        sx={{ fontFamily: MONO, fontWeight: 700, mt: 2, mb: 0.5 }}
      >
        {formatMoney(price)}
        <Typography
          component='span'
          variant='body2'
          color='text.secondary'
          sx={{ ml: 1, fontFamily: SANS }}
        >
          / {unit}
        </Typography>
      </Typography>
      <Typography
        variant='caption'
        color='text.secondary'
        sx={{ display: 'block', mb: 2 }}
      >
        {verified
          ? 'GSQ Funnel • Quote Selected • Phone Text-Verified'
          : 'GSQ Funnel • Quote Selected • Phone Not Text-Verified'}
      </Typography>

      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        sx={{ pt: 2, borderTop: `1px solid ${DIVIDER}` }}
      >
        <QtyStepper value={qty} max={count} onChange={onChange} />
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant='caption' color='text.secondary'>
            Subtotal
          </Typography>
          <Typography
            sx={{
              fontFamily: MONO,
              fontWeight: 700,
              color: qty > 0 ? 'text.primary' : 'text.disabled',
            }}
          >
            {formatMoney(qty * price)}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

/** Searchable list of states with inventory, left of the tier cards. */
function StateRail({ states, cart, selectedState, onSelect }) {
  const [search, setSearch] = useState('');
  const visible = states.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Paper
      variant='outlined'
      sx={{
        width: 280,
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
          placeholder='Search states...'
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
      <List disablePadding sx={{ maxHeight: 560, overflowY: 'auto' }}>
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
              sx={{
                py: 1.25,
                px: 1.5,
                gap: 1.5,
                borderLeft: '3px solid transparent',
                borderBottom: `1px solid ${DIVIDER}`,
                '&.Mui-selected, &.Mui-selected:hover': {
                  bgcolor: INK,
                  borderLeftColor: GOLD,
                  color: '#FFFFFF',
                },
              }}
            >
              <Box
                sx={{
                  width: 32,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: MONO,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  bgcolor: isSelected ? 'rgba(255,255,255,0.12)' : '#F0F4F8',
                  color: isSelected ? '#FFFFFF' : 'text.secondary',
                }}
              >
                {stateCode(state.name)}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 700 : 500,
                    color: 'inherit',
                  }}
                >
                  {state.name}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: isSelected
                      ? 'rgba(255,255,255,0.7)'
                      : 'text.secondary',
                  }}
                >
                  <Box component='span' sx={{ fontFamily: MONO }}>
                    {state.total.toLocaleString()}
                  </Box>{' '}
                  available
                </Typography>
              </Box>
              {inCart > 0 && (
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    fontFamily: MONO,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    bgcolor: isSelected ? GOLD : 'warning.light',
                    color: isSelected ? INK : 'warning.dark',
                  }}
                >
                  {inCart} in cart
                </Box>
              )}
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

export default function Store() {
  const { leadType } = useParams();
  const isFresh = leadType === 'fresh';
  const [searchParams] = useSearchParams();
  const tier = searchParams.get('tier') === 'third' ? 'third' : 'second';
  const segment = getSegment(leadType, tier);
  const cartKey = cartKeyFor(leadType, tier);
  const cartPath = segmentPath(leadType, tier, 'cart');
  const [selectedState, setSelectedState] = useState(null);
  const [cart, setCart] = useState(() => readCart(cartKey));
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

  const updateCart = useCallback(
    (updater) => {
      setCart((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        localStorage.setItem(cartKey, JSON.stringify(next));
        return next;
      });
    },
    [cartKey],
  );

  // Switching segments swaps to that segment's own cart.
  useEffect(() => {
    setCart(readCart(cartKey));
    setSelectedState(null);
  }, [cartKey]);

  const {
    data: inventory,
    isLoading: loading,
    isError: error,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ['inventory', leadType, tier],
    queryFn: async () => {
      const url = isFresh
        ? `/inventoryReport?type=${leadType}`
        : `/inventoryReport?type=${leadType}&tier=${tier}`;
      const res = await marketplaceFetch(url);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
  });

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
    updateCart((prev) => {
      const current = prev[selectedState] || { verified: 0, unverified: 0 };
      return {
        ...prev,
        [selectedState]: {
          ...current,
          [type]: Math.min(Math.max(0, value), activeState[type]),
        },
      };
    });
  };

  const cartItems = Object.values(cart).filter(
    (q) => q.verified > 0 || q.unverified > 0,
  );
  const cartCount = cartItems.reduce(
    (sum, q) => sum + q.verified + q.unverified,
    0,
  );
  const cartTotal = cartItems.reduce(
    (sum, q) =>
      sum + q.verified * verifiedPrice + q.unverified * unverifiedPrice,
    0,
  );
  const currentQty = cart[selectedState] || { verified: 0, unverified: 0 };

  return (
    <Container
      maxWidth={false}
      sx={{ py: 3, px: { xs: 2, md: 3 }, pb: cartCount > 0 ? 12 : 3 }}
    >
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
          actions={
            <CartButton count={cartCount} total={cartTotal} to={cartPath} />
          }
        />

        <Paper variant='outlined' sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent='space-between'
            alignItems={{ md: 'center' }}
            spacing={1.5}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
            >
              <SegmentToggle leadType={leadType} tier={tier} />
              <Typography variant='body2' color='text.secondary'>
                {segment.window}
                {!loading && !error && (
                  <>
                    {' • '}
                    <Box
                      component='span'
                      sx={{ fontFamily: MONO, color: 'text.primary' }}
                    >
                      {totalAvailable.toLocaleString()}
                    </Box>{' '}
                    available
                  </>
                )}
              </Typography>
            </Stack>
            <Link
              component={RouterLink}
              to={MARKETPLACE_PATH}
              underline='hover'
              color='text.secondary'
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <ArrowBackIcon sx={{ fontSize: 16 }} />
              All products
            </Link>
          </Stack>
        </Paper>

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
          <Paper variant='outlined' sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant='h6'>
              No {segment.label.toLowerCase()} available right now
            </Typography>
            <Typography color='text.secondary'>
              Inventory is replenished continuously - check back soon.
            </Typography>
          </Paper>
        ) : (
          <Stack direction='row' spacing={3} alignItems='flex-start'>
            <StateRail
              states={allStates}
              cart={cart}
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
                    <Typography variant='h5'>
                      {activeState.name} {segment.label}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      <Box component='span' sx={{ fontFamily: MONO }}>
                        {(
                          activeState.verified + activeState.unverified
                        ).toLocaleString()}
                      </Box>{' '}
                      leads available in {stateCode(activeState.name)}
                    </Typography>
                  </Box>

                  <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
                    <TierCard
                      verified
                      unit={segment.unit}
                      count={activeState.verified}
                      price={verifiedPrice}
                      qty={currentQty.verified}
                      onChange={(n) => setQuantity('verified', n)}
                    />
                    <TierCard
                      verified={false}
                      unit={segment.unit}
                      count={activeState.unverified}
                      price={unverifiedPrice}
                      qty={currentQty.unverified}
                      onChange={(n) => setQuantity('unverified', n)}
                    />
                  </Stack>
                </>
              )}

              <Paper
                variant='outlined'
                sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}
              >
                <Typography sx={{ ...labelSx, mb: 1.5 }}>
                  Data fields delivered with every lead
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                      xs: 'repeat(2, 1fr)',
                      md: 'repeat(4, 1fr)',
                    },
                    gap: 1,
                  }}
                >
                  {INCLUDED_FIELDS.map((field) => (
                    <Typography
                      key={field}
                      variant='caption'
                      sx={{ display: 'flex', alignItems: 'center' }}
                    >
                      <Box
                        component='span'
                        sx={{
                          width: 4,
                          height: 4,
                          mr: 1,
                          flexShrink: 0,
                          borderRadius: '50%',
                          bgcolor: 'secondary.main',
                        }}
                      />
                      {field}
                    </Typography>
                  ))}
                </Box>
              </Paper>
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
          <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            spacing={2}
            sx={{ px: 3, py: 1.5 }}
          >
            <Typography variant='body2' color='text.secondary'>
              <Box
                component='span'
                sx={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                {cartCount}
              </Box>{' '}
              {segment.unit}
              {cartCount === 1 ? '' : 's'} in cart •{' '}
              <Box component='span' sx={{ fontWeight: 600 }}>
                Total:
              </Box>{' '}
              <Box
                component='span'
                sx={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  color: 'text.primary',
                }}
              >
                {formatMoney(cartTotal)}
              </Box>
            </Typography>
            <Button
              variant='contained'
              color='action'
              component={RouterLink}
              to={cartPath}
              endIcon={<ArrowForwardIcon />}
              sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              Review Order & Checkout
            </Button>
          </Stack>
        </Paper>
      )}
    </Container>
  );
}
