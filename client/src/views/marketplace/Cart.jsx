// Cart.jsx — review one segment's cart, then reserve the leads and open a
// Stripe Checkout Session.
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link as RouterLink,
} from 'react-router-dom';
import { useSelector } from 'react-redux';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { marketplaceFetch } from './api.js';
import {
  BORDER,
  DIVIDER,
  MONO,
  LeadTypeChip,
  OrderLines,
  MarketplaceHeader,
  QtyStepper,
  SummaryRow,
  cartKeyFor,
  formatMoney,
  getSegment,
  labelSx,
  readCart,
  segmentPath,
} from './ui.jsx';

const MAX_LEADS_PER_ORDER = 500;

function writeCart(key, cart) {
  localStorage.setItem(key, JSON.stringify(cart));
}

function cartToItems(cart, prices) {
  const verified = [];
  const unverified = [];
  Object.entries(cart).forEach(([state, q]) => {
    if (q.verified > 0)
      verified.push({
        id: `${state}-v`,
        state,
        type: 'verified',
        qty: q.verified,
        price: prices.verified,
      });
    if (q.unverified > 0)
      unverified.push({
        id: `${state}-u`,
        state,
        type: 'unverified',
        qty: q.unverified,
        price: prices.unverified,
      });
  });
  return [...verified, ...unverified];
}

