// Checkout.jsx — pay for a reserved cart with Stripe Elements on a Checkout
// Session. The leads stay reserved for the session while the timer runs.
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  useLocation,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
  useBlocker,
  Link as RouterLink,
} from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
// Custom Checkout (Elements on Checkout Sessions) lives in a separate
// submodule from react-stripe-js — these components are NOT re-exported
// from the main entrypoint in v6.x.
import {
  CheckoutElementsProvider,
  PaymentElement,
  useCheckout,
} from '@stripe/react-stripe-js/checkout';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
  MARKETPLACE_PATH,
  marketplaceFetch,
  cancelReservation,
} from './api.js';
import {
  BORDER,
  MONO,
  MarketplaceHeader,
  OrderLines,
  SummaryRow,
  formatMoney,
  getSegment,
  labelSx,
  segmentPath,
} from './ui.jsx';

const RESERVATION_SECONDS = 10 * 60;

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK);

// Stripe's payment form, dressed in the CRM's palette and type. Kept at
// module scope so the provider's options stay referentially stable.
const ELEMENTS_OPTIONS = {
  appearance: {
    theme: 'stripe',
    variables: {
      colorPrimary: '#051118',
      colorText: '#1C1A17',
      colorTextSecondary: '#5F5A52',
      colorDanger: '#8B2E2E',
      fontFamily: 'Inter, Helvetica, Arial, sans-serif',
      borderRadius: '8px',
    },
  },
  fonts: [
    {
      cssSrc:
        'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    },
  ],
};

// useCheckout() has shipped in two shapes across react-stripe-js versions:
// a flat object with methods directly, and a disjoint union where the
// checkout object is nested under `.checkout` on a `{type: 'success', ...}`
// wrapper. Unwrap defensively so this component works with either.
function unwrapCheckout(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && 'type' in raw) {
    return raw.type === 'success' ? raw.checkout : null;
  }
  return raw;
}

// Reads the error branch of useCheckout()'s discriminated union. Used to
// detect a dead session (e.g. user cancelled, then hit browser-back into
// /checkout — history state still holds the now-expired clientSecret).
function checkoutError(raw) {
  if (raw && typeof raw === 'object' && raw.type === 'error') {
    return raw.error || { message: 'Checkout could not load.' };
  }
  return null;
}

// Extracts a monetary amount (in dollars) from a StripeCheckoutAmount
// object. `minorUnitsAmount` is cents for USD; divisor handles non-USD.
function amountDollars(checkout, amountObj) {
  const minor = amountObj?.minorUnitsAmount;
  if (typeof minor !== 'number') return null;
  const divisor = checkout?.minorUnitsAmountDivisor || 100;
  return minor / divisor;
}

// Pulls the live final total (post-discount) from the Checkout Session.
// Falls back to the cart-computed total if useCheckout hasn't hydrated.
function sessionTotalDollars(checkout, fallback) {
  const d = amountDollars(checkout, checkout?.total?.total);
  return d != null ? d : fallback;
}

// Pulls subtotal (pre-discount) from the Checkout Session.
function sessionSubtotalDollars(checkout, fallback) {
  const d = amountDollars(checkout, checkout?.total?.subtotal);
  return d != null ? d : fallback;
}

// Pulls the applied discount amount from the Checkout Session (positive
// number when a promo code is applied, 0 otherwise).
function sessionDiscountDollars(checkout) {
  const d = amountDollars(checkout, checkout?.total?.discount);
  return d != null ? d : 0;
}

// If a promotion code is applied, returns the human-readable label
// (the code string if available, else the coupon's displayName).
function appliedPromoLabel(checkout) {
  const applied = checkout?.discountAmounts?.[0];
  return applied?.promotionCode || applied?.displayName || null;
}

