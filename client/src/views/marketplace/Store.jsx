// Store.jsx — one page per product (aged or banked): pick a state on the left,
// then type a quantity for each lead type sold there, funnel and instant form
// split.
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import {
  AGED_BANKED_PATH,
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
  BAND,
  BAND_DARK,
  BORDER,
  GOLD,
  INK,
  formatMoney,
  formatPrice,
} from './ui.jsx';
import QtyInput from './QtyInput.jsx';
import PageContainer from '../../components/PageContainer';

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

// What each list sells, left to right. Each segment's verifiedOnly flag decides
// whether it gets an Unverified column.
const LISTS = {
  aged: {
    title: 'Aged Leads',
    groups: [
      {
        source: 'funnel',
        title: 'Funnel',
        sets: [
          { key: 'aged_second', title: '31–90 Days' },
          { key: 'aged_third', title: '91–180 Days' },
        ],
      },
      {
        source: 'instant',
        title: 'Instant Form',
        sets: [
          { key: 'instant_aged_second', title: '31–90 Days' },
          { key: 'instant_aged_third', title: '91–180 Days' },
        ],
      },
    ],
  },
  banked: {
    title: 'Banked Leads',
    groups: [
      {
        source: 'funnel',
        title: 'Funnel',
        sets: [{ key: 'banked', title: '0–72 Hours' }],
      },
      {
        source: 'instant',
        title: 'Instant Form',
        sets: [{ key: 'instant_banked', title: '0–72 Hours' }],
      },
    ],
  },
};

const TYPE_LABEL = { verified: 'Verified', unverified: 'Unverified' };
const typesOf = (segmentKey) =>
  SEGMENT_BY_KEY[segmentKey].verifiedOnly
    ? ['verified']
    : ['verified', 'unverified'];

const AGE_SHADE = 'rgba(47, 78, 111, 0.12)';
const CHECKOUT_BAR_HEIGHT = 68;
// An age's block needs this much room; below it the blocks stack.
const AGE_MIN = 372;

// What the words on this page mean, short enough to read at a glance.
const ABOUT_ROWS = [
  ['Funnel', 'Quote form, with full quote details.'],
  ['Instant Form', 'Facebook or Instagram form answers.'],
  ['Verified', 'Funnel phone confirmed by text.'],
  ['Unverified', 'Funnel phone not confirmed.'],
];
const ABOUT_DELIVERY = {
  aged: [['Delivery', 'Emailed to you as a CSV.']],
  banked: [
    [
      'Delivery',
      'Emailed as a CSV, and sent to any Ringy, GHL, SendBlue or InsurDial account linked to your email.',
    ],
    ['Final Sale', 'No refunds or replacements.'],
  ],
};

// The same five columns in the heading and on every line, so each value sits
// right under its label.
const lineColumns = {
  display: 'grid',
  gridTemplateColumns:
    'minmax(84px, 130px) minmax(44px, 90px) minmax(66px, 1fr) 64px minmax(64px, 1fr)',
  columnGap: 1,
  alignItems: 'center',
  justifyItems: 'start',
  '& > :nth-child(3), & > :nth-child(4)': { justifySelf: 'center' },
  '& > :nth-child(5)': { justifySelf: 'end' },
};

/** One lead type: its price, how many, a box to type the quantity, the cost. */
function TypeLine({ type, label, price, count, qty, onChange }) {
  const picked = qty > 0;
  const textSx = { fontSize: '0.9375rem', fontVariantNumeric: 'tabular-nums' };
  return (
    <Box sx={{ ...lineColumns, minHeight: 42 }}>
      <Typography sx={{ ...textSx, fontWeight: 500 }}>
        {TYPE_LABEL[type]}
      </Typography>
      <Typography sx={textSx}>
        {price != null ? formatPrice(price) : ''}
      </Typography>
      {count > 0 ? (
        <>
          <Typography sx={textSx}>{count.toLocaleString()}</Typography>
          <QtyInput
            live
            value={qty}
            max={count}
            onChange={onChange}
            placeholder=''
            ariaLabel={`Quantity, ${label}, ${count} available`}
            sx={{
              width: 60,
              height: 36,
              border: '1px solid',
              borderColor: picked ? GOLD : '#C4CBD2',
              borderRadius: 1,
              // A light tint of the CRM's gold once it has a number
              bgcolor: picked ? '#FBF5DF' : '#FFFFFF',
              color: 'text.primary',
              fontSize: '0.9375rem',
              fontVariantNumeric: 'tabular-nums',
              '&:hover, &:focus': { borderColor: INK },
            }}
          />
          <Typography sx={{ ...textSx, fontWeight: 600 }}>
            {picked ? formatMoney(qty * price) : ''}
          </Typography>
        </>
      ) : (
        <Typography color='text.disabled' sx={{ fontSize: '0.9375rem' }}>
          None
        </Typography>
      )}
    </Box>
  );
}

