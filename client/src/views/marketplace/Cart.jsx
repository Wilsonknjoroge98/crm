// Cart.jsx — the shared cart: leads from every segment, reserved and paid
// for as one Stripe Checkout Session.
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
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { MARKETPLACE_PATH, marketplaceFetch } from './api.js';
import {
  CHECKOUT_PATH,
  SEGMENTS,
  cartLines,
  continueShoppingPath,
  linesCount,
  linesTotal,
  setLineQty,
  useCart,
  useMarketplaceInventory,
} from './cartState.js';
import {
  BORDER,
  DIVIDER,
  MONO,
  LeadTypeChip,
  MarketplaceHeader,
  QtyStepper,
  SummaryRow,
  formatMoney,
  labelSx,
} from './ui.jsx';

const MAX_LEADS_PER_ORDER = 500;

export default function Cart() {
  const navigate = useNavigate();
  const [cart, updateCart] = useCart();
  // Orders go to the signed-in CRM user; the API takes the email from their
  // session, this copy is just for display.
  const email = useSelector((state) => state.user.user?.email) || '';
  const [checkoutError, setCheckoutError] = useState(null);
  const [adjusted, setAdjusted] = useState(false);
  const clampedFor = useRef(null);
  const queryClient = useQueryClient();

  const inventory = useMarketplaceInventory();
  const ready = SEGMENTS.every(({ key }) => inventory.bySegment[key].data);
  const statesOf = (segment) => inventory.bySegment[segment].data?.states;

  // Clamp stored quantities against live inventory once every segment has
  // loaded. If anything got trimmed, show a dismissible banner so the user
  // knows their cart changed without them touching it.
  const inventoryVersion = SEGMENTS.map(
    ({ key }) => inventory.bySegment[key].dataUpdatedAt,
  ).join();
  useEffect(() => {
    if (!ready || clampedFor.current === inventoryVersion) return;
    clampedFor.current = inventoryVersion;
    let didAdjust = false;
    updateCart((prev) => {
      let next = prev;
      for (const [segment, states] of Object.entries(prev)) {
        const available = statesOf(segment) || {};
        for (const [state, counts] of Object.entries(states)) {
          for (const type of ['verified', 'unverified']) {
            const max = available[state]?.[type] || 0;
            if ((counts[type] || 0) > max) {
              didAdjust = true;
              next = setLineQty(next, segment, state, type, max);
            }
          }
        }
      }
      return next;
    });
    if (didAdjust) setAdjusted(true);
  }, [ready, inventoryVersion]);

  const items = cartLines(cart, inventory.prices);
  const total = linesTotal(items);
  const totalLeads = linesCount(items);
  const overLimit = totalLeads > MAX_LEADS_PER_ORDER;
  const hasBanked = items.some((item) => item.segment === 'banked');

  const getMax = (segment, state, type) =>
    statesOf(segment)?.[state]?.[type] ?? Infinity;

  const updateQty = (segment, state, type, qty) =>
    updateCart((prev) =>
      setLineQty(
        prev,
        segment,
        state,
        type,
        Math.min(qty, getMax(segment, state, type)),
      ),
    );

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
        items: items.map(({ segment, state, type, qty }) => ({
          segment,
          state,
          type,
          qty,
        })),
        origin: window.location.origin,
      });
      navigate(CHECKOUT_PATH, {
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

  const groups = SEGMENTS.map((segment) => ({
    segment,
    lines: items.filter((item) => item.segment === segment.key),
  })).filter((group) => group.lines.length);

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <MarketplaceHeader
          subtitle='Review your order before checkout.'
          actions={
            <Button
              variant='outlined'
              color='primary'
              component={RouterLink}
              to={continueShoppingPath(cart)}
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

        {inventory.isError ? (
          <Alert
            severity='error'
            action={
              <Button
                color='inherit'
                size='small'
                onClick={() => inventory.refetch()}
              >
                Retry
              </Button>
            }
          >
            Failed to load inventory.
          </Alert>
        ) : !ready ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress color='inherit' />
          </Box>
        ) : (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={3}
            alignItems='flex-start'
          >
            {/* Line items, one section per segment */}
            <Paper
              variant='outlined'
              sx={{
                flex: 3,
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              {groups.length === 0 ? (
                <Box sx={{ p: 6, textAlign: 'center' }}>
                  <Typography color='text.secondary'>
                    Your cart is empty.
                  </Typography>
                  <Button
                    component={RouterLink}
                    to={MARKETPLACE_PATH}
                    color='primary'
                    sx={{ mt: 1.5 }}
                  >
                    Browse the Marketplace
                  </Button>
                </Box>
              ) : (
                groups.map(({ segment, lines }) => (
                  <Box key={segment.key}>
                    <Box
                      sx={{
                        px: 2.5,
                        py: 1.5,
                        bgcolor: '#FAFAFA',
                        borderBottom: `2px solid ${BORDER}`,
                      }}
                    >
                      <Typography sx={labelSx}>{segment.label}</Typography>
                    </Box>
                    {lines.map((item) => (
                      <Stack
                        key={item.id}
                        direction='row'
                        alignItems='center'
                        spacing={2}
                        sx={{
                          px: 2.5,
                          py: 2,
                          borderBottom: `1px solid ${DIVIDER}`,
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack
                            direction='row'
                            spacing={1}
                            alignItems='center'
                          >
                            <Typography sx={{ fontWeight: 700 }}>
                              {item.state}
                            </Typography>
                            <LeadTypeChip
                              verified={item.type === 'verified'}
                              label={
                                item.type === 'verified'
                                  ? 'Verified'
                                  : 'Unverified'
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
                          max={getMax(item.segment, item.state, item.type)}
                          onChange={(n) =>
                            updateQty(item.segment, item.state, item.type, n)
                          }
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
                            aria-label={`Remove ${segment.label} ${item.state} ${item.type}`}
                            onClick={() =>
                              updateQty(item.segment, item.state, item.type, 0)
                            }
                            sx={{ '&:hover': { color: 'error.main' } }}
                          >
                            <DeleteOutlineIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ))}
                  </Box>
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
              {/* Financial rollup only: the items themselves are listed and
                  edited in the left column. */}
              {groups.length > 0 ? (
                <Stack spacing={1}>
                  {groups.map(({ segment, lines }) => (
                    <SummaryRow
                      key={segment.key}
                      label={`${segment.label} (${linesCount(lines)})`}
                      value={formatMoney(linesTotal(lines))}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant='body2' color='text.disabled'>
                  No items
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                <SummaryRow label='Subtotal' value={formatMoney(total)} />
                <SummaryRow label='Total' value={formatMoney(total)} strong />
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Typography sx={{ ...labelSx, mb: 0.5 }}>Deliver To</Typography>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {email}
              </Typography>
              {hasBanked && (
                <Typography
                  variant='caption'
                  color='text.secondary'
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  Banked leads are also sent automatically to any Ringy, GHL,
                  SendBlue or InsurDial integration linked to this email.
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
                  'Proceed to Checkout'
                )}
              </Button>
            </Paper>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
