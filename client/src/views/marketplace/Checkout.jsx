// Checkout.jsx
import {
  ThemeProvider,
  Typography,
  Button,
  Box,
  Stack,
  Link,
  CircularProgress,
  TextField,
  Checkbox,
  FormControlLabel,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import theme from './theme.js';
import {
  MARKETPLACE_PATH,
  marketplaceFetch,
  cancelReservation,
} from './api.js';

const RESERVATION_SECONDS = 10 * 60;

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PK);

const BLUE = '#233dff';
const G100 = '#f3f4f6';
const G200 = '#e5e7eb';
const G300 = '#d1d5db';
const G400 = '#9ca3af';
const G500 = '#6b7280';
const G600 = '#4b5563';
const G800 = '#1f2937';
const G900 = '#111827';

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

  const applied = checkout?.discountAmounts?.[0];
  const appliedCode = applied?.promotionCode || applied?.displayName || null;

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
      <Stack
        direction='row'
        spacing={1}
        alignItems='center'
        justifyContent='space-between'
      >
        <Typography sx={{ fontSize: '0.875rem', color: G600 }}>
          Code applied:{' '}
          <Box component='span' sx={{ fontWeight: 600, color: G900 }}>
            {appliedCode}
          </Box>
        </Typography>
        <Box
          component='button'
          onClick={handleRemove}
          sx={{
            fontSize: '0.75rem',
            color: G500,
            bgcolor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            '&:hover': { color: G900 },
          }}
        >
          Remove
        </Box>
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
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: '0.875rem',
              borderRadius: '8px',
              '& fieldset': { borderColor: G200 },
              '&.Mui-focused fieldset': { borderColor: BLUE },
            },
          }}
        />
        <Button
          onClick={handleApply}
          disabled={applying || !code.trim()}
          variant='outlined'
          sx={{
            fontSize: '0.8rem',
            fontWeight: 600,
            borderRadius: '8px',
            textTransform: 'none',
            borderColor: G200,
            color: G800,
            '&:hover': { borderColor: G300, bgcolor: G100 },
          }}
        >
          {applying ? <CircularProgress size={16} /> : 'Apply'}
        </Button>
      </Stack>
      {error && (
        <Typography sx={{ fontSize: '0.75rem', color: '#ef4444', mt: 0.5 }}>
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
      <Box
        sx={{
          maxWidth: 480,
          mx: 'auto',
          bgcolor: '#fff',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: G200,
          p: 4,
          textAlign: 'center',
        }}
      >
        <Typography sx={{ fontSize: '1.125rem', fontWeight: 700, color: G900 }}>
          This checkout session is no longer active
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: G500, mt: 1, mb: 3 }}>
          Navigating away from checkout (cancel, browser back, or timer expiry)
          releases your reservation and ends the session — the back button can't
          bring it back. Return to the store to start a new order.
        </Typography>
        <Button
          variant='contained'
          disableElevation
          onClick={() =>
            navigate(
              `${MARKETPLACE_PATH}/${leadType}/store${leadType === 'fresh' ? '' : `?tier=${tier}`}`,
              { replace: true },
            )
          }
          sx={{
            bgcolor: BLUE,
            fontWeight: 600,
            py: 1.5,
            px: 3,
            borderRadius: '12px',
            fontSize: '0.875rem',
            textTransform: 'none',
            '&:hover': { bgcolor: '#1c33e0' },
          }}
        >
          Back to store
        </Button>
      </Box>
    );
  }

  const total = sessionTotalDollars(checkout, fallbackTotal);
  const subtotal = sessionSubtotalDollars(checkout, fallbackTotal);
  const discount = sessionDiscountDollars(checkout);
  const promoLabel = appliedPromoLabel(checkout);
  const hasDiscount = discount > 0;

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
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 4,
        alignItems: 'flex-start',
      }}
    >
      {/* Left: Payment form */}
      <Box sx={{ flex: 3, width: '100%' }}>
        <Box
          sx={{
            bgcolor: '#fff',
            borderRadius: '16px',
            border: '1px solid',
            borderColor: G200,
            p: 3,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.875rem',
              color: G900,
              mb: 3,
            }}
          >
            Payment Details
          </Typography>
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
              <Typography
                sx={{ color: '#ef4444', fontSize: '0.875rem', mt: 1.5 }}
              >
                {error}
              </Typography>
            )}
            <FormControlLabel
              sx={{ mt: 2, alignItems: 'flex-start' }}
              control={
                <Checkbox
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  size='small'
                  sx={{
                    pt: 0.25,
                    color: G400,
                    '&.Mui-checked': { color: BLUE },
                  }}
                />
              }
              label={
                <Typography
                  sx={{ fontSize: '0.8rem', color: G500, lineHeight: 1.5 }}
                >
                  By placing this order I agree to the{' '}
                  <Link
                    component={RouterLink}
                    to={`${MARKETPLACE_PATH}/terms-of-service`}
                    target='_blank'
                    rel='noopener noreferrer'
                    sx={{ color: BLUE, fontWeight: 500 }}
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    component={RouterLink}
                    to={`${MARKETPLACE_PATH}/privacy-policy`}
                    target='_blank'
                    rel='noopener noreferrer'
                    sx={{ color: BLUE, fontWeight: 500 }}
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
              disableElevation
              fullWidth
              disabled={!checkout || paying || !agreed}
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
                mt: 3,
                '&:hover': {
                  bgcolor: '#1c33e0',
                  boxShadow: `0 8px 24px ${BLUE}40`,
                },
                '&.Mui-disabled': { bgcolor: G200, color: G400 },
                transition: 'all 0.2s',
              }}
            >
              {paying ? (
                <CircularProgress size={20} sx={{ color: '#fff' }} />
              ) : (
                <>
                  <LockIcon sx={{ fontSize: 13 }} />
                  Pay ${total.toFixed(2)}
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
              <VerifiedUserIcon sx={{ fontSize: 11, color: '#059669' }} />
              <Typography sx={{ fontSize: '0.75rem', color: G400 }}>
                Secure 256-bit SSL checkout
              </Typography>
            </Stack>
          </form>
        </Box>
      </Box>

      {/* Right: Order summary */}
      <Box sx={{ flex: 2, width: '100%' }}>
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
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        bgcolor: item.type === 'verified' ? BLUE : G300,
                      }}
                    />
                    <Typography sx={{ fontSize: '0.875rem', color: G600 }}>
                      {item.state} {leadType === 'fresh' ? 'Fresh' : 'Aged'} (
                      {item.type === 'verified' ? 'Verified' : 'Unverified'})
                      <Box component='span' sx={{ color: G400, ml: 0.5 }}>
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
                mb: 0.5,
              }}
            >
              Receipt Email
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: G900 }}>
              {email}
            </Typography>
          </Box>

          {/* Promo code */}
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
              Promo Code
            </Typography>
            <PromoCodeInput />
          </Box>

          {/* Totals */}
          <Box sx={{ px: 3, py: 2 }}>
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
              {hasDiscount && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Stack direction='row' spacing={0.75} alignItems='center'>
                    <Typography sx={{ fontSize: '0.875rem', color: '#059669' }}>
                      Discount
                    </Typography>
                    {promoLabel && (
                      <Box
                        sx={{
                          px: 0.75,
                          py: 0.125,
                          borderRadius: '6px',
                          bgcolor: '#d1fae5',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          color: '#059669',
                          letterSpacing: '0.02em',
                        }}
                      >
                        {promoLabel}
                      </Box>
                    )}
                  </Stack>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#059669',
                    }}
                  >
                    −${discount.toFixed(2)}
                  </Typography>
                </Box>
              )}
              {hasDiscount && (
                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    color: '#059669',
                    textAlign: 'right',
                    fontWeight: 500,
                  }}
                >
                  You saved ${discount.toFixed(2)}
                </Typography>
              )}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  pt: 1,
                  mt: 0.5,
                  borderTop: '1px solid',
                  borderColor: G100,
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
        </Box>
      </Box>
    </Box>
  );
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { leadType } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tier = searchParams.get('tier') === 'third' ? 'third' : 'second';
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
  // the user can read the recovery card and click "Back to cart".
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
        navigate(
          `${MARKETPLACE_PATH}/${leadType}/store${leadType === 'fresh' ? '' : `?tier=${tier}`}`,
          { replace: true },
        );
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clientSecret, deadline, navigate, sessionDead]);

  // Cancel the reservation on in-app nav away from /checkout (Back
  // to Cart link, timer-expired Navigate, browser back).
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
    return (
      <Navigate
        to={`${MARKETPLACE_PATH}/${leadType}/cart${leadType === 'fresh' ? '' : `?tier=${tier}`}`}
        replace
      />
    );
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerColor = secondsLeft <= 60 ? '#ef4444' : G500;

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
            <Link
              component={RouterLink}
              to={`${MARKETPLACE_PATH}/${leadType}/cart${leadType === 'fresh' ? '' : `?tier=${tier}`}`}
              underline='none'
              sx={{
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
            </Link>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 960, mx: 'auto', px: 3, py: 5 }}>
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
            <ArrowBackIcon sx={{ fontSize: 15 }} /> Cancel order
          </Link>
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{ mb: 4 }}
          >
            <Typography
              sx={{ fontSize: '1.5rem', fontWeight: 700, color: G900 }}
            >
              Checkout
            </Typography>
            {!sessionDead && (
              <Stack
                direction='row'
                spacing={0.75}
                alignItems='center'
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: secondsLeft <= 60 ? '#fca5a5' : G200,
                  bgcolor: secondsLeft <= 60 ? '#fef2f2' : '#fff',
                  transition: 'all 0.2s',
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 14, color: timerColor }} />
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: timerColor,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {mins}:{secs.toString().padStart(2, '0')}
                </Typography>
              </Stack>
            )}
          </Stack>

          <CheckoutElementsProvider
            stripe={stripePromise}
            options={{ clientSecret }}
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
        </Box>
      </Box>
    </ThemeProvider>
  );
}