export default function Cart() {
  const navigate = useNavigate();
  const { leadType } = useParams();
  const [searchParams] = useSearchParams();
  const tier = searchParams.get('tier') === 'third' ? 'third' : 'second';
  const segment = getSegment(leadType, tier);
  const storePath = segmentPath(leadType, tier, 'store');
  const cartKey = cartKeyFor(leadType, tier);
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
  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);
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
      const newQty = Math.min(Math.max(0, qty), max);
      return { ...prev, [state]: { ...current, [type]: newQty } };
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
  const checkoutLoading = checkoutMutation.isPending;

  const handleCheckout = async () => {
    if (items.length === 0 || overLimit) return;

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
      // provider; /order-confirmation lands on a fresh load. (With
      // ui_mode: 'elements' the PaymentIntent is created lazily at confirm()
      // time, so session.id is the stable handle.)
      sessionStorage.setItem(
        'fex-order-ctx',
        JSON.stringify({
          sessionId: data.sessionId,
          email: email.trim(),
          ...(leadType === 'fresh' ? {} : { tier }),
        }),
      );
      navigate(segmentPath(leadType, tier, 'checkout'), {
        state: {
          clientSecret: data.clientSecret,
          sessionId: data.sessionId,
          items,
          total,
          email: email.trim(),
          // Absolute timestamp when the reservation expires. Persisted in
          // history state so refresh / tab restore shows the real remaining
          // time instead of resetting to a fresh 10:00. Kept in sync with
          // server marketplaceReservedUntil via extendReservation.
          deadline: Date.now() + 10 * 60 * 1000,
        },
      });
    } catch (e) {
      setCheckoutError(e.message);
    }
  };

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <MarketplaceHeader
          subtitle={`Review your ${segment.label.toLowerCase()} order before checkout.`}
          actions={
            <Button
              variant='outlined'
              color='primary'
              component={RouterLink}
              to={storePath}
              startIcon={<ArrowBackIcon />}
              sx={{ whiteSpace: 'nowrap', borderColor: BORDER }}
            >
              Continue Shopping
            </Button>
          }
        />

        {adjusted && (
          <Alert severity='warning' onClose={() => setAdjusted(false)}>
            Your cart was updated — some quantities were adjusted to match
            current availability.
          </Alert>
        )}

        {inventoryLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress color='inherit' />
          </Box>
        ) : inventoryError ? (
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
        ) : (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems='flex-start'
          >
            {/* Line items */}
            <Paper
              variant='outlined'
              sx={{
                flex: 3,
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  bgcolor: '#FAFAFA',
                  borderBottom: `2px solid ${BORDER}`,
                }}
              >
                <Typography sx={labelSx}>
                  {segment.label} • {segment.window}
                </Typography>
              </Box>

              {items.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography color='text.secondary'>
                    Your cart is empty.
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={storePath}
                    color='primary'
                    sx={{ mt: 1.5 }}
                  >
                    Browse {segment.label}
                  </Button>
                </Box>
              ) : (
                items.map((item) => (
                  <Stack
                    key={item.id}
                    direction='row'
                    alignItems='center'
                    spacing={2}
                    sx={{
                      px: 2.5,
                      py: 2,
                      borderBottom: `1px solid ${DIVIDER}`,
                      '&:last-of-type': { borderBottom: 'none' },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <Typography sx={{ fontWeight: 700 }}>
                          {item.state}
                        </Typography>
                        <LeadTypeChip
                          verified={item.type === 'verified'}
                          label={
                            item.type === 'verified' ? 'Verified' : 'Unverified'
                          }
                        />
                      </Stack>
                      <Typography variant='caption' color='text.secondary'>
                        <Box component='span' sx={{ fontFamily: MONO }}>
                          {formatMoney(item.price)}
                        </Box>{' '}
                        per {segment.unit}
                      </Typography>
                    </Box>
                    <QtyStepper
                      size='small'
                      value={item.qty}
                      max={getMax(item.state, item.type)}
                      onChange={(n) => updateQty(item.state, item.type, n)}
                    />
                    <Typography
                      sx={{
                        fontFamily: MONO,
                        fontWeight: 700,
                        width: 88,
                        textAlign: 'right',
                      }}
                    >
                      {formatMoney(item.qty * item.price)}
                    </Typography>
                    <Tooltip title='Remove'>
                      <IconButton
                        size='small'
                        aria-label={`Remove ${item.state} ${item.type}`}
                        onClick={() => updateQty(item.state, item.type, 0)}
                        sx={{ '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ))
              )}
            </Paper>

            {/* Order summary */}
            <Paper
              variant='outlined'
              sx={{
                flex: 2,
                width: '100%',
                p: 2.5,
                borderRadius: 2,
                position: { md: 'sticky' },
                top: 16,
              }}
            >
              <Typography sx={{ ...labelSx, mb: 1.5 }}>
                Order Summary
              </Typography>
              {items.length > 0 ? (
                <OrderLines items={items} />
              ) : (
                <Typography variant='body2' color='text.disabled'>
                  No items
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                <SummaryRow
                  label={`${totalLeads} lead${totalLeads === 1 ? '' : 's'}`}
                  value={formatMoney(total)}
                />
                <SummaryRow label='Total' value={formatMoney(total)} strong />
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Typography sx={{ ...labelSx, mb: 0.5 }}>Deliver To</Typography>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {email}
              </Typography>
              {leadType === 'fresh' && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  Leads are also sent automatically to any Ringy, GHL, SendBlue
                  or InsurDial integration linked to this email.
                </Typography>
              )}

              {overLimit && (
                <Alert severity='warning' sx={{ mt: 2 }}>
                  Maximum {MAX_LEADS_PER_ORDER} leads per order. Remove{' '}
                  {totalLeads - MAX_LEADS_PER_ORDER} to continue.
                </Alert>
              )}
              {checkoutError && (
                <Alert severity='error' sx={{ mt: 2 }}>
                  {checkoutError}
                </Alert>
              )}

              <Button
                variant='contained'
                color='action'
                fullWidth
                disabled={items.length === 0 || checkoutLoading || overLimit}
                onClick={handleCheckout}
                startIcon={!checkoutLoading && <LockOutlinedIcon />}
                sx={{ mt: 2.5, py: 1.25, fontWeight: 700 }}
              >
                {checkoutLoading ? (
                  <CircularProgress size={20} color='inherit' />
                ) : (
                  <>
                    Proceed to Checkout{' '}
                    {/* <Box component='span' sx={{ fontFamily: MONO, ml: 0.75 }}>
                      {formatMoney(total)}
                    </Box> */}
                  </>
                )}
              </Button>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ display: 'block', textAlign: 'center', mt: 1 }}
              >
                Leads are held for 10 minutes while you pay.
              </Typography>
            </Paper>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
