import { useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { useMutation } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { subscribeReleaseNotifications } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

// Opened by the disabled quick-action buttons (Call / Text / Disposition /
// Appointment) on the Business cards. The server records the signup against
// the logged-in account's email.
const ReleaseNotificationDialog = ({ open, onClose }) => {
  const [optedIn, setOptedIn] = useState(false);

  const { mutate: subscribe, isPending } = useMutation({
    mutationFn: subscribeReleaseNotifications,
    onSuccess: () => {
      enqueueSnackbar(
        "You're on the list — we'll email you at launch.",
        SNACKBAR_SUCCESS_OPTIONS,
      );
      setOptedIn(false);
      onClose();
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.error || 'Failed to save your signup',
        SNACKBAR_ERROR_OPTIONS,
      );
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>
        <Stack direction='row' spacing={1} alignItems='center'>
          <NotificationsActiveOutlinedIcon color='primary' />
          <span>Integrated dialer coming soon</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography color='text.secondary' sx={{ mb: 2 }}>
          The integrated sendblue texter / dialer — one-click Call, Text,
          Disposition, and Appointment actions — is on the way.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={optedIn}
              onChange={(event) => setOptedIn(event.target.checked)}
            />
          }
          label='Notify me when this is available'
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant='contained'
          disabled={!optedIn || isPending}
          onClick={() => subscribe({})}
        >
          {isPending ? 'Saving…' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReleaseNotificationDialog;
