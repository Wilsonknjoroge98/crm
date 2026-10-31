// Store.jsx — one list per product (aged or banked): every state, with a
// quantity for every lead type sold under it, funnel and instant form split.
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

const STATE_WIDTH = 110;
// Each fits its lead type, price, count and box without crowding. The funnel's
// columns hold two lead types and more leads, so they get the extra room.
const FUNNEL_MIN = 224;
const INSTANT_MIN = 212;
const FUNNEL_SHARE = 1.25;
const CELL_PX = 0.75;
// The same four spreadsheet columns in the heading and on every line, so each
// value sits right under its label.
const lineColumns = (labelWidth) => ({
  display: 'grid',
  gridTemplateColumns: `${labelWidth} 36px minmax(50px, 1fr) 44px`,
  columnGap: 0.5,
  alignItems: 'center',
  // The price right after the type, the count midway to the box
  justifyItems: 'start',
  '& > :nth-child(3)': { justifySelf: 'center' },
  '& > :nth-child(4)': { justifySelf: 'end' },
});
// The price moves out from the type as the column gets room.
const labelWidthOf = (column) =>
  column.types.length > 1 ? 'clamp(70px, 30%, 96px)' : 'clamp(54px, 28%, 84px)';
const GROUP_SPLIT = `2px solid ${BAND}`;
const SET_SPLIT = `1px solid ${BORDER}`;
// Marks the instant-form side of a row without hiding the row's hover color
const INSTANT_TINT = 'rgba(47, 78, 111, 0.05)';
const CHECKOUT_BAR_HEIGHT = 68;

/** The box a quantity is typed into; navy once something is picked. */
function QtyBox({ label, count, qty, onChange }) {
  const picked = qty > 0;
  return (
    <QtyInput
      live
      value={qty}
      max={count}
      onChange={onChange}
      placeholder=''
      ariaLabel={`Quantity, ${label}, ${count} available`}
      sx={{
        width: 44,
        height: 30,
        border: '1px solid',
        borderColor: picked ? BAND : '#C4CBD2',
        borderRadius: 1,
        bgcolor: picked ? BAND : '#FFFFFF',
        color: picked ? '#FFFFFF' : 'text.primary',
        fontSize: '0.875rem',
        fontVariantNumeric: 'tabular-nums',
        '&:hover': { borderColor: INK },
        '&:focus': {
          borderColor: INK,
          bgcolor: '#FFFFFF',
          color: 'text.primary',
        },
      }}
    />
  );
}

