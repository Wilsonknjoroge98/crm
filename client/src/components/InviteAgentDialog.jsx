import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Alert,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { createInvite } from '../utils/query';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';

const InviteAgentDialog = ({ open, setOpen }) => {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) setConfirmed(false);
  }, [open]);

  const {
    mutate: generateInvite,
    isPending,
    isError,
  } = useMutation({
    mutationFn: createInvite,
    onSuccess: (data) => {
      const link = `${window.location.origin}/signup?token=${data.token}`;
      navigator.clipboard.writeText(link);
      enqueueSnackbar(
        'Invite link copied to clipboard',
        SNACKBAR_SUCCESS_OPTIONS,
      );
      setOpen(false);
    },
    onError: () =>
      enqueueSnackbar('Failed to generate invite link', SNACKBAR_ERROR_OPTIONS),
  });

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
      <DialogTitle>Invite Agent</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack spacing={1} sx={{ pl: 1 }}>
            <Typography variant='body2'>
              1. Click <strong>Generate Link</strong> below.
            </Typography>
            <Typography variant='body2'>
              2. Your invite link will be <strong>automatically copied</strong>{' '}
              ready to paste into a text message, email, or wherever you'd like
              to send it.
            </Typography>
            <Typography variant='body2'>
              3. Send that link to the agent you want to invite. When they open
              it and sign up, they'll be registered as your downline in the CRM.
            </Typography>
          </Stack>

          {isError && (
            <Alert severity='error'>
              Something went wrong. Please try again.
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
            }
            label='I understand this link can only be used once, expires in 7 days, and should only be sent to agents joining my downline.'
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={() => generateInvite()}
          disabled={!confirmed || isPending}
        >
          {isPending ? 'Generating…' : 'Generate Token'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteAgentDialog;