/** One age of leads for the selected state. */
function AgeBlock({ groupTitle, set, state, bySegment, cart, onChange }) {
  const inventory = bySegment[set.key].data;
  const countOf = (type) => inventory?.states?.[state]?.[type] ?? 0;
  return (
    <Box sx={{ bgcolor: '#FFFFFF' }}>
      <Typography
        sx={{ py: 0.75, fontWeight: 700, textAlign: 'center', bgcolor: AGE_SHADE }}
      >
        {set.title}
      </Typography>
      <Box sx={{ ...lineColumns, px: 2, pt: 1, pb: 0.25 }}>
        {['Type', 'Price', 'Available', 'Quantity', 'Subtotal'].map((heading) => (
          <Typography
            key={heading}
            color='text.secondary'
            sx={{ fontSize: '0.75rem', fontWeight: 700 }}
          >
            {heading}
          </Typography>
        ))}
      </Box>
      <Box sx={{ px: 2, pb: 1 }}>
        {typesOf(set.key).map((type) => (
          <TypeLine
            key={type}
            type={type}
            label={`${state}, ${groupTitle}, ${set.title}, ${TYPE_LABEL[type]}`}
            price={inventory?.prices?.[type]}
            count={countOf(type)}
            qty={cart[set.key]?.[state]?.[type] || 0}
            onChange={(value) =>
              onChange(set.key, state, type, Math.min(value, countOf(type)))
            }
          />
        ))}
      </Box>
    </Box>
  );
}

const panelTitleSx = {
  px: 2,
  py: 1,
  fontWeight: 700,
  bgcolor: AGE_SHADE,
  borderRadius: '8px 8px 0 0',
};

/** Everything picked so far, across every state. */
function CartPanel({ lines }) {
  const sorted = [...lines].sort((a, b) => a.state.localeCompare(b.state));
  return (
    <Paper
      variant='outlined'
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Typography sx={panelTitleSx}>Your Cart</Typography>
      <Box sx={{ px: 2, py: 1, overflow: 'auto', flex: 1, minHeight: 0 }}>
        {sorted.length === 0 && (
          <Typography
            color='text.secondary'
            sx={{ fontSize: '0.875rem', py: 1 }}
          >
            Nothing yet. Type a quantity to add leads.
          </Typography>
        )}
        {sorted.map((line) => {
          const { source, tier } = SEGMENT_BY_KEY[line.segment];
          const age = { second: '31–90', third: '91–180' }[tier] || '0–72';
          return (
            <Stack
              key={line.id}
              direction='row'
              justifyContent='space-between'
              spacing={1}
              sx={{ py: 0.5 }}
            >
              <Typography sx={{ fontSize: '0.8125rem' }}>
                <Box component='span' sx={{ fontWeight: 600 }}>
                  {line.state}
                </Box>{' '}
                {source === 'instant' ? 'Instant Form' : 'Funnel'} {age},{' '}
                {TYPE_LABEL[line.type]} × {line.qty}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(line.qty * (line.price || 0))}
              </Typography>
            </Stack>
          );
        })}
      </Box>
    </Paper>
  );
}