/** One line of a state's cell: lead type, price, how many, and the quantity. */
function TypeLine({ type, label, price, count, qty, onChange, labelWidth }) {
  const valueSx = { fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' };
  return (
    <Box sx={{ ...lineColumns(labelWidth), minHeight: 34 }}>
      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>
        {TYPE_LABEL[type]}
      </Typography>
      <Typography sx={valueSx}>
        {price != null ? formatPrice(price) : ''}
      </Typography>
      {count > 0 ? (
        <>
          <Typography sx={valueSx}>{count.toLocaleString()}</Typography>
          <QtyBox label={label} count={count} qty={qty} onChange={onChange} />
        </>
      ) : (
        <Typography color='text.disabled' sx={{ fontSize: '0.8125rem' }}>
          None
        </Typography>
      )}
    </Box>
  );
}

/** The columns in order (one per age of leads), with where the splits fall. */
function columnsOf(list, bySegment) {
  return list.groups.flatMap((group, g) =>
    group.sets.map((set, s) => ({
      id: set.key,
      types: typesOf(set.key),
      groupTitle: group.title,
      setTitle: set.title,
      instant: group.source === 'instant',
      prices: bySegment[set.key].data?.prices || {},
      firstInGroup: g > 0 && s === 0,
      firstInSet: s > 0,
    })),
  );
}

const splitSx = (column) => ({
  ...(column.firstInGroup && { borderLeft: GROUP_SPLIT }),
  ...(column.firstInSet && { borderLeft: SET_SPLIT }),
});

/** Every state with leads, and a quantity for every lead type in the list. */
function LeadTable({ columns, bySegment, cart, search, onChange }) {
  const countOf = (column, state, type) =>
    bySegment[column.id].data?.states?.[state]?.[type] ?? 0;
  const rows = [
    ...new Set(
      columns.flatMap((c) => Object.keys(bySegment[c.id].data?.states || {})),
    ),
  ]
    .sort((a, b) => a.localeCompare(b))
    .filter(
      (name) =>
        columns.some((c) => c.types.some((t) => countOf(c, name, t) > 0)) &&
        name.toLowerCase().includes(search.toLowerCase()),
    );

  const grid = [
    `${STATE_WIDTH}px`,
    ...columns.map((c) =>
      c.instant
        ? `minmax(${INSTANT_MIN}px, 1fr)`
        : `minmax(${FUNNEL_MIN}px, ${FUNNEL_SHARE}fr)`,
    ),
  ].join(' ');
  const minWidth = columns.reduce(
    (sum, c) => sum + (c.instant ? INSTANT_MIN : FUNNEL_MIN),
    STATE_WIDTH,
  );

  // The bands run across their group's columns, built from the columns so the
  // spans can never disagree with them.
  const groupCells = columns.reduce((out, column, i) => {
    const last = out[out.length - 1];
    if (last && last.key === column.groupTitle) last.span += 1;
    else out.push({ key: column.groupTitle, column, start: i + 2, span: 1 });
    return out;
  }, []);

  return (
    <Paper
      variant='outlined'
      sx={{
        borderRadius: 2,
        overflow: 'auto',
        flex: '0 1 auto',
        minHeight: 0,
      }}
    >
      <Box sx={{ minWidth }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: grid,
            position: 'sticky',
            top: 0,
            zIndex: 2,
            bgcolor: '#FFFFFF',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          {/* The corner stays put when the table scrolls either way */}
          <Box
            sx={{
              gridColumn: 1,
              gridRow: '1 / span 3',
              position: 'sticky',
              left: 0,
              zIndex: 1,
              bgcolor: '#FFFFFF',
              borderRight: SET_SPLIT,
              px: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component='img'
              src='/fexdigital.png'
              alt='FEX Digital'
              sx={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>
          {groupCells.map(({ key, column, start, span }) => (
            <Typography
              key={key}
              sx={{
                gridColumn: `${start} / span ${span}`,
                gridRow: 1,
                px: CELL_PX,
                py: 1,
                fontWeight: 700,
                color: '#FFFFFF',
                bgcolor: column.instant ? BAND_DARK : BAND,
                ...(column.firstInGroup && {
                  borderLeft: '2px solid #FFFFFF',
                }),
              }}
            >
              {key}
            </Typography>
          ))}
          {columns.map((column, i) => (
            <Typography
              key={column.id}
              variant='body2'
              sx={{
                gridColumn: i + 2,
                gridRow: 2,
                px: CELL_PX,
                pt: 2,
                pb: 1.25,
                fontSize: '1rem',
                lineHeight: 1.5,
                fontWeight: 700,
                ...(column.instant && { bgcolor: INSTANT_TINT }),
                ...splitSx(column),
              }}
            >
              {column.setTitle}
            </Typography>
          ))}
          {columns.map((column, i) => (
            <Box
              key={column.id}
              sx={{
                ...lineColumns(labelWidthOf(column)),
                gridColumn: i + 2,
                gridRow: 3,
                px: CELL_PX,
                pb: 1.25,
                ...(column.instant && { bgcolor: INSTANT_TINT }),
                ...splitSx(column),
              }}
            >
              {['Type', 'Price', 'Available', 'Quantity'].map((heading) => (
                <Typography
                  key={heading}
                  color='text.secondary'
                  sx={{ fontSize: '0.72rem', fontWeight: 700 }}
                >
                  {heading}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>

        {rows.map((state) => (
          <Box
            key={state}
            sx={{
              display: 'grid',
              gridTemplateColumns: grid,
              bgcolor: '#FFFFFF',
              '& + &': { borderTop: `1px solid ${BORDER}` },
              '&:hover': { bgcolor: '#F7F7F4' },
            }}
          >
            <Box
              sx={{
                pl: 0.75,
                pr: 0.25,
                display: 'flex',
                alignItems: 'center',
                position: 'sticky',
                left: 0,
                zIndex: 1,
                bgcolor: 'inherit',
                borderRight: SET_SPLIT,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  overflowWrap: 'anywhere',
                }}
              >
                {state}
              </Typography>
            </Box>
            {columns.map((column) => (
              <Box
                key={column.id}
                sx={{
                  px: CELL_PX,
                  py: 1.25,
                  minHeight: 64,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  ...(column.instant && { bgcolor: INSTANT_TINT }),
                  ...splitSx(column),
                }}
              >
                {column.types.map((type) => (
                  <TypeLine
                    key={type}
                    labelWidth={labelWidthOf(column)}
                    price={column.prices[type]}
                    type={type}
                    label={`${state}, ${column.groupTitle}${column.setTitle ? `, ${column.setTitle}` : ''}, ${TYPE_LABEL[type]}`}
                    count={countOf(column, state, type)}
                    qty={cart[column.id]?.[state]?.[type] || 0}
                    onChange={(value) =>
                      onChange(
                        column.id,
                        state,
                        type,
                        Math.min(value, countOf(column, state, type)),
                      )
                    }
                  />
                ))}
              </Box>
            ))}
          </Box>
        ))}
        {rows.length === 0 && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ p: 3, textAlign: 'center' }}
          >
            {search ? `No states match "${search}".` : 'No leads here right now.'}
          </Typography>
        )}
      </Box>
    </Paper>
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
  const columns = columnsOf(list, bySegment);
  const anyLeads = columns.some((c) =>
    Object.values(bySegment[c.id].data?.states || {}).some((counts) =>
      c.types.some((type) => counts[type] > 0),
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
          <LeadTable
            columns={columns}
            bySegment={bySegment}
            cart={cart}
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
