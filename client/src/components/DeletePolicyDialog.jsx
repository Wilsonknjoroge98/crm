// DeletePolicyDialog.jsx
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
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { deletePolicy } from '../utils/query';

const DeletePolicyDialog = ({ open, setOpen, policy, refetchPolicies }) => {
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) setConfirm(false);
  }, [open]);

  const { mutate, isLoading, isError, error } = useMutation({
    mutationFn: ({ policyId }) => deletePolicy({ policyId }),
    onSuccess: () => {
      refetchPolicies();
      enqueueSnackbar('Policy deleted successfully.', {
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
      setOpen(false);
    },
    onError: () => {
      enqueueSnackbar('Failed to delete policy.', {
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
    if (!policy?.id) return;
    mutate({ policyId: policy.id });
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
      <DialogTitle>Delete Policy</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant='body1'>
            You’re about to permanently delete this policy
            {policy?.policyNumber ? (
              <>
                : <strong>#{policy.policyNumber}</strong>
              </>
            ) : null}
            {policy?.carrier ? (
              <>
                {' '}
                with <strong>{policy.carrier}</strong>
              </>
            ) : null}
            .
          </Typography>

          <Alert severity='warning'>
            This action cannot be undone. The policy record will be permanently
            removed.
          </Alert>

          {isError && (
            <Alert severity='error'>
              {error?.message || 'An error occurred while deleting the policy.'}
            </Alert>
          )}

          <FormControlLabel
            control={
              <Checkbox
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
              />
            }
            label='I understand this will permanently delete the policy.'
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setOpen(false)} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleDelete}
          color='error'
          variant='contained'
          disabled={!confirm || isLoading}
        >
          {isLoading ? 'Deleting…' : 'Delete Policy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeletePolicyDialog;
