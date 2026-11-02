// Store.jsx — browse inventory by state and build a cart from every lead type
// sold there: aged (31–90 and 91–180 days) or banked, quote-funnel and
// instant-form.
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
  Chip,
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
import { Link as RouterLink, useParams } from 'react-router-dom';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import { MARKETPLACE_PATH } from './api.js';
import {
  CART_PATH,
  SEGMENT_BY_KEY,
  cartLines,
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
  INK,
  MONO,
  SLATE,
  CartButton,
  MarketplaceHeader,
  QtyStepper,
  formatMoney,
  labelSx,
} from './ui.jsx';
import PageContainer from '../../components/PageContainer';

const STATE_ABBR = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  'Dist.Columbia': 'DC',
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

// What each store sells: one card per source, one column per age window.
// Each segment's verifiedOnly flag decides whether it gets an Unverified row.
const LISTS = {
  aged: {
    label: 'Aged Leads',
    groups: [
      {
        source: 'funnel',
        title: 'Website',
        description: 'Quote form, with full quote details',
        sets: [
          { key: 'aged_second', title: '31–90 Days' },
          { key: 'aged_third', title: '91–180 Days' },
        ],
      },
      {
        source: 'instant',
        title: 'Instant Form',
        description: 'Facebook or Instagram form answers',
        sets: [
          { key: 'instant_aged_second', title: '31–90 Days' },
          { key: 'instant_aged_third', title: '91–180 Days' },
        ],
      },
    ],
  },
  banked: {
    label: 'Banked Leads',
    groups: [
      {
        source: 'funnel',
        title: 'Website',
        description: 'Quote form, with full quote details',
        sets: [{ key: 'banked', title: '0–72 Hours' }],
      },
      {
        source: 'instant',
        title: 'Instant Form',
        description: 'Facebook or Instagram form answers',
        sets: [{ key: 'instant_banked', title: '0–72 Hours' }],
      },
    ],
  },
};

const TYPES = {
  verified: {
    label: 'Verified',
    note: 'Entered a 6-digit code texted to their cell',
  },
  unverified: { label: 'Unverified', note: 'Did not enter the texted code' },
};
const typesOf = (segmentKey) =>
  SEGMENT_BY_KEY[segmentKey].verifiedOnly
    ? ['verified']
    : ['verified', 'unverified'];

// Same light grey as the column headers on every DataGrid in the CRM.
const HEADER_SHADE = '#FAFAFA';

/** One age of one lead type: its price, how many, and the quantity. */
function AgeCell({ price, count, failed, qty, onChange }) {
  const priceText = price != null ? formatMoney(price) : '—';
  const priceSx = {
    fontFamily: MONO,
    fontWeight: 700,
    fontSize: '1.3rem',
    lineHeight: 1.2,
  };
  if (failed) {
    return (
      <Typography color='text.disabled' sx={{ fontSize: '0.875rem' }}>
        Couldn’t load
      </Typography>
    );
  }
  if (count === 0) {
    return (
      <Stack direction='row' spacing={1.25} alignItems='center'>
        <Typography sx={{ ...priceSx, color: 'text.disabled' }}>
          {priceText}
        </Typography>
        <Chip
          label='Sold out'
          size='small'
          sx={{
            height: 22,
            fontSize: '0.75rem',
            fontWeight: 500,
            bgcolor: '#F3F4F6',
            color: 'text.secondary',
          }}
        />
      </Stack>
    );
  }
  return (
    <Stack spacing={1} alignItems='flex-start'>
      <Stack direction='row' spacing={1.25} alignItems='baseline'>
        <Typography sx={priceSx}>{priceText}</Typography>
        <Typography color='text.secondary' sx={{ fontSize: '0.8125rem' }}>
          {count.toLocaleString()} available
        </Typography>
      </Stack>
      <QtyStepper value={qty} max={count} onChange={onChange} />
    </Stack>
  );
}

