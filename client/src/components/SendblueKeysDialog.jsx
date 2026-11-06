import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useQuery } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { getSendblueConfig } from '../utils/query';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';

const SERIF = '"Libre Baskerville", serif';
const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const BORDER = '#E5E7EB';

const mask = (value) =>
  value.length <= 4 ? '••••••••' : `••••••••${value.slice(-4)}`;

const copy = async (label, value) => {
  try {
    await navigator.clipboard.writeText(value);
    enqueueSnackbar(`${label} copied`, SNACKBAR_SUCCESS_OPTIONS);
  } catch {
    enqueueSnackbar(`Could not copy ${label}`, SNACKBAR_ERROR_OPTIONS);
  }
};

const KeyRow = ({ label, value }) => (
  <Box>
    <Typography
      variant='caption'
      sx={{
        display: 'block',
        fontWeight: 700,
        color: 'text.disabled',
        fontSize: '0.675rem',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        mb: 0.5,
      }}
    >
      {label}
    </Typography>
    <Stack
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      sx={{
        pl: 1.5,
        pr: 0.5,
        py: 0.5,
        borderRadius: 1.5,
        bgcolor: '#FBFBFA',
        border: `1px solid ${BORDER}`,
      }}
    >
      {/* Selecting and copying the masked text still copies the real value */}
      <Typography
        variant='body2'
        onCopy={(event) => {
          event.preventDefault();
          event.clipboardData.setData('text/plain', value);
        }}
        sx={{ fontFamily: MONO, color: 'text.primary', userSelect: 'all' }}
      >
        {mask(value)}
      </Typography>
      <Tooltip title={`Copy ${label}`} arrow>
        <IconButton
          size='small'
          aria-label={`Copy ${label}`}
          onClick={() => copy(label, value)}
          sx={{ color: 'text.secondary' }}
        >
          <ContentCopyIcon sx={{ fontSize: '1rem' }} />
        </IconButton>
      </Tooltip>
    </Stack>
  </Box>
);

const SendblueKeysDialog = ({ open, onClose, email }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sendblueConfig', email],
    queryFn: getSendblueConfig,
    enabled: open && !!email,
    // secrets: refetch on each open, don't keep them in the cache
    gcTime: 0,
    staleTime: 0,
    retry: false,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
    >
      <DialogTitle sx={{ fontFamily: SERIF, fontWeight: 700 }}>
        Sendblue API Keys
      </DialogTitle>
      <DialogContent>
        {isLoading ? (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Skeleton variant='rounded' height={52} />
            <Skeleton variant='rounded' height={52} />
          </Stack>
        ) : isError ? (
          <Typography variant='body2' color='error' sx={{ fontFamily: SANS }}>
            Could not load your Sendblue API keys. Try again in a moment.
          </Typography>
        ) : !data?.configured ? (
          <Typography
            variant='body2'
            sx={{ fontFamily: SANS, color: 'text.secondary' }}
          >
            Your Sendblue line is still being provisioned. Your API keys will
            appear here once it&apos;s ready.
          </Typography>
        ) : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <KeyRow label='API Key' value={data.apiKey} />
            <KeyRow label='API Secret' value={data.apiSecret} />
            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', fontFamily: SANS }}
            >
              Keep these private. Anyone with both keys can send messages from
              your line.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ pb: 2, px: 3 }}>
        <Button size='small' onClick={onClose} sx={{ color: 'text.secondary' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendblueKeysDialog;
