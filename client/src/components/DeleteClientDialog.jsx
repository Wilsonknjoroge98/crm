// DeleteClientDialog.jsx
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

import { deleteClient } from '../utils/query';

import useAuth from '../hooks/useAuth';

const DeleteClientDialog = ({ open, setOpen, client, refetchClients }) => {
  const [confirm, setConfirm] = useState(false);

  const { userToken } = useAuth();

  useEffect(() => {
    if (!open) setConfirm(false);
  }, [open]);

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: deleteClient,
    onSuccess: () => {
      enqueueSnackbar('Client deleted successfully.', {
        variant: 'success',
        style: {
          fontWeight: 'bold',
          fontFamily: `"Libre Baskerville", serif`,
          fontSize: '1rem',
        },
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
      });
      refetchClients?.();
      setOpen(false);
    },
    onError: () => {
      enqueueSnackbar('Failed to delete client.', {
        variant: 'error',
        style: {
          fontWeight: 'bold',
          fontFamily: `"Libre Baskerville", serif`,
          fontSize: '1rem',
        },
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
      });
    },
  });

  const handleDelete = () => {
    if (!client?.id) return;
    mutate({ token: userToken, data: { clientId: client.id } });
  };

  const fullName = client
    ? `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim()
    : '';

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
      <DialogTitle>Delete Client</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant='body1'>
            You’re about to permanently delete{' '}
            <strong>{fullName || 'this client'}</strong>.
          </Typography>
          <Alert severity='warning'>
            This action cannot be undone.{' '}
            <strong>All associated policies</strong> will be deleted along with
            the client.
          </Alert>

          {isError && (
            <Alert severity='error'>
              {error?.message || 'An error occurred while deleting the client.'}
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
            }
            label='I understand this will permanently delete the client and all associated policies.'
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setOpen(false)} disabled={isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          color='error'
          variant='contained'
          disabled={!confirm || isPending}
        >
          {isPending ? 'Deleting…' : 'Delete Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteClientDialog;