/** What the words on the page mean. */
function AboutPanel({ listKey }) {
  return (
    <Paper
      variant='outlined'
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <Typography sx={panelTitleSx}>About These Leads</Typography>
      <Box
        sx={{
          px: 2,
          py: 1,
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          gap: 0.5,
        }}
      >
        {[...ABOUT_ROWS, ...ABOUT_DELIVERY[listKey]].map(([term, meaning]) => (
          <Box
            key={term}
            sx={{
              display: 'grid',
              gridTemplateColumns: '84px minmax(0, 1fr)',
              columnGap: 1,
            }}
          >
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>
              {term}
            </Typography>
            <Typography color='text.secondary' sx={{ fontSize: '0.8125rem' }}>
              {meaning}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}

const savedState = (listKey) => {
  try {
    return sessionStorage.getItem(`fex-store-state-${listKey}`);
  } catch {
    return null;
  }
};

/** The states on the left; the selected state's leads on the right. */
function StatePicker({ list, listKey, bySegment, cart, lines, search, onChange }) {
  const sets = list.groups.flatMap((g) => g.sets);
  const totalOf = (name) =>
    sets.reduce(
      (sum, set) =>
        sum +
        typesOf(set.key).reduce(
          (n, type) => n + (bySegment[set.key].data?.states?.[name]?.[type] ?? 0),
          0,
        ),
      0,
    );
  const inCartOf = (name) =>
    sets.reduce(
      (sum, set) =>
        sum +
        typesOf(set.key).reduce(
          (n, type) => n + (cart[set.key]?.[name]?.[type] || 0),
          0,
        ),
      0,
    );
  const states = [
    ...new Set(
      sets.flatMap((set) => Object.keys(bySegment[set.key].data?.states || {})),
    ),
  ]
    .filter((name) => totalOf(name) > 0)
    .sort((a, b) => a.localeCompare(b));
  const shown = states.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase()),
  );

  // Coming back from the cart returns to the same state.
  const [picked, setPicked] = useState(() => savedState(listKey));
  const pick = (name) => {
    setPicked(name);
    try {
      sessionStorage.setItem(`fex-store-state-${listKey}`, name);
    } catch {
      // storage unavailable; the choice still holds on this page
    }
  };
  const state = shown.includes(picked) ? picked : shown[0];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '230px minmax(0, 1fr)' },
        gap: 2,
        flex: '1 1 auto',
        minHeight: 0,
      }}
    >
      <Paper
        variant='outlined'
        sx={{
          borderRadius: 2,
          overflow: 'auto',
          alignSelf: 'start',
          maxHeight: { xs: 240, md: '100%' },
        }}
      >
        {shown.map((name) => {
          const selected = name === state;
          const inCart = inCartOf(name);
          return (
            <ButtonBase
              key={name}
              onClick={() => pick(name)}
              aria-pressed={selected}
              sx={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                px: 2,
                py: 1.25,
                bgcolor: selected ? INK : 'transparent',
                borderLeft: `3px solid ${selected ? GOLD : 'transparent'}`,
                '& + &': { borderTop: `1px solid ${BORDER}` },
                '&:hover': selected ? {} : { bgcolor: '#F7F7F4' },
              }}
            >
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  color: selected ? '#FFFFFF' : 'text.primary',
                }}
              >
                {name}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  color: selected ? 'rgba(255, 255, 255, 0.75)' : 'text.secondary',
                }}
              >
                {totalOf(name).toLocaleString()} Available
                {inCart > 0 && (
                  <Box
                    component='span'
                    sx={{ ml: 1, fontWeight: 700, color: GOLD }}
                  >
                    {inCart} in cart
                  </Box>
                )}
              </Typography>
            </ButtonBase>
          );
        })}
        {shown.length === 0 && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ p: 3, textAlign: 'center' }}
          >
            No states match "{search}".
          </Typography>
        )}
      </Paper>

      <Box
        sx={{
          overflow: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {state && (
          <>
            <Stack direction='row' alignItems='baseline' spacing={1.5}>
              <Typography variant='h5'>{state}</Typography>
              <Typography color='text.secondary'>
                {totalOf(state).toLocaleString()} Available
              </Typography>
            </Stack>
            <Stack spacing={1.5}>
              {list.groups.map((group) => (
                <Paper
                  key={group.source}
                  variant='outlined'
                  sx={{ borderRadius: 2, overflow: 'hidden' }}
                >
                  <Typography
                    sx={{
                      px: 2,
                      py: 0.75,
                      fontWeight: 700,
                      color: '#FFFFFF',
                      bgcolor: group.source === 'instant' ? BAND_DARK : BAND,
                    }}
                  >
                    {group.title}
                  </Typography>
                  {/* The gap shows through as the line between ages */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(auto-fit, minmax(min(${AGE_MIN}px, 100%), 1fr))`,
                      gap: '1px',
                      bgcolor: BORDER,
                    }}
                  >
                    {group.sets.map((set) => (
                      <AgeBlock
                        key={set.key}
                        groupTitle={group.title}
                        set={set}
                        state={state}
                        bySegment={bySegment}
                        cart={cart}
                        onChange={onChange}
                      />
                    ))}
                  </Box>
                </Paper>
              ))}
            </Stack>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
                gap: 1.5,
                flex: '1 0 176px',
                minHeight: 176,
              }}
            >
              <CartPanel lines={lines} />
              <AboutPanel listKey={listKey} />
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

function Store({ listKey }) {
  const list = LISTS[listKey];
  const isBanked = listKey === 'banked';
  const segmentKeys = list.groups.flatMap((g) => g.sets.map((s) => s.key));
  // One cart across every segment.
  const [cart, updateCart] = useCart();
  const [search, setSearch] = useState('');
  const [showExplainer, setShowExplainer] = useState(() => {
    if (!isBanked) return false;
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
    rememberStore(segmentKeys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  // Every segment's inventory: this list's for the table, all of them to price
  // the shared cart.
  const marketplaceInventory = useMarketplaceInventory();
  const { bySegment } = marketplaceInventory;
  const queries = segmentKeys.map((key) => bySegment[key]);
  const loading = queries.some((q) => q.isLoading);
  const failed = queries.filter((q) => q.isError);
  const anyLeads = list.groups
    .flatMap((g) => g.sets)
    .some((set) =>
      Object.values(bySegment[set.key].data?.states || {}).some((counts) =>
        typesOf(set.key).some((type) => counts[type] > 0),
      ),
    );

  const setQuantity = (segmentKey, state, type, value) => {
    updateCart((prev) => setLineQty(prev, segmentKey, state, type, value));
  };

  // Totals cover the whole shared cart, not just this list.
  const lines = cartLines(cart, marketplaceInventory.prices);
  const cartCount = linesCount(lines);
  const cartTotal = linesTotal(lines);

  return (
    // The full width of the page and the full height of the window below the
    // NavBar (cancelling App's bottom padding), so the table scrolls inside it
    // and clears the checkout bar.
    <PageContainer
      width={false}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'max(480px, calc(100vh - 64px))',
        mb: '-48px',
        pt: 0,
        pb: cartCount > 0 ? `${CHECKOUT_BAR_HEIGHT + 12}px` : 2,
      }}
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

      <Stack spacing={1} sx={{ flex: 1, minHeight: 0 }}>
        <Stack
          direction='row'
          spacing={2}
          alignItems='center'
          sx={{ flexShrink: 0, height: 56 }}
        >
          <Typography variant='h4' sx={{ whiteSpace: 'nowrap' }}>
            {list.title}
          </Typography>
          <Link
            component={RouterLink}
            to={AGED_BANKED_PATH}
            underline='hover'
            color='text.secondary'
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
            Back
          </Link>
          <TextField
            size='small'
            placeholder='Search states'
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
            sx={{ width: 200, ml: 'auto !important', bgcolor: '#FFFFFF' }}
          />
        </Stack>

        {failed.length > 0 && !loading && (
          <Alert
            severity='error'
            action={
              <Button
                color='inherit'
                size='small'
                onClick={() => failed.forEach((q) => q.refetch())}
              >
                Retry
              </Button>
            }
          >
            {failed.length === queries.length
              ? 'Failed to load inventory.'
              : 'Some of these leads failed to load, so their columns are empty.'}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress color='inherit' />
          </Box>
        ) : failed.length === queries.length ? null : !anyLeads ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant='h6'>No leads available right now</Typography>
            <Typography color='text.secondary'>Check back soon.</Typography>
          </Box>
        ) : (
          <StatePicker
            list={list}
            listKey={listKey}
            bySegment={bySegment}
            cart={cart}
            lines={lines}
            search={search}
            onChange={setQuantity}
          />
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
          <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
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

export const AgedLeads = () => <Store key='aged' listKey='aged' />;
export const BankedLeads = () => <Store key='banked' listKey='banked' />;
