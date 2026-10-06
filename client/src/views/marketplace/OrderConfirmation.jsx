// OrderConfirmation.jsx
import {
  ThemeProvider,
  Typography,
  Button,
  Box,
  Stack,
  Link,
  CircularProgress,
} from '@mui/material';
import { useEffect, useState, useRef } from 'react';
import {
  useSearchParams,
  useParams,
  Link as RouterLink,
} from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import DownloadIcon from '@mui/icons-material/Download';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import theme from './theme.js';
import { MARKETPLACE_PATH, marketplaceFetch } from './api.js';

const BLUE = '#233dff';
const G100 = '#f3f4f6';
const G200 = '#e5e7eb';
const G400 = '#9ca3af';
const G500 = '#6b7280';
const G800 = '#1f2937';
const G900 = '#111827';

function formatCrmList(methods) {
  const blue = (name) => (
    <span key={name} style={{ color: BLUE }}>
      {name}
    </span>
  );
  if (methods.length === 1) return blue(methods[0]);
  if (methods.length === 2)
    return (
      <>
        {blue(methods[0])} and {blue(methods[1])}
      </>
    );
  return (
    <>
      {methods.slice(0, -1).map((m) => (
        <>{blue(m)}, </>
      ))}
      and {blue(methods[methods.length - 1])}
    </>
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readOrderCtx() {
  try {
    return JSON.parse(sessionStorage.getItem('fex-order-ctx')) || null;
  } catch {
    return null;
  }
}

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const { leadType } = useParams();
  const sessionId = searchParams.get('session_id');

  // Order context persists across the Stripe redirect in sessionStorage
  // (written by Cart.jsx when createCheckoutSession returns); only its tier
  // is used, for the back-to-store link. Ownership is checked server-side
  // against the signed-in CRM user, so the session id alone is enough.
  const ctxRef = useRef(readOrderCtx());
  const ctx = ctxRef.current;
  const storeLink = `${MARKETPLACE_PATH}/${leadType}/store${
    leadType === 'fresh'
      ? ''
      : `?tier=${ctx?.tier === 'third' ? 'third' : 'second'}`
  }`;

  const [status, setStatus] = useState(sessionId ? 'loading' : 'failed');
  const [csvBlob, setCsvBlob] = useState(null);
  const [crmMethods, setCrmMethods] = useState([]);
  const fulfillTriggered = useRef(false);
  const retryCount = useRef(0);
  const MAX_RETRIES = 15;

  const fulfillMutation = useMutation({
    mutationFn: async () => {
      const res = await marketplaceFetch(`/completeOrder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, leadType }),
      });
      if (res.status === 404) {
        throw new Error('NOT_READY');
      }
      if (res.status === 410) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'TIMED_OUT');
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to generate leads');
      }
      const json = await res.json();
      const csvBytes = Uint8Array.from(atob(json.csv), (c) => c.charCodeAt(0));
      const blob = new Blob([csvBytes], { type: 'text/csv' });
      return {
        crmMethods: json.crmMethods || [],
        blob,
      };
    },
    onSuccess: (data) => {
      setCrmMethods(data.crmMethods);
      if (data.blob) setCsvBlob(data.blob);
      setStatus('succeeded');
    },
    onError: (err) => {
      if (err.message === 'NOT_READY' && retryCount.current < MAX_RETRIES) {
        retryCount.current++;
        setTimeout(() => {
          fulfillMutation.mutate();
        }, 2000);
        return;
      }
      if (
        err.message?.toLowerCase().includes('timed out') ||
        err.message === 'TIMED_OUT'
      ) {
        setStatus('timed_out');
        return;
      }
      setStatus('failed');
    },
  });

  useEffect(() => {
    if (!sessionId) return;
    if (fulfillTriggered.current) return;
    fulfillTriggered.current = true;
    fulfillMutation.mutate();
  }, [sessionId, fulfillMutation]);

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
            <Link component={RouterLink} to={MARKETPLACE_PATH}>
              <Box
                component='img'
                src='/fexdigital-logo.svg'
                alt='FEX Digital'
                sx={{ height: 36 }}
              />
            </Link>
            <Link
              component={RouterLink}
              to={storeLink}
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
              Store
            </Link>
          </Box>
        </Box>

        {/* Content */}
        <Box
          sx={{
            maxWidth: 560,
            mx: 'auto',
            px: 3,
            py: 10,
            textAlign: 'center',
          }}
        >
          {status === 'loading' && (
            <Box
              sx={{
                bgcolor: '#fff',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: G200,
                p: 5,
              }}
            >
              <Stack
                direction='row'
                spacing={1.5}
                alignItems='center'
                justifyContent='center'
                sx={{ mb: 1 }}
              >
                <CircularProgress size={18} sx={{ color: BLUE }} />
                <Typography
                  sx={{ fontSize: '1rem', fontWeight: 600, color: G900 }}
                >
                  Finalizing your order...
                </Typography>
              </Stack>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: G500,
                  lineHeight: 1.7,
                  mt: 2,
                }}
              >
                This usually takes a few seconds. Do not close the tab.
              </Typography>
            </Box>
          )}

          {status === 'succeeded' && (
            <Box
              sx={{
                bgcolor: '#fff',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: G200,
                p: 5,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 56, color: BLUE, mb: 2 }} />
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: G900,
                  mb: 1,
                }}
              >
                Payment Successful
              </Typography>
              {crmMethods.length > 0 ? (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    sx={{
                      fontSize: '0.9375rem',
                      color: G900,
                      mb: 0.5,
                    }}
                  >
                    Leads sent directly to your {formatCrmList(crmMethods)}{' '}
                    account(s).
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.875rem', color: G900, lineHeight: 1.7 }}
                  >
                    Also emailed to you as a backup. You can download a CSV
                    below.
                  </Typography>
                </Box>
              ) : (
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    color: G500,
                    lineHeight: 1.7,
                    mb: 3,
                  }}
                >
                  Thank you for your order! Your leads have been emailed to you
                  and are ready to download below.
                </Typography>
              )}

              {csvBlob && (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <Button
                    variant='contained'
                    disableElevation
                    onClick={() => triggerDownload(csvBlob, 'leads.csv')}
                    sx={{
                      bgcolor: BLUE,
                      fontWeight: 600,
                      py: 1.5,
                      px: 4,
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
                      transition: 'all 0.2s',
                    }}
                  >
                    <DownloadIcon sx={{ fontSize: 18 }} />
                    Download Leads CSV
                  </Button>
                </Box>
              )}

              <Link
                component={RouterLink}
                to={storeLink}
                underline='none'
                sx={{
                  color: BLUE,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Browse More Leads
              </Link>
            </Box>
          )}

          {status === 'timed_out' && (
            <Box
              sx={{
                bgcolor: '#fff',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: G200,
                p: 5,
              }}
            >
              <HourglassTopIcon
                sx={{ fontSize: 56, color: '#b45309', mb: 2 }}
              />
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: G900,
                  mb: 1,
                }}
              >
                Order Timed Out
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: G500,
                  lineHeight: 1.7,
                  mb: 3,
                }}
              >
                The reservation window expired before we could complete your
                order. <strong>No charge was made.</strong> Please return to
                your cart and try again.
              </Typography>
              <Link
                component={RouterLink}
                to={storeLink}
                underline='none'
                sx={{
                  color: BLUE,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Back to Store
              </Link>
            </Box>
          )}

          {status === 'failed' && (
            <Box
              sx={{
                bgcolor: '#fff',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: G200,
                p: 5,
              }}
            >
              <ErrorOutlineIcon
                sx={{ fontSize: 56, color: '#ef4444', mb: 2 }}
              />
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: G900,
                  mb: 1,
                }}
              >
                Something Went Wrong
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  color: G500,
                  lineHeight: 1.7,
                  mb: 3,
                }}
              >
                We couldn't confirm your order automatically. Check your email —
                if payment succeeded we've sent your leads there. Otherwise
                please contact support.
              </Typography>
              <Link
                component={RouterLink}
                to={storeLink}
                underline='none'
                sx={{
                  color: BLUE,
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Return to Store
              </Link>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