/** One source of leads (funnel or instant form) for the selected state. */
function GroupCard({ group, state, bySegment, cart, onChange }) {
  const types = ['verified', 'unverified'].filter((type) =>
    group.sets.some((set) => typesOf(set.key).includes(type)),
  );
  const columns = {
    display: 'grid',
    gridTemplateColumns: `minmax(200px, 1.3fr) repeat(${group.sets.length}, minmax(190px, 1fr))`,
    columnGap: 3,
    alignItems: 'center',
    px: 3,
  };

  return (
    <Paper
      variant='outlined'
      sx={{
        borderRadius: 2,
        borderColor: BORDER,
        // Same stripe as the Aged and Banked cards on the Marketplace hub.
        borderTop: `3px solid ${SLATE}`,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction='row'
        spacing={1.5}
        alignItems='baseline'
        sx={{ px: 3, py: 2 }}
      >
        <Typography sx={{ ...labelSx, fontSize: '0.8rem', color: INK }}>
          {group.title}
        </Typography>
        <Typography color='text.secondary' sx={{ fontSize: '0.875rem' }}>
          {group.description}
        </Typography>
      </Stack>
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ minWidth: 'fit-content' }}>
          <Box
            sx={{
              ...columns,
              py: 1.25,
              bgcolor: HEADER_SHADE,
              borderTop: `1px solid ${DIVIDER}`,
              borderBottom: `1px solid ${DIVIDER}`,
            }}
          >
            <Typography sx={labelSx}>Type</Typography>
            {group.sets.map((set) => (
              <Typography key={set.key} sx={labelSx}>
                {set.title}
              </Typography>
            ))}
          </Box>
          {types.map((type, i) => (
            <Box
              key={type}
              sx={{
                ...columns,
                py: 2.5,
                ...(i > 0 && { borderTop: `1px solid ${DIVIDER}` }),
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 600 }}>
                  {TYPES[type].label}
                </Typography>
                <Typography
                  color='text.secondary'
                  sx={{ fontSize: '0.8125rem' }}
                >
                  {TYPES[type].note}
                </Typography>
              </Box>
              {group.sets.map((set) => {
                if (!typesOf(set.key).includes(type)) {
                  return <Box key={set.key} />;
                }
                const query = bySegment[set.key];
                const count = query.data?.states?.[state]?.[type] ?? 0;
                return (
                  <AgeCell
                    key={set.key}
                    price={query.data?.prices?.[type]}
                    count={count}
                    failed={!query.data && query.isError}
                    qty={cart[set.key]?.[state]?.[type] || 0}
                    onChange={(value) =>
                      onChange(set.key, state, type, Math.min(value, count))
                    }
                  />
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
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
                  bgcolor: isSelected ? 'rgba(255,255,255,0.12)' : '#F4F6F8',
                  color: isSelected ? '#FFFFFF' : '#667085',
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
                <Chip
                  label={`${inCart} in cart`}
                  size='small'
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: '#FFF8E7',
                    color: '#B78103',
                    border: '1px solid #F5E1A4',
                  }}
                />
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
  // Every aged segment shares one page, and every banked segment another.
  const listKey = leadType === 'fresh' ? 'banked' : 'aged';
  const list = LISTS[listKey];
  const sets = list.groups.flatMap((group) => group.sets);
  // The explainer describes banked leads
  const isFresh = listKey === 'banked';
  const [selectedState, setSelectedState] = useState(null);
  // One cart across every segment; this page edits its own segments' slices.
  const [cart, updateCart] = useCart();
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

  // Switching between aged and banked starts the state picker over.
  useEffect(() => {
    setSelectedState(null);
    rememberStore(sets[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  // Every segment's inventory: this page's for the picker, all of them to
  // price the shared cart.
  const marketplaceInventory = useMarketplaceInventory();
  const { bySegment } = marketplaceInventory;
  const queries = sets.map((set) => bySegment[set.key]);
  const loading = queries.some((q) => q.isLoading);
  // A segment that fails on its own shows "Couldn't load" in its cells.
  const error = queries.every((q) => q.isError);
  const refetchInventory = () =>
    queries.filter((q) => q.isError).forEach((q) => q.refetch());

  // Each state's leads summed across this page's segments, and the same for
  // what's in the cart.
  const sumByState = (countsOf) => {
    const totals = {};
    for (const set of sets) {
      for (const [name, counts] of Object.entries(countsOf(set.key) || {})) {
        totals[name] ??= { verified: 0, unverified: 0 };
        for (const type of typesOf(set.key)) {
          totals[name][type] += counts[type] || 0;
        }
      }
    }
    return totals;
  };
  const states = loading
    ? null
    : sumByState((key) => bySegment[key].data?.states);
  const listCart = sumByState((key) => cart[key]);

  const allStates = states
    ? Object.entries(states)
        .map(([name, counts]) => ({
          name,
          ...counts,
          total: counts.verified + counts.unverified,
        }))
        .filter((state) => state.total > 0)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Auto-select the first state once inventory first arrives. Runs only
  // while selectedState is null, so refetches don't hijack a state the user
  // has clicked on.
  const firstState = allStates[0]?.name;
  useEffect(() => {
    if (firstState && !selectedState) setSelectedState(firstState);
  }, [firstState, selectedState]);

  const activeState =
    allStates.find((state) => state.name === selectedState) || null;

  const setQuantity = (segmentKey, state, type, value) => {
    updateCart((prev) => setLineQty(prev, segmentKey, state, type, value));
  };

  // Totals cover the whole shared cart, not just this page.
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
          breadcrumb={{ label: 'All products', to: MARKETPLACE_PATH }}
          actions={
            // Once the checkout bar is showing it's the primary path, so the
            // header cart steps back to a quiet count.
            <CartButton
              count={cartCount}
              total={cartTotal}
              compact={cartCount > 0}
            />
          }
        />

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
              cart={listCart}
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
                      {activeState.name} {list.label}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      <Box component='span' sx={{ fontFamily: MONO }}>
                        {activeState.total.toLocaleString()}
                      </Box>{' '}
                      leads available in {stateCode(activeState.name)}
                    </Typography>
                  </Box>

                  {list.groups.map((group) => (
                    <GroupCard
                      key={group.source}
                      group={group}
                      state={activeState.name}
                      bySegment={bySegment}
                      cart={cart}
                      onChange={setQuantity}
                    />
                  ))}
                </>
              )}

              {/* same surface as the profile's Leads tab panels, one per source */}
              {list.groups.map((group) => (
                <Paper
                  key={group.source}
                  variant='outlined'
                  sx={{
                    px: 2,
                    py: 1.5,
                    bgcolor: '#FBFBFA',
                    borderColor: '#E5E7EB',
                    borderRadius: 2,
                  }}
                >
                  <Typography sx={{ ...labelSx, mb: 1 }}>
                    Data fields delivered with every{' '}
                    {group.source === 'instant' ? 'instant form' : 'website'}{' '}
                    lead
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(2, 1fr)',
                        md: 'repeat(4, 1fr)',
                      },
                      rowGap: 0.25,
                      columnGap: 1,
                    }}
                  >
                    {(group.source === 'instant'
                      ? INSTANT_FORM_FIELDS
                      : INCLUDED_FIELDS
                    ).map((field) => (
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
              ))}
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
                  sx={{
                    fontFamily: MONO,
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  {cartCount}
                </Box>{' '}
                {cartCount === 1 ? 'lead' : 'leads'} in cart •{' '}
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
