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
  Collapse,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  AGED_BANKED_PATH,
  CART_PATH,
  SEGMENT_BY_KEY,
  SOURCE_HELP,
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
  MarketplaceHeader,
  formatMoney,
  formatPrice,
} from './ui.jsx';
import QtyInput from './QtyInput.jsx';
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

// Folded away with the lead's fields.
const VERIFIED_HELP = 'Verified means the phone number was confirmed by text.';

// What each list sells, left to right. Each segment's verifiedOnly flag decides
// whether it gets an Unverified column.
const LISTS = {
  aged: {
    title: 'Aged Leads',
    groups: [
      {
        source: 'funnel',
        title: 'Funnel',
        fields: INCLUDED_FIELDS,
        sets: [
          { key: 'aged_second', title: '31–90 Days' },
          { key: 'aged_third', title: '91–180 Days' },
        ],
      },
      {
        source: 'instant',
        title: 'Instant Form',
        fields: INSTANT_FORM_FIELDS,
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
        fields: INCLUDED_FIELDS,
        sets: [{ key: 'banked' }],
      },
      {
        source: 'instant',
        title: 'Instant Form',
        fields: INSTANT_FORM_FIELDS,
        sets: [{ key: 'instant_banked' }],
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
// Wide enough for "317 Available" beside its label and box.
const COLUMN_MIN = 218;
const COLUMN_MAX = 300;
const GROUP_SPLIT = `2px solid ${BAND}`;
const SET_SPLIT = `1px solid ${BORDER}`;
// Marks the instant-form side of a row without hiding the row's hover color
const INSTANT_TINT = 'rgba(47, 78, 111, 0.05)';

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
        width: 48,
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

/** One line of a state's cell: the lead type, how many, and the quantity. */
function TypeLine({ type, label, count, qty, onChange }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '62px minmax(0, 1fr) 48px',
        columnGap: 0.5,
        alignItems: 'center',
        justifyItems: 'center',
        textAlign: 'center',
        minHeight: 34,
      }}
    >
      <Typography
        sx={{ fontSize: '0.8125rem', fontWeight: qty > 0 ? 700 : 500 }}
      >
        {TYPE_LABEL[type]}
      </Typography>
      {count > 0 ? (
        <>
          <Typography
            color='text.secondary'
            sx={{
              fontSize: '0.8125rem',
              lineHeight: 1.2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {count.toLocaleString()} Available
          </Typography>
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

  const n = columns.length;
  const grid = `${STATE_WIDTH}px repeat(${n}, minmax(${COLUMN_MIN}px, 1fr))`;

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
        maxHeight: 'max(360px, calc(100vh - 280px))',
        maxWidth: STATE_WIDTH + n * COLUMN_MAX,
      }}
    >
      <Box sx={{ minWidth: STATE_WIDTH + n * COLUMN_MIN }}>
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
              gridRow: '1 / span 2',
              position: 'sticky',
              left: 0,
              zIndex: 1,
              bgcolor: '#FFFFFF',
              borderRight: SET_SPLIT,
              px: 1.25,
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
                px: 1.25,
                py: 1,
                fontWeight: 700,
                textAlign: 'center',
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
            <Box
              key={column.id}
              sx={{
                gridColumn: i + 2,
                gridRow: 2,
                px: 1.25,
                py: 1,
                textAlign: 'center',
                ...(column.instant && { bgcolor: INSTANT_TINT }),
                ...splitSx(column),
              }}
            >
              {column.setTitle && (
                <Typography variant='body2' sx={{ fontWeight: 700 }}>
                  {column.setTitle}
                </Typography>
              )}
              <Typography variant='caption' color='text.secondary'>
                {column.types
                  .filter((type) => column.prices[type] != null)
                  .map(
                    (type) =>
                      `${TYPE_LABEL[type]} ${formatPrice(column.prices[type])}`,
                  )
                  .join(' · ')}
              </Typography>
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
                px: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                position: 'sticky',
                left: 0,
                zIndex: 1,
                bgcolor: 'inherit',
                borderRight: SET_SPLIT,
              }}
            >
              <Typography sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                {state}
              </Typography>
            </Box>
            {columns.map((column) => (
              <Box
                key={column.id}
                sx={{
                  px: 1,
                  py: 1.75,
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

/** What the words mean and what comes with a lead, folded away until asked for. */
function AboutLeads({ groups }) {
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
          {VERIFIED_HELP}
        </Typography>
        {groups.map((group) => (
          <Box key={group.source} sx={{ mt: 2 }}>
            <Typography variant='body2' sx={{ fontWeight: 700 }}>
              {group.title}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {SOURCE_HELP[group.source]}
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
              {group.fields.map((field) => (
                <Typography key={field} variant='body2' color='text.secondary'>
                  {field}
                </Typography>
              ))}
            </Box>
          </Box>
        ))}
      </Collapse>
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
          title={list.title}
          breadcrumb={{ label: 'Back', to: AGED_BANKED_PATH }}
          actions={
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
              sx={{ width: { xs: '100%', sm: 200 }, bgcolor: '#FFFFFF' }}
            />
          }
        />

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
          <Stack spacing={2}>
            <LeadTable
              columns={columns}
              bySegment={bySegment}
              cart={cart}
              search={search}
              onChange={setQuantity}
            />
            <AboutLeads groups={list.groups} />
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

export const AgedLeads = () => <Store key='aged' listKey='aged' />;
export const BankedLeads = () => <Store key='banked' listKey='banked' />;
