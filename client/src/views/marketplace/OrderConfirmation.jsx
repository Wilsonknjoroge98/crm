// OrderConfirmation.jsx — Stripe's return_url. Calls completeOrder (which
// captures the payment and fulfills the leads), retrying while the session
// is still settling, then offers the CSV download.
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Fragment, useEffect, useState, useRef } from 'react';
import {
  useSearchParams,
  useParams,
  Link as RouterLink,
} from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { marketplaceFetch } from './api.js';
import { BORDER, GOLD, MarketplaceHeader, segmentPath } from './ui.jsx';

function formatCrmList(methods) {
  const strong = (name) => (
    <Box component='span' sx={{ fontWeight: 700 }}>
      {name}
    </Box>
  );
  if (methods.length === 1) return strong(methods[0]);
  return (
    <>
      {methods.slice(0, -1).map((m, i) => (
        <Fragment key={m}>
          {strong(m)}
          {i < methods.length - 2 ? ', ' : ' '}
        </Fragment>
      ))}
      and {strong(methods[methods.length - 1])}
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

/** Centered result card with a status-colored top stripe. */
function StatusCard({ accent, icon, title, children }) {
  return (
    <Paper
      variant='outlined'
      sx={{
        maxWidth: 560,
        width: '100%',
        mx: 'auto',
        p: 4,
        textAlign: 'center',
        borderRadius: 2,
        borderColor: BORDER,
        borderTop: '3px solid',
        borderTopColor: accent,
      }}
    >
      {icon}
      <Typography variant='h5' sx={{ mt: 1.5, mb: 1 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
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
  const storeLink = segmentPath(leadType, ctx?.tier, 'store');

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

  const backToStore = (label) => (
    <Button
      component={RouterLink}
      to={storeLink}
      color='primary'
      startIcon={<ArrowBackIcon />}
    >
      {label}
    </Button>
  );

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={4}>
        <MarketplaceHeader
          title='Order Confirmation'
          subtitle='Your purchase and lead delivery status.'
        />

        {status === 'loading' && (
          <StatusCard
            accent={GOLD}
            icon={<CircularProgress size={40} sx={{ color: GOLD }} />}
            title='Finalizing your order…'
          >
            <Typography variant='body2' color='text.secondary'>
              This usually takes a few seconds. Please keep this tab open.
            </Typography>
          </StatusCard>
        )}

        {status === 'succeeded' && (
          <StatusCard
            accent='success.main'
            icon={
              <CheckCircleOutlinedIcon
                sx={{ fontSize: 48, color: 'success.main' }}
              />
            }
            title='Payment Successful'
          >
            <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
              {crmMethods.length > 0 ? (
                <>
                  Leads were sent directly to your {formatCrmList(crmMethods)}{' '}
                  account{crmMethods.length === 1 ? '' : 's'}, and emailed to
                  you as a backup.
                </>
              ) : (
                'Thank you for your order! Your leads have been emailed to you and are ready to download.'
              )}
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              justifyContent='center'
            >
              {csvBlob && (
                <Button
                  variant='contained'
                  color='action'
                  startIcon={<DownloadIcon />}
                  onClick={() => triggerDownload(csvBlob, 'leads.csv')}
                  sx={{ fontWeight: 700 }}
                >
                  Download Leads CSV
                </Button>
              )}
              <Button
                variant='outlined'
                color='primary'
                component={RouterLink}
                to={storeLink}
                sx={{ borderColor: BORDER }}
              >
                Browse More Leads
              </Button>
            </Stack>
          </StatusCard>
        )}

        {status === 'timed_out' && (
          <StatusCard
            accent='warning.main'
            icon={
              <HourglassTopIcon sx={{ fontSize: 48, color: 'warning.main' }} />
            }
            title='Order Timed Out'
          >
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              The reservation window expired before we could complete your
              order. <strong>No charge was made.</strong> Please return to the
              store and try again.
            </Typography>
            {backToStore('Back to Store')}
          </StatusCard>
        )}

        {status === 'failed' && (
          <StatusCard
            accent='error.main'
            icon={
              <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
            }
            title='Something Went Wrong'
          >
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              We couldn&apos;t confirm your order automatically. Check your
              email — if payment succeeded we&apos;ve sent your leads there.
              Otherwise please contact info@fexdigital.com.
            </Typography>
            {backToStore('Return to Store')}
          </StatusCard>
        )}
      </Stack>
    </Container>
  );
}