function PromoCodeInput() {
  const checkout = unwrapCheckout(useCheckout());
  const [code, setCode] = useState('');
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);

  const appliedCode = appliedPromoLabel(checkout);

  const handleApply = async () => {
    if (!code.trim()) return;
    if (!checkout?.applyPromotionCode) {
      // SDK version without applyPromotionCode exposed — surface so the
      // operator knows to bump react-stripe-js.
      setError('Promo codes not supported by current SDK version.');
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const result = await checkout.applyPromotionCode(code.trim());
      if (result?.type === 'error') {
        setError(result.error?.message || 'Invalid promotion code');
      } else {
        setCode('');
      }
    } catch (e) {
      setError(e.message || 'Could not apply code');
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = async () => {
    if (!checkout?.removePromotionCode) return;
    try {
      await checkout.removePromotionCode();
    } catch {
      // swallow
    }
  };

  if (appliedCode) {
    return (
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Typography variant='body2' color='text.secondary'>
          Code applied:{' '}
          <Box
            component='span'
            sx={{ fontFamily: MONO, fontWeight: 700, color: 'text.primary' }}
          >
            {appliedCode}
          </Box>
        </Typography>
        <Button size='small' color='inherit' onClick={handleRemove}>
          Remove
        </Button>
      </Stack>
    );
  }

  return (
    <Box>
      <Stack direction='row' spacing={1}>
        <TextField
          size='small'
          placeholder='Promo code'
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
          fullWidth
          sx={{ '& input': { fontFamily: MONO, fontSize: '0.85rem' } }}
        />
        <Button
          variant='outlined'
          color='primary'
          onClick={handleApply}
          disabled={applying || !code.trim()}
          sx={{ borderColor: BORDER, px: 2 }}
        >
          {applying ? <CircularProgress size={16} color='inherit' /> : 'Apply'}
        </Button>
      </Stack>
      {error && (
        <Typography variant='caption' color='error' sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

function CheckoutContent({
  items,
  email,
  fallbackTotal,
  sessionId,
  tier,
  onPaymentAttempt,
  onPaymentFailed,
  onExtended,
  onSessionDead,
}) {
  const rawCheckout = useCheckout();
  const checkout = unwrapCheckout(rawCheckout);
  const initError = checkoutError(rawCheckout);
  const navigate = useNavigate();
  const { leadType } = useParams();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);
  const [agreed, setAgreed] = useState(false);

  // Stripe init failed — almost always because the user navigated back
  // to /checkout after the session was already cancelled/expired (history
  // state still has the now-dead clientSecret). Tell the parent to stop
  // the timer / suppress unmount-cancel, then render a recovery card.
  useEffect(() => {
    if (initError) onSessionDead?.();
  }, [initError, onSessionDead]);

  if (initError) {
    return (
      <Paper
        variant='outlined'
        sx={{ maxWidth: 520, mx: 'auto', p: 4, textAlign: 'center' }}
      >
        <Typography variant='h6'>
          This checkout session is no longer active
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mt: 1, mb: 3 }}
        >
          Navigating away from checkout (cancel, browser back, or timer expiry)
          releases your reservation and ends the session — the back button can't
          bring it back. Return to the store to start a new order.
        </Typography>
        <Button
          variant='contained'
          color='action'
          onClick={() =>
            navigate(segmentPath(leadType, tier, 'store'), { replace: true })
          }
          sx={{ fontWeight: 700 }}
        >
          Back to Store
        </Button>
      </Paper>
    );
  }

  const total = sessionTotalDollars(checkout, fallbackTotal);
  const subtotal = sessionSubtotalDollars(checkout, fallbackTotal);
  const discount = sessionDiscountDollars(checkout);
  const promoLabel = appliedPromoLabel(checkout);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkout || paying) return;
    setPaying(true);
    setError(null);

    // Extend the lead reservation so it doesn't expire mid-payment
    // (including any redirect-based flow). Best-effort: if this fails,
    // fall through; capture webhook will still verify reservation state.
    try {
      const res = await marketplaceFetch(`/extendReservation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        onExtended?.(data?.marketplaceReservedUntil);
      }
    } catch {
      // swallow
    }

    // Suppress the auto-cancel on unmount: payment is in flight now.
    // If confirm() redirects (async success) or navigates to return_url
    // (sync success), we don't want to cancel the PI we just paid for.
    // If confirm() returns an error, we re-arm cancel below so an
    // abandon still cleans up.
    onPaymentAttempt();

    const result = await checkout.confirm();

    if (result?.type === 'error') {
      onPaymentFailed();
      setError(result.error?.message || 'Payment failed');
      setPaying(false);
      return;
    }

    // Sync success — Stripe hasn't redirected us, navigate manually.
    // Async methods would have already redirected the browser via
    // return_url set on the session.
    navigate(
      `${MARKETPLACE_PATH}/${leadType}/order-confirmation?session_id=${sessionId}`,
    );
  };

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={3}
      alignItems='flex-start'
    >
      {/* Payment */}
      <Paper
        variant='outlined'
        sx={{ flex: 3, width: '100%', p: 2.5, borderRadius: 2 }}
      >
        <Typography sx={{ ...labelSx, mb: 2 }}>Payment Details</Typography>
        <form onSubmit={handleSubmit}>
          <PaymentElement
            options={{
              layout: 'tabs',
              paymentMethodOrder: [
                'card',
                'link',
                'klarna',
                'afterpay_clearpay',
              ],
              wallets: { applePay: 'auto', googlePay: 'auto' },
            }}
          />
          {error && (
            <Alert severity='error' sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <FormControlLabel
            sx={{ mt: 2, alignItems: 'flex-start' }}
            control={
              <Checkbox
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                size='small'
                sx={{ pt: 0.25, '&.Mui-checked': { color: 'primary.main' } }}
              />
            }
            label={
              <Typography variant='body2' color='text.secondary'>
                By placing this order I agree to the{' '}
                <Link
                  component={RouterLink}
                  to={`${MARKETPLACE_PATH}/terms-of-service`}
                  target='_blank'
                  rel='noopener noreferrer'
                  color='text.primary'
                  sx={{ fontWeight: 600 }}
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  component={RouterLink}
                  to={`${MARKETPLACE_PATH}/privacy-policy`}
                  target='_blank'
                  rel='noopener noreferrer'
                  color='text.primary'
                  sx={{ fontWeight: 600 }}
                >
                  Privacy Policy
                </Link>
                .
              </Typography>
            }
          />
          <Button
            type='submit'
            variant='contained'
            color='action'
            fullWidth
            disabled={!checkout || paying || !agreed}
            startIcon={!paying && <LockOutlinedIcon />}
            sx={{ mt: 2.5, py: 1.25, fontWeight: 700 }}
          >
            {paying ? (
              <CircularProgress size={20} color='inherit' />
            ) : (
              <>
                Pay{' '}
                <Box component='span' sx={{ fontFamily: MONO, ml: 0.75 }}>
                  {formatMoney(total)}
                </Box>
              </>
            )}
          </Button>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ display: 'block', textAlign: 'center', mt: 1 }}
          >
            Payments are processed securely by Stripe.
          </Typography>
        </form>
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
        <Typography sx={{ ...labelSx, mb: 1.5 }}>Order Summary</Typography>
        <OrderLines items={items} />

        <Divider sx={{ my: 2 }} />
        <Typography sx={{ ...labelSx, mb: 0.5 }}>Receipt Email</Typography>
        <Typography variant='body2' sx={{ fontWeight: 600 }}>
          {email}
        </Typography>

        <Divider sx={{ my: 2 }} />
        <Typography sx={{ ...labelSx, mb: 1 }}>Promo Code</Typography>
        <PromoCodeInput />

        <Divider sx={{ my: 2 }} />
        <Stack spacing={1}>
          <SummaryRow label='Subtotal' value={formatMoney(subtotal)} />
          {discount > 0 && (
            <SummaryRow
              label={promoLabel ? `Discount (${promoLabel})` : 'Discount'}
              value={`−${formatMoney(discount)}`}
              color='success.main'
            />
          )}
          <SummaryRow label='Total' value={formatMoney(total)} strong />
        </Stack>
      </Paper>
    </Stack>
  );
}

/** Countdown chip for the lead reservation; turns crimson in the last minute. */
function ReservationTimer({ secondsLeft }) {
  const urgent = secondsLeft <= 60;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  return (
    <Stack
      direction='row'
      spacing={0.75}
      alignItems='center'
      sx={{
        px: 1.5,
        height: 38,
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: urgent ? 'error.main' : BORDER,
        bgcolor: urgent ? 'error.light' : '#FFFFFF',
        color: urgent ? 'error.main' : 'text.secondary',
        whiteSpace: 'nowrap',
      }}
    >
      <AccessTimeIcon sx={{ fontSize: 16 }} />
      <Typography variant='body2' sx={{ fontWeight: 600, color: 'inherit' }}>
        Leads held for{' '}
        <Box component='span' sx={{ fontFamily: MONO, fontWeight: 700 }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </Box>
      </Typography>
    </Stack>
  );
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { leadType } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tier = searchParams.get('tier') === 'third' ? 'third' : 'second';
  const segment = getSegment(leadType, tier);
  const cartKey =
    leadType === 'fresh'
      ? `fex-cart-${leadType}`
      : `fex-cart-${leadType}-${tier}`;
  const { clientSecret, sessionId, items, total, email } = location.state || {};
  // Source deadline from history state so refresh / Ctrl+Shift+T shows
  // real remaining time, not a fresh 10:00. Fallback if someone lands
  // here without a deadline in state (shouldn't happen via Cart flow).
  const initialDeadline =
    location.state?.deadline ?? Date.now() + RESERVATION_SECONDS * 1000;
  const [deadline, setDeadline] = useState(initialDeadline);
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, Math.round((initialDeadline - Date.now()) / 1000)),
  );

  // Called by CheckoutContent after a successful extendReservation. Resets
  // the visible timer and mirrors the new deadline into history state so
  // a page refresh / tab restore reflects the extension.
  const resetTimer = useCallback(
    (newReservedUntilMs) => {
      const newDeadline =
        typeof newReservedUntilMs === 'number'
          ? newReservedUntilMs
          : Date.now() + RESERVATION_SECONDS * 1000;
      setDeadline(newDeadline);
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, deadline: newDeadline },
      });
    },
    [navigate, location.pathname, location.state],
  );

  // Clear the cart once the user has landed on /checkout. Runs after
  // the no-state <Navigate to='/cart'> guard below, so a direct visit
  // (which redirects away) never triggers the clear.
  useEffect(() => {
    if (!clientSecret) return;
    localStorage.removeItem(cartKey);
  }, [clientSecret]);

  // Controls the auto-cancel path below. Our Pay button flips this to
  // false right before calling checkout.confirm() so a successful
  // payment (which unmounts /checkout via redirect or manual navigate)
  // doesn't tear down the session we just paid for. Flipped back to
  // true on confirm error so a subsequent abandon still cleans up.
  // Also flipped false when CheckoutContent reports the session is dead
  // (cancelled-and-back-buttoned) — there's nothing left to cancel.
  const shouldCancelRef = useRef(true);
  const onPaymentAttempt = useCallback(() => {
    shouldCancelRef.current = false;
  }, []);
  const onPaymentFailed = useCallback(() => {
    shouldCancelRef.current = true;
  }, []);

  // Set when Stripe init reports the session is no longer active. Hides
  // the timer and stops it from firing the auto-redirect to /store, so
  // the user can read the recovery card.
  const [sessionDead, setSessionDead] = useState(false);
  const onSessionDead = useCallback(() => {
    shouldCancelRef.current = false;
    setSessionDead(true);
  }, []);

  useEffect(() => {
    if (!clientSecret || sessionDead) return undefined;
    const tick = () => {
      const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        navigate(segmentPath(leadType, tier, 'store'), { replace: true });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clientSecret, deadline, navigate, sessionDead]);

  // Cancel the reservation on in-app nav away from /checkout (Cancel
  // Order, side panel, timer expiry, browser back).
  //
  // Wired to react-router's useBlocker — NOT useEffect cleanup —
  // because cleanup also fires on StrictMode's simulated unmount,
  // Fast Refresh, and any future remount-preserving feature
  // (Activity / Offscreen). useBlocker only fires on real in-app
  // navigation, which is exactly the signal we want.
  //
  // Intentionally NOT paired with a pagehide/beforeunload listener:
  // tab-close and hard refresh should fall through to the 10-min
  // server-side reservation TTL. Killing the session on refresh
  // would leave the user on a broken Stripe form.
  //
  // Guarded by shouldCancelRef: once the user commits to paying,
  // Pay flips it to false so a successful confirm()→navigate to
  // /order-confirmation doesn't cancel the session we just paid for.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !!sessionId && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (shouldCancelRef.current) {
      shouldCancelRef.current = false;
      cancelReservation(sessionId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        })
        .catch(() => {});
    }
    blocker.proceed();
  }, [blocker, sessionId, queryClient]);

  // Redirect to cart if no checkout data
  if (!clientSecret || !items || !sessionId) {
    return <Navigate to={segmentPath(leadType, tier, 'cart')} replace />;
  }

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <MarketplaceHeader
          title='Checkout'
          subtitle={`${segment.label} • ${segment.window}`}
          actions={
            <>
              {!sessionDead && <ReservationTimer secondsLeft={secondsLeft} />}
              <Button
                variant='outlined'
                color='primary'
                component={RouterLink}
                to={segmentPath(leadType, tier, 'store')}
                startIcon={<CloseIcon />}
                sx={{ whiteSpace: 'nowrap', borderColor: BORDER }}
              >
                Cancel Order
              </Button>
            </>
          }
        />

        <CheckoutElementsProvider
          stripe={stripePromise}
          options={{ clientSecret, elementsOptions: ELEMENTS_OPTIONS }}
        >
          <CheckoutContent
            items={items}
            email={email}
            fallbackTotal={total}
            sessionId={sessionId}
            tier={tier}
            onPaymentAttempt={onPaymentAttempt}
            onPaymentFailed={onPaymentFailed}
            onExtended={resetTimer}
            onSessionDead={onSessionDead}
          />
        </CheckoutElementsProvider>
      </Stack>
    </Container>
  );
}
