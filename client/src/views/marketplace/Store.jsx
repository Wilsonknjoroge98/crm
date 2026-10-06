// Store.jsx
import {
  ThemeProvider,
  Typography,
  Button,
  Box,
  Stack,
  Link,
  TextField,
  InputAdornment,
  CircularProgress,
  Select,
  MenuItem,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Link as RouterLink,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import VerifiedIcon from '@mui/icons-material/Verified';
import BoltIcon from '@mui/icons-material/Bolt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import SearchIcon from '@mui/icons-material/Search';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import theme from './theme.js';
import QtyInput from './QtyInput.jsx';
import { MARKETPLACE_PATH, marketplaceFetch } from './api.js';

const BLUE = '#233dff';
const G50 = '#f9fafb';
const G100 = '#f3f4f6';
const G200 = '#e5e7eb';
const G300 = '#d1d5db';
const G400 = '#9ca3af';
const G500 = '#6b7280';
const G600 = '#4b5563';
const G800 = '#1f2937';
const G900 = '#111827';

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

function LeadCard({
  type,
  leadType,
  count,
  price,
  qty,
  maxQty,
  onDecrement,
  onIncrement,
  onSetQty,
}) {
  const isVerified = type === 'verified';
  const freshOrAged = leadType === 'fresh' ? 'Fresh' : 'Aged';
  // cap respects both inventory and remaining pack slots (fresh orders)
  const cap = maxQty ?? count;

  return (
    <Box
      sx={{
        bgcolor: '#fff',
        borderRadius: '16px',
        border: '2px solid',
        borderColor: isVerified ? `${BLUE}99` : G200,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2, bgcolor: isVerified ? `${BLUE}1A` : G50 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Stack direction='row' spacing={1} alignItems='center'>
            {isVerified ? (
              <VerifiedIcon sx={{ fontSize: 18, color: BLUE }} />
            ) : (
              <BoltIcon sx={{ fontSize: 18, color: G500 }} />
            )}
            <Typography
              sx={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isVerified ? BLUE : G600,
              }}
            >
              {isVerified ? 'Verified Lead' : 'Unverified Lead'}
            </Typography>
          </Stack>
          <Box
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 500,
              bgcolor: isVerified ? '#dbeafe' : G100,
              color: isVerified ? BLUE : G500,
            }}
          >
            {count} available
          </Box>
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 2.5 }}>
        <Stack
          direction='row'
          spacing={0.5}
          alignItems='baseline'
          sx={{ mb: 0.5 }}
        >
          <Typography
            sx={{ fontSize: '1.875rem', fontWeight: 700, color: G900 }}
          >
            ${price.toFixed(2)}
          </Typography>
          <Typography sx={{ fontSize: '0.875rem', color: G400 }}>
            / {freshOrAged.toLowerCase()} lead
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.875rem', color: G500, mb: 3 }}>
          {isVerified
            ? 'GSQ funnel | Quote selected | Phone text-verified'
            : 'GSQ funnel | Quote selected | Phone not text-verified'}
        </Typography>

        {/* Qty stepper + subtotal */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              border: '1px solid',
              borderColor: G200,
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <Box
              component='button'
              onClick={onDecrement}
              disabled={qty === 0}
              sx={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: 500,
                color: qty === 0 ? G300 : G500,
                bgcolor: 'transparent',
                border: 'none',
                cursor: qty === 0 ? 'default' : 'pointer',
                '&:hover': qty > 0 ? { bgcolor: G50 } : {},
                transition: 'background 0.15s',
              }}
            >
              −
            </Box>
            <QtyInput
              value={qty}
              max={cap}
              onChange={onSetQty}
              sx={{
                width: 56,
                height: 44,
                fontSize: '0.875rem',
                color: G900,
                borderLeft: '1px solid',
                borderRight: '1px solid',
                borderColor: G200,
              }}
            />
            <Box
              component='button'
              onClick={onIncrement}
              disabled={qty >= cap}
              sx={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                fontWeight: 500,
                color: qty >= cap ? G300 : G800,
                bgcolor: 'transparent',
                border: 'none',
                cursor: qty >= cap ? 'default' : 'pointer',
                '&:hover': qty < cap ? { bgcolor: G50 } : {},
                transition: 'background 0.15s',
              }}
            >
              +
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.75rem', color: G400, mb: 0.25 }}>
              Subtotal
            </Typography>
            <Typography
              sx={{ fontSize: '1.125rem', fontWeight: 700, color: G900 }}
            >
              ${(qty * price).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function Store() {
  const { leadType } = useParams();
  const isFresh = leadType === 'fresh';
  const [searchParams, setSearchParams] = useSearchParams();
  const tier = searchParams.get('tier') === 'third' ? 'third' : 'second';
  const cartKey = isFresh
    ? `fex-cart-${leadType}`
    : `fex-cart-${leadType}-${tier}`;
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(cartKey)) || {};
    } catch {
      return {};
    }
  });
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

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem(cartKey)) || {});
    } catch {
      setCart({});
    }
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
  const prices = inventory?.prices;
  const verifiedPrice = prices?.verified ?? 0;
  const unverifiedPrice = prices?.unverified ?? 0;

  // Auto-select the first state once inventory first arrives. Runs
  // only when selectedState is still null, so refetches don't hijack
  // a state the user has actively clicked on.
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

  const filteredStates = allStates.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (!states) return;
    const totals = Object.values(states).reduce(
      (acc, counts) => ({
        verified: acc.verified + counts.verified,
        unverified: acc.unverified + counts.unverified,
      }),
      { verified: 0, unverified: 0 },
    );
    if (import.meta.env.DEV) {
      console.log(
        `[${tier}] verified: ${totals.verified}, unverified: ${totals.unverified}`,
      );
    }
  }, [states, tier]);

  const activeState =
    selectedState && states
      ? { name: selectedState, ...states[selectedState] }
      : null;

  const handleQuantityChange = (type, delta) => {
    if (!selectedState) return;
    updateCart((prev) => {
      const current = prev[selectedState] || { verified: 0, unverified: 0 };
      const max = activeState[type];
      return {
        ...prev,
        [selectedState]: {
          ...current,
          [type]: Math.min(Math.max(0, current[type] + delta), max),
        },
      };
    });
  };

  const handleSetQuantity = (type, value) => {
    if (!selectedState) return;
    updateCart((prev) => {
      const current = prev[selectedState] || { verified: 0, unverified: 0 };
      const max = activeState[type];
      return {
        ...prev,
        [selectedState]: {
          ...current,
          [type]: Math.min(Math.max(0, value), max),
        },
      };
    });
  };

  const cartItems = Object.entries(cart).filter(
    ([, q]) => q.verified > 0 || q.unverified > 0,
  );
  const totalVerified = cartItems.reduce((sum, [, q]) => sum + q.verified, 0);
  const totalUnverified = cartItems.reduce(
    (sum, [, q]) => sum + q.unverified,
    0,
  );
  const cartCount = totalVerified + totalUnverified;
  const cartTotal = cartItems.reduce(
    (sum, [, q]) =>
      sum + q.verified * verifiedPrice + q.unverified * unverifiedPrice,
    0,
  );

  const currentQty = cart[selectedState] || { verified: 0, unverified: 0 };
  const verifiedMaxQty = activeState?.verified ?? 0;
  const unverifiedMaxQty = activeState?.unverified ?? 0;

  return (
    <ThemeProvider theme={theme}>
      {/* Fresh leads first-visit explainer */}
      <Dialog
        open={showExplainer}
        onClose={handleCloseExplainer}
        maxWidth='xs'
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px', p: 0, overflow: 'hidden' },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            pt: 3,
            pb: 2,
            borderBottom: '1px solid',
            borderColor: G100,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: `${BLUE}1A`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1.5,
            }}
          >
            <BoltIcon sx={{ fontSize: 20, color: BLUE }} />
          </Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: G900 }}>
            Fresh Leads
          </Typography>
          <Typography sx={{ fontSize: '0.8rem', color: G500, mt: 0.5 }}>
            A quick overview before you browse inventory.
          </Typography>
        </Box>

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          <Stack spacing={2.5}>
            {[
              {
                title: 'Generated, never issued',
                body: 'These leads were generated from GSQ and have never been assigned or worked by any agent.',
              },
              {
                title: 'Automatic CRM delivery',
                body: 'A CSV file will be provided via email. Additionally, Leads will be pushed automatically to your CRM (GHL, Ringy, or InsurDial) if the email on your order is linked to an active integration in the GSQ system.',
              },
              {
                title: 'Refunds',
                body: 'Unverified leads are eligible for refunds either through Ringy "bad number" disposition tags or by emailing info@fexdigital.com for non-Ringy agents.',
              },
            ].map(({ title, body }) => (
              <Stack
                key={title}
                direction='row'
                spacing={1.5}
                alignItems='flex-start'
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    height: 'calc(0.875rem * 1.5)',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: BLUE,
                    }}
                  />
                </Box>
                <Box>
                  <Typography
                    sx={{ fontSize: '0.875rem', fontWeight: 600, color: G900 }}
                  >
                    {title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.8rem',
                      color: G500,
                      mt: 0.25,
                      lineHeight: 1.5,
                    }}
                  >
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
            disableElevation
            onClick={handleCloseExplainer}
            sx={{
              bgcolor: BLUE,
              fontWeight: 600,
              fontSize: '0.875rem',
              textTransform: 'none',
              borderRadius: '8px',
              py: 1.25,
              '&:hover': { bgcolor: '#1c33e0' },
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          width: '100%',
          bgcolor: G50,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Nav */}
        <Box
          component='header'
          sx={{
            borderBottom: '1px solid',
            borderColor: G200,
            bgcolor: '#fff',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <Box
            sx={{
              maxWidth: 1280,
              mx: 'auto',
              px: 3,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction='row' spacing={2} alignItems='center'>
              <Link component={RouterLink} to={MARKETPLACE_PATH}>
                <Box
                  component='img'
                  src='/fexdigital-logo.svg'
                  alt='FEX Digital'
                  sx={{ height: 36 }}
                />
              </Link>
              <Box
                sx={{
                  bgcolor: isFresh ? BLUE : '#fff',
                  color: isFresh ? '#fff' : G800,
                  border: isFresh ? 'none' : '1px solid',
                  borderColor: G300,
                  fontSize: '0.7rem',
                  fontWeight: isFresh ? 700 : 500,
                  px: 1.25,
                  py: 0.4,
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {isFresh ? 'Fresh' : 'Aged'}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: isFresh ? BLUE : G800,
                  fontWeight: 500,
                }}
              >
                {isFresh
                  ? 'Submitted within the last 72 hours'
                  : tier === 'third'
                    ? 'Submitted 91–180 days ago'
                    : 'Submitted 31–90 days ago'}
              </Typography>
            </Stack>
            <Link
              component={RouterLink}
              to={`${MARKETPLACE_PATH}/${leadType}/cart${leadType === 'fresh' ? '' : `?tier=${tier}`}`}
              underline='none'
            >
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: '1px solid',
                  borderColor: G200,
                  bgcolor: '#fff',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: G800,
                  cursor: 'pointer',
                  '&:hover': { borderColor: G300 },
                  transition: 'border-color 0.15s',
                }}
              >
                <ShoppingCartIcon sx={{ fontSize: 16 }} />
                Cart
                {cartCount > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      bgcolor: isFresh ? BLUE : G800,
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cartCount > 99 ? '99+' : cartCount}
                  </Box>
                )}
              </Box>
            </Link>
          </Box>

          {!isFresh && (
            <Box sx={{ borderTop: '1px solid', borderColor: G100 }}>
              <Box
                sx={{
                  maxWidth: 1280,
                  mx: 'auto',
                  px: 3,
                  display: 'flex',
                  gap: 5,
                }}
              >
                {[
                  { key: 'second', label: '31–90 Day Leads' },
                  { key: 'third', label: '91–180 Day Leads' },
                ].map(({ key, label }) => {
                  const active = tier === key;
                  return (
                    <Box
                      key={key}
                      component='button'
                      onClick={() => setSearchParams({ tier: key })}
                      sx={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: 1,
                        border: 'none',
                        borderBottom: '2px solid',
                        borderColor: active ? G900 : 'transparent',
                        bgcolor: 'transparent',
                        pt: 1.75,
                        pb: 1.5,
                        px: 0,
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease',
                        '&:hover': {
                          borderColor: active ? G900 : G300,
                        },
                      }}
                    >
                      <Typography
                        component='span'
                        sx={{
                          fontSize: '0.9375rem',
                          fontWeight: active ? 600 : 500,
                          letterSpacing: '0.01em',
                          color: active ? G900 : G500,
                          transition: 'color 0.2s ease',
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>

        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              flex: 1,
              gap: 2,
            }}
          >
            <Typography sx={{ color: G500, fontSize: '0.875rem' }}>
              Failed to load inventory.
            </Typography>
            <Button
              variant='outlined'
              onClick={() => refetchInventory()}
              sx={{
                borderColor: G200,
                color: G800,
                fontWeight: 600,
                fontSize: '0.875rem',
                borderRadius: '8px',
                textTransform: 'none',
                '&:hover': { bgcolor: G50 },
              }}
            >
              Retry
            </Button>
          </Box>
        ) : allStates.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flex: 1,
              pt: '20vh',
              color: G400,
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: '1rem', fontWeight: 500, color: G600 }}>
              No {isFresh ? 'fresh' : 'aged'} leads are currently available.
            </Typography>
            <Typography sx={{ fontSize: '0.875rem' }}>
              Inventory is replenished continuously.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              maxWidth: 1280,
              mx: 'auto',
              width: '100%',
              px: 3,
              py: 4,
              pb: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              minHeight: 'calc(100vh - 80px)',
            }}
          >
            {/* Sidebar + Lead cards */}
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Left: State list */}
              <Box
                component='aside'
                sx={{
                  width: 256,
                  flexShrink: 0,
                  display: { xs: 'none', sm: 'flex' },
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <Link
                  component={RouterLink}
                  to={MARKETPLACE_PATH}
                  underline='none'
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    color: G500,
                    mb: 2,
                    '&:hover': { color: BLUE },
                    transition: 'color 0.15s',
                  }}
                >
                  <ArrowBackIcon sx={{ fontSize: 16 }} />
                  Back to lead types
                </Link>
                <Box
                  sx={{
                    bgcolor: '#fff',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: G200,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    flex: '1 1 0',
                  }}
                >
                  {/* Search */}
                  <Box
                    sx={{ p: 2, borderBottom: '1px solid', borderColor: G100 }}
                  >
                    <TextField
                      size='small'
                      placeholder='Search states...'
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position='start'>
                            <SearchIcon sx={{ fontSize: 14, color: G400 }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          fontSize: '0.875rem',
                          borderRadius: '8px',
                          '& fieldset': { borderColor: G200 },
                          '&:hover fieldset': { borderColor: G300 },
                          '&.Mui-focused fieldset': {
                            borderColor: BLUE,
                            borderWidth: 2,
                          },
                        },
                      }}
                    />
                  </Box>

                  {/* State list */}
                  <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {filteredStates.map((state) => {
                      const isSelected = selectedState === state.name;
                      const stateCart = cart[state.name] || {
                        verified: 0,
                        unverified: 0,
                      };
                      const hasItems =
                        stateCart.verified > 0 || stateCart.unverified > 0;
                      return (
                        <Box
                          key={state.name}
                          onClick={() => setSelectedState(state.name)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            px: 2,
                            py: 1.5,
                            cursor: 'pointer',
                            borderBottom: '1px solid',
                            borderColor: `${G50}`,
                            borderLeft: isSelected
                              ? `2px solid ${BLUE}`
                              : '2px solid transparent',
                            bgcolor: isSelected ? `${BLUE}08` : 'transparent',
                            '&:hover': {
                              bgcolor: isSelected ? `${BLUE}08` : G50,
                            },
                            transition: 'background 0.15s',
                            '&:last-child': { borderBottom: 'none' },
                          }}
                        >
                          <Stack
                            direction='row'
                            spacing={1.5}
                            alignItems='center'
                          >
                            <Box
                              sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                bgcolor: isSelected
                                  ? BLUE
                                  : hasItems
                                    ? `${BLUE}1A`
                                    : G100,
                                color: isSelected
                                  ? '#fff'
                                  : hasItems
                                    ? BLUE
                                    : G600,
                              }}
                            >
                              {STATE_ABBR[state.name] ||
                                state.name.slice(0, 2).toUpperCase()}
                            </Box>
                            <Box>
                              <Typography
                                sx={{
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  color: isSelected
                                    ? BLUE
                                    : hasItems
                                      ? BLUE
                                      : G800,
                                }}
                              >
                                {state.name}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: '0.75rem',
                                  color: hasItems ? BLUE : G400,
                                }}
                              >
                                {hasItems
                                  ? `${stateCart.verified + stateCart.unverified}/${state.total} selected`
                                  : `${state.total} available`}
                              </Typography>
                            </Box>
                          </Stack>
                          {isSelected && (
                            <ChevronRightIcon
                              sx={{ fontSize: 14, color: BLUE }}
                            />
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* Right: Lead cards */}
              <Box
                component='main'
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  pt: '36px',
                }}
              >
                {/* Mobile state selector */}
                <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 3 }}>
                  <Select
                    value={selectedState || ''}
                    onChange={(e) => setSelectedState(e.target.value)}
                    fullWidth
                    size='small'
                    sx={{
                      bgcolor: '#fff',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: G200,
                      },
                    }}
                  >
                    {allStates.map((state) => (
                      <MenuItem
                        key={state.name}
                        value={state.name}
                        sx={{ fontSize: '0.875rem' }}
                      >
                        {state.name} — {state.total} leads
                      </MenuItem>
                    ))}
                  </Select>
                </Box>

                {activeState ? (
                  <>
                    <Box sx={{ mb: 3 }}>
                      <Typography
                        sx={{
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          color: G900,
                        }}
                      >
                        {activeState.name} {isFresh ? 'Fresh' : 'Aged'} Leads
                      </Typography>
                      <Typography
                        sx={{ fontSize: '0.875rem', color: G500, mt: 0.5 }}
                      >
                        {activeState.verified + activeState.unverified} total
                        leads available
                      </Typography>
                    </Box>

                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2.5}
                      sx={{ '& > *': { flex: 1 } }}
                    >
                      <LeadCard
                        type='verified'
                        leadType={leadType}
                        count={activeState.verified}
                        price={verifiedPrice}
                        qty={currentQty.verified}
                        maxQty={verifiedMaxQty}
                        onDecrement={() => handleQuantityChange('verified', -1)}
                        onIncrement={() => handleQuantityChange('verified', 1)}
                        onSetQty={(v) => handleSetQuantity('verified', v)}
                      />

                      <LeadCard
                        type='unverified'
                        leadType={leadType}
                        count={activeState.unverified}
                        price={unverifiedPrice}
                        qty={currentQty.unverified}
                        maxQty={unverifiedMaxQty}
                        onDecrement={() =>
                          handleQuantityChange('unverified', -1)
                        }
                        onIncrement={() =>
                          handleQuantityChange('unverified', 1)
                        }
                        onSetQty={(v) => handleSetQuantity('unverified', v)}
                      />
                    </Stack>

                    {/* What's included */}
                    <Box
                      sx={{
                        mt: 3,
                        bgcolor: '#fff',
                        borderColor: G200,
                        p: 3,
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          color: G900,
                          mb: 2,
                        }}
                      >
                        What's Included in Every Lead
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(2, 1fr)',
                            md: 'repeat(4, 1fr)',
                          },
                          gap: 2,
                        }}
                      >
                        {[
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
                        ].map((item) => (
                          <Stack
                            key={item}
                            direction='row'
                            spacing={1}
                            alignItems='center'
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: BLUE,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{ fontSize: '0.875rem', color: G600 }}
                            >
                              {item}
                            </Typography>
                          </Stack>
                        ))}
                      </Box>
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 256,
                      color: G400,
                    }}
                  >
                    <Typography sx={{ fontSize: '2.5rem', mb: 1.5 }}>
                      👈
                    </Typography>
                    <Typography sx={{ fontSize: '0.875rem' }}>
                      Select a state to view available leads
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {/* Sticky cart bar */}
        {!loading && (
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              // clear the CRM's side panel
              left: 220,
              right: 0,
              bgcolor: '#fff',
              borderTop: '1px solid',
              borderColor: G200,
              boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
              zIndex: 40,
            }}
          >
            <Box
              sx={{
                maxWidth: 1280,
                mx: 'auto',
                px: 3,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Stack direction='row' spacing={1.5} alignItems='center'>
                <ShoppingCartIcon
                  sx={{ fontSize: 18, color: isFresh ? BLUE : G800 }}
                />

                <>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: G800,
                    }}
                  >
                    <Box component='span' sx={{ fontWeight: 700, color: G900 }}>
                      {cartCount}
                    </Box>{' '}
                    {isFresh ? 'fresh' : 'aged'} leads in cart
                  </Typography>
                  <Typography sx={{ color: G300 }}>·</Typography>
                  <Typography sx={{ fontSize: '0.875rem', color: G500 }}>
                    Total:{' '}
                    <Box component='span' sx={{ fontWeight: 700, color: G900 }}>
                      ${cartTotal.toFixed(2)}
                    </Box>
                  </Typography>
                </>
              </Stack>

              <Button
                variant='contained'
                disableElevation
                component={RouterLink}
                to={`${MARKETPLACE_PATH}/${leadType}/cart${leadType === 'fresh' ? '' : `?tier=${tier}`}`}
                disabled={false}
                sx={{
                  bgcolor: BLUE,
                  fontWeight: 600,
                  px: 2.5,
                  py: 1.25,
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  textTransform: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': { bgcolor: '#1c33e0' },
                  '&.Mui-disabled': { bgcolor: G200, color: G400 },
                }}
              >
                <>
                  View Cart <ChevronRightIcon sx={{ fontSize: 15 }} />
                </>
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
