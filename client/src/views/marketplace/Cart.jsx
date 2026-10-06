// Cart.jsx
import {
  ThemeProvider,
  Typography,
  Button,
  Box,
  Stack,
  Link,
  CircularProgress,
} from '@mui/material';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VerifiedIcon from '@mui/icons-material/Verified';
import BoltIcon from '@mui/icons-material/Bolt';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link as RouterLink,
} from 'react-router-dom';
import { useSelector } from 'react-redux';
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

const MAX_LEADS_PER_ORDER = 500;

function readCart(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function writeCart(key, cart) {
  localStorage.setItem(key, JSON.stringify(cart));
}

function cartToItems(cart, prices) {
  const verified = [];
  const unverified = [];
  const verifiedPrice = prices.verified;
  const unverifiedPrice = prices.unverified;
  Object.entries(cart).forEach(([state, q]) => {
    if (q.verified > 0)
      verified.push({
        id: `${state}-v`,
        state,
        type: 'verified',
        qty: q.verified,
        price: verifiedPrice,
      });
    if (q.unverified > 0)
      unverified.push({
        id: `${state}-u`,
        state,
        type: 'unverified',
        qty: q.unverified,
        price: unverifiedPrice,
      });
  });
  return [...verified, ...unverified];
}

export default function Cart() {
  const navigate = useNavigate();
  const { leadType } = useParams();
  const [searchParams] = useSearchParams();
  const tier = searchParams.get('tier') === 'third' ? 'third' : 'second';
  const cartKey =
    leadType === 'fresh'
      ? `fex-cart-${leadType}`
      : `fex-cart-${leadType}-${tier}`;
  const [cart, setCart] = useState(() => readCart(cartKey));
  // Orders go to the signed-in CRM user; the API takes the email from their
  // session, this copy is just for display.
  const email = useSelector((state) => state.user.user?.email) || '';
  const [checkoutError, setCheckoutError] = useState(null);
  const [adjusted, setAdjusted] = useState(false);
  const clampedFor = useRef(null);
  const queryClient = useQueryClient();

  // Re-read localStorage when cartKey changes (e.g. switching tiers via
  // browser back/forward) instead of holding onto the previous tier's cart.
  useEffect(() => {
    setCart(readCart(cartKey));
    clampedFor.current = null;
    setAdjusted(false);
  }, [cartKey]);

  const {
    data: inventory,
    isLoading: inventoryLoading,
    isError: inventoryError,
    refetch: refetchInventory,
  } = useQuery({
    queryKey: ['inventory', leadType, tier],
    queryFn: async () => {
      const url =
        leadType === 'fresh'
          ? `/inventoryReport?type=${leadType}`
          : `/inventoryReport?type=${leadType}&tier=${tier}`;
      const res = await marketplaceFetch(url);
      if (!res.ok) throw new Error('Failed to fetch inventory');
      return res.json();
    },
  });

  const states = inventory?.states;
  const prices = inventory?.prices;

  // Clamp stored cart quantities against live inventory once it loads.
  // If anything got trimmed, show a dismissible banner so the user knows
  // their cart changed without them touching it.
  useEffect(() => {
    if (!states || clampedFor.current === states) return;
    clampedFor.current = states;
    setCart((prev) => {
      let didAdjust = false;
      const next = {};
      for (const [state, counts] of Object.entries(prev)) {
        const avail = states[state] || { verified: 0, unverified: 0 };
        const v = Math.min(counts.verified || 0, avail.verified || 0);
        const u = Math.min(counts.unverified || 0, avail.unverified || 0);
        if (v !== (counts.verified || 0) || u !== (counts.unverified || 0)) {
          didAdjust = true;
        }
        if (v > 0 || u > 0) next[state] = { verified: v, unverified: u };
      }
      if (didAdjust) {
        writeCart(cartKey, next);
        setAdjusted(true);
        return next;
      }
      return prev;
    });
  }, [states]);

  const updateCart = useCallback(
    (updater) => {
      setCart((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        writeCart(cartKey, next);
        return next;
      });
    },
    [cartKey],
  );

  const items = prices ? cartToItems(cart, prices) : [];
  const subtotal = items.reduce((sum, i) => sum + i.qty * i.price, 0);
  const total = subtotal;
  const totalLeads = items.reduce((sum, i) => sum + i.qty, 0);
  const overLimit = totalLeads > MAX_LEADS_PER_ORDER;

  const getMax = (state, type) => {
    if (!states || !states[state]) return Infinity;
    return states[state][type] || 0;
  };

  const updateQty = (state, type, qty) => {
    const max = getMax(state, type);
    updateCart((prev) => {
      const current = prev[state] || { verified: 0, unverified: 0 };
      const key = type === 'verified' ? 'verified' : 'unverified';
      const newQty = Math.min(Math.max(0, qty), max);
      return { ...prev, [state]: { ...current, [key]: newQty } };
    });
  };

  const checkoutMutation = useMutation({
    mutationFn: async (body) => {
      const res = await marketplaceFetch(`/createCheckoutSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const e = new Error(err.error || 'Checkout failed');
        e.status = res.status;
        throw e;
      }
      return res.json();
    },
    onError: (err) => {
      // 409 means server saw our cart's inventory as stale — force a
      // refresh so the user immediately sees corrected numbers.
      if (err.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
    },
    onSuccess: () => {
      // A successful reservation shrinks the pool for everyone else.
      // Mark inventory stale so the next render refetches.
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
  const checkoutLoading = checkoutMutation.isPending;

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (overLimit) return;

    setCheckoutError(null);
    try {
      const data = await checkoutMutation.mutateAsync({
        items: items.map(({ state, type, qty }) => ({ state, type, qty })),
        leadType,
        ...(leadType === 'fresh' ? {} : { tier }),
        origin: window.location.origin,
      });
      // Persist order context across the Stripe redirect. /checkout state
      // is in history and survives only until the redirect to the payment
      // provider; /order-confirmation lands on a fresh load and needs
      // sessionId + email to call completeOrder. (With ui_mode: 'elements'
      // the PaymentIntent is created lazily at confirm() time, so we don't
      // have a paymentIntentId to stash — session.id is the stable handle.)
      sessionStorage.setItem(
        'fex-order-ctx',
        JSON.stringify({
          sessionId: data.sessionId,
          email: email.trim(),
          ...(leadType === 'fresh' ? {} : { tier }),
        }),
      );
      navigate(
        leadType === 'fresh'
          ? `${MARKETPLACE_PATH}/${leadType}/checkout`
          : `${MARKETPLACE_PATH}/${leadType}/checkout?tier=${tier}`,
        {
          state: {
            clientSecret: data.clientSecret,
            sessionId: data.sessionId,
            items,
            total,
            email: email.trim(),
            // Absolute timestamp when the reservation expires. Persisted
            // in history state so refresh / tab restore shows the real
            // remaining time instead of resetting to a fresh 10:00.
            // Kept in sync with server marketplaceReservedUntil via extendReservation.
            deadline: Date.now() + 10 * 60 * 1000,
          },
        },
      );
    } catch (e) {
      setCheckoutError(e.message);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: '100%', bgcolor: '#f7f8fc' }}>
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
              maxWidth: 1152,
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
                  bgcolor: leadType === 'fresh' ? BLUE : '#fff',
                  color: leadType === 'fresh' ? '#fff' : G800,
                  border: leadType === 'fresh' ? 'none' : '1px solid',
                  borderColor: G300,
                  fontSize: '0.7rem',
                  fontWeight: leadType === 'fresh' ? 700 : 500,
                  px: 1.25,
                  py: 0.4,
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {leadType === 'fresh' ? 'Fresh' : 'Aged'}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  color: leadType === 'fresh' ? BLUE : G800,
                  fontWeight: 500,
                }}
              >
                {leadType === 'fresh'
                  ? 'Submitted within the last 72 hours'
                  : tier === 'third'
                    ? 'Submitted 91–180 days ago'
                    : 'Submitted 31–90 days ago'}
              </Typography>
            </Stack>
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
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: 16 }} />
              Cart
              {items.length > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: leadType === 'fresh' ? BLUE : G800,
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
                  {totalLeads > 99 ? '99+' : totalLeads}
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 1024, mx: 'auto', px: 3, py: 5 }}>
          <Link
            component={RouterLink}
            to={`${MARKETPLACE_PATH}/${leadType}/store${leadType === 'fresh' ? '' : `?tier=${tier}`}`}
            underline='none'
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: G500,
              fontSize: '0.875rem',
              mb: 2,
              '&:hover': { color: G900 },
              transition: 'color 0.15s',
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} /> Back to{' '}
            {leadType === 'fresh' ? 'Fresh' : 'Aged'} Leads
          </Link>
          <Typography
            sx={{ fontSize: '1.5rem', fontWeight: 700, color: G900, mb: 4 }}
          >
            Your Cart for {leadType === 'fresh' ? 'Fresh' : 'Aged'} Leads
          </Typography>

          {adjusted && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                bgcolor: '#fef9c3',
                border: '1px solid',
                borderColor: '#fde68a',
                borderRadius: '12px',
                px: 2,
                py: 1.5,
                mb: 3,
              }}
            >
              <InfoOutlinedIcon sx={{ fontSize: 18, color: '#b45309' }} />
              <Typography
                sx={{
                  flex: 1,
                  fontSize: '0.875rem',
                  color: '#92400e',
                }}
              >
                Your cart was updated — some quantities were adjusted to match
                current availability.
              </Typography>
              <Box
                component='button'
                onClick={() => setAdjusted(false)}
                aria-label='Dismiss notice'
                sx={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#92400e',
                  bgcolor: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  '&:hover': { bgcolor: '#fde68a' },
                  transition: 'all 0.15s',
                }}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </Box>
            </Box>
          )}

          {inventoryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : inventoryError ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                py: 8,
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
          ) : (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: 4,
                alignItems: 'flex-start',
              }}
            >
              {/* Left: Cart items */}
              <Stack spacing={1.5} sx={{ flex: 3 }}>
                {items.length === 0 ? (
                  <Box
                    sx={{
                      bgcolor: '#fff',
                      borderRadius: '16px',
                      border: '1px solid',
                      borderColor: G200,
                      p: 6,
                      textAlign: 'center',
                    }}
                  >
                    <Typography sx={{ color: G400, fontSize: '0.875rem' }}>
                      Your cart is empty.
                    </Typography>
                    <Link
                      component={RouterLink}
                      to={`${MARKETPLACE_PATH}/${leadType}/store${leadType === 'fresh' ? '' : `?tier=${tier}`}`}
                      underline='none'
                      sx={{
                        color: BLUE,
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        mt: 2,
                        display: 'inline-block',
                      }}
                    >
                      Browse Leads →
                    </Link>
                  </Box>
                ) : (
                  items.map((item) => (
                    <Box
                      key={item.id}
                      sx={{
                        bgcolor: '#fff',
                        borderRadius: '16px',
                        border: '1px solid',
                        borderColor: G200,
                        p: 2.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        '&:hover': { borderColor: G300 },
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {/* Icon */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          bgcolor:
                            item.type === 'verified' ? `${BLUE}1A` : G100,
                        }}
                      >
                        {item.type === 'verified' ? (
                          <VerifiedIcon sx={{ fontSize: 18, color: BLUE }} />
                        ) : (
                          <BoltIcon sx={{ fontSize: 18, color: G400 }} />
                        )}
                      </Box>

                      {/* Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction='row'
                          spacing={1}
                          alignItems='center'
                          sx={{ mb: 0.25 }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.875rem',
                              color: G900,
                            }}
                          >
                            {item.state}{' '}
                            {leadType === 'fresh' ? 'Fresh' : 'Aged'}
                          </Typography>
                          <Box
                            sx={{
                              px: 1,
                              py: 0.25,
                              borderRadius: '999px',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              bgcolor:
                                item.type === 'verified' ? `${BLUE}1A` : G100,
                              color: item.type === 'verified' ? BLUE : G500,
                            }}
                          >
                            {item.type === 'verified'
                              ? 'Verified'
                              : 'Unverified'}
                          </Box>
                        </Stack>
                        <Typography sx={{ fontSize: '0.75rem', color: G400 }}>
                          ${item.price.toFixed(2)} per{' '}
                          {leadType === 'fresh' ? 'fresh' : 'aged'} lead
                        </Typography>
                      </Box>

                      {/* Qty stepper */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          bgcolor: G50,
                          borderRadius: '12px',
                          border: '1px solid',
                          borderColor: G200,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          component='button'
                          onClick={() =>
                            updateQty(item.state, item.type, item.qty - 1)
                          }
                          sx={{
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: G400,
                            bgcolor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            '&:hover': { color: G800, bgcolor: G100 },
                            transition: 'all 0.15s',
                          }}
                        >
                          −
                        </Box>
                        <QtyInput
                          value={item.qty}
                          max={getMax(item.state, item.type)}
                          onChange={(n) => updateQty(item.state, item.type, n)}
                          sx={{
                            width: 40,
                            height: 32,
                            fontSize: '0.875rem',
                            color: G900,
                          }}
                        />
                        <Box
                          component='button'
                          onClick={() =>
                            updateQty(item.state, item.type, item.qty + 1)
                          }
                          disabled={item.qty >= getMax(item.state, item.type)}
                          sx={{
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color:
                              item.qty >= getMax(item.state, item.type)
                                ? G300
                                : G400,
                            bgcolor: 'transparent',
                            border: 'none',
                            cursor:
                              item.qty >= getMax(item.state, item.type)
                                ? 'default'
                                : 'pointer',
                            '&:hover':
                              item.qty < getMax(item.state, item.type)
                                ? { color: G800, bgcolor: G100 }
                                : {},
                            transition: 'all 0.15s',
                          }}
                        >
                          +
                        </Box>
                      </Box>

                      {/* Line total */}
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: G900,
                          width: 64,
                          textAlign: 'right',
                        }}
                      >
                        ${(item.qty * item.price).toFixed(2)}
                      </Typography>

                      {/* Delete */}
                      <Box
                        component='button'
                        aria-label={`Remove ${item.state} ${item.type}`}
                        onClick={() => updateQty(item.state, item.type, 0)}
                        sx={{
                          width: 32,
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: G400,
                          bgcolor: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          flexShrink: 0,
                          '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' },
                          transition: 'all 0.15s',
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                      </Box>
                    </Box>
                  ))
                )}
              </Stack>

              {/* Right: Order summary */}
              <Box sx={{ flex: 2 }}>
                <Box
                  sx={{
                    bgcolor: '#fff',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: G200,
                    overflow: 'hidden',
                    position: 'sticky',
                    top: 88,
                  }}
                >
                  {/* Line items */}
                  <Box
                    sx={{
                      px: 3,
                      pt: 3,
                      pb: 2,
                      borderBottom: '1px solid',
                      borderColor: G100,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: G900,
                        mb: 2,
                      }}
                    >
                      Order Summary
                    </Typography>
                    <Stack spacing={1.5}>
                      {items.map((item) => (
                        <Box
                          key={item.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Stack
                            direction='row'
                            spacing={1}
                            alignItems='center'
                          >
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                bgcolor: item.type === 'verified' ? BLUE : G300,
                              }}
                            />
                            <Typography
                              sx={{ fontSize: '0.875rem', color: G600 }}
                            >
                              {item.state}{' '}
                              {leadType === 'fresh' ? 'Fresh' : 'Aged'} (
                              {item.type === 'verified'
                                ? 'Verified'
                                : 'Unverified'}
                              )
                              <Box
                                component='span'
                                sx={{ color: G400, ml: 0.5 }}
                              >
                                ×{item.qty}
                              </Box>
                            </Typography>
                          </Stack>
                          <Typography
                            sx={{
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              color: G900,
                            }}
                          >
                            ${(item.qty * item.price).toFixed(2)}
                          </Typography>
                        </Box>
                      ))}
                      {items.length === 0 && (
                        <Typography sx={{ fontSize: '0.875rem', color: G400 }}>
                          No items
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  {/* Totals */}
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderBottom: '1px solid',
                      borderColor: G100,
                    }}
                  >
                    <Stack spacing={1}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.875rem', color: G500 }}>
                          Subtotal
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: G900,
                          }}
                        >
                          ${subtotal.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          pt: 0.5,
                        }}
                      >
                        <Typography sx={{ fontWeight: 700, color: G900 }}>
                          Total
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: G900,
                          }}
                        >
                          ${total.toFixed(2)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Email */}
                  <Box
                    sx={{
                      px: 3,
                      py: 2,
                      borderBottom: '1px solid',
                      borderColor: G100,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: G500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        mb: 1,
                      }}
                    >
                      Delivered To
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: G900,
                      }}
                    >
                      {email}
                    </Typography>
                    {leadType === 'fresh' && (
                      <Typography
                        sx={{ fontSize: '0.75rem', color: BLUE, mt: 1 }}
                      >
                        Leads are also sent automatically to any Ringy, GHL,
                        SendBlue or InsurDial integration linked to this email.
                      </Typography>
                    )}
                  </Box>

                  {/* Pay button / Stripe PaymentElement */}
                  <Box sx={{ px: 3, py: 2.5 }}>
                    {overLimit && (
                      <Typography
                        sx={{
                          color: '#b45309',
                          fontSize: '0.875rem',
                          mb: 1.5,
                        }}
                      >
                        Maximum {MAX_LEADS_PER_ORDER} leads per order. Remove{' '}
                        {totalLeads - MAX_LEADS_PER_ORDER} to continue.
                      </Typography>
                    )}
                    {checkoutError && (
                      <Typography
                        sx={{
                          color: '#ef4444',
                          fontSize: '0.875rem',
                          mb: 1.5,
                        }}
                      >
                        {checkoutError}
                      </Typography>
                    )}
                    <Button
                      variant='contained'
                      disableElevation
                      fullWidth
                      disabled={
                        items.length === 0 || checkoutLoading || overLimit
                      }
                      onClick={handleCheckout}
                      sx={{
                        bgcolor: BLUE,
                        fontWeight: 600,
                        py: 1.75,
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        '&:hover': {
                          bgcolor: '#1c33e0',
                          boxShadow: `0 8px 24px ${BLUE}40`,
                        },
                        '&.Mui-disabled': { bgcolor: G200, color: G400 },
                        transition: 'all 0.2s',
                      }}
                    >
                      {checkoutLoading ? (
                        <CircularProgress size={20} sx={{ color: '#fff' }} />
                      ) : (
                        <>
                          <LockIcon sx={{ fontSize: 13 }} />
                          Proceed to Checkout — ${total.toFixed(2)}
                        </>
                      )}
                    </Button>
                    <Stack
                      direction='row'
                      spacing={0.75}
                      alignItems='center'
                      justifyContent='center'
                      sx={{ mt: 1.5 }}
                    >
                      <VerifiedUserIcon
                        sx={{ fontSize: 11, color: '#059669' }}
                      />
                      <Typography sx={{ fontSize: '0.75rem', color: G400 }}>
                        Secure 256-bit SSL checkout
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
