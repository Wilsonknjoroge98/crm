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
  Divider,
  IconButton,
  Tooltip,
  Box,
  Chip,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { getInvites, createInvite } from '../utils/query';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';

const InviteAgentDialog = ({ open, setOpen }) => {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) setConfirmed(false);
  }, [open]);

  const { data: activeInvites = [] } = useQuery({
    queryKey: ['invites'],
    queryFn: getInvites,
    enabled: open,
  });

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
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      setConfirmed(false);
    },
    onError: () =>
      enqueueSnackbar('Failed to generate invite link', SNACKBAR_ERROR_OPTIONS),
  });

  const handleCopy = (token) => {
    const link = `${window.location.origin}/signup?token=${token}`;
    navigator.clipboard.writeText(link);
    enqueueSnackbar(
      'Invite link copied to clipboard',
      SNACKBAR_SUCCESS_OPTIONS,
    );
  };

  console.log({ activeInvites });

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='sm' fullWidth>
      <DialogTitle>Invite Agent</DialogTitle>
      <Divider />
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack spacing={1} sx={{ pl: 1 }}>
            <>
              {' '}
              <Typography variant='body2'>
                1. Click <strong>Generate Link</strong> below.
              </Typography>
              <Typography variant='body2'>
                2. Paste the link somewhere safe you’ll need to share it with
                the agent you want to invite.
              </Typography>
              <Typography variant='body2'>
                3. Send that link to the agent you want to invite.
              </Typography>{' '}
              {/* <FormControlLabel
                  control={
                    <Checkbox
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                  }
                  label='I understand this expires in 7 days, and should only be sent to agents joining my downline.'
                /> */}
            </>
          </Stack>

          {isError && (
            <Alert severity='error'>
              Something went wrong. Please try again.
            </Alert>
          )}

          {activeInvites.length > 0 && (
            <>
              <Stack spacing={1}>
                <Typography variant='subtitle2' fontWeight={600}>
                  Active Invite Links
                </Typography>
                {activeInvites.map((invite) => {
                  const link = `${window.location.origin}/signup?token=${invite.token}`;
                  const daysLeft = dayjs(invite.expires_at).diff(
                    dayjs(),
                    'day',
                  );
                  return (
                    <Box
                      key={invite.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1,
                        borderRadius: 1,
                        backgroundColor: 'grey.50',
                        border: '1px solid',
                        borderColor: 'grey.200',
                      }}
                    >
                      <Stack spacing={0.25}>
                        <Typography
                          variant='caption'
                          sx={{
                            fontFamily: 'monospace',
                            color: 'text.secondary',
                            maxWidth: 320,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                          }}
                        >
                          {link}
                        </Typography>
                        <Chip
                          label={`Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                          size='small'
                          color={daysLeft <= 2 ? 'warning' : 'default'}
                          sx={{
                            width: 'fit-content',
                            height: 18,
                            fontSize: 11,
                          }}
                        />
                      </Stack>
                      <Tooltip title='Copy link'>
                        <IconButton
                          size='small'
                          onClick={() => handleCopy(invite.token)}
                        >
                          <ContentCopyIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  );
                })}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>

      <>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant='contained'
            onClick={() => generateInvite()}
            disabled={isPending || activeInvites.length >= 5}
          >
            {isPending ? 'Generating…' : 'Generate Link'}
          </Button>
        </DialogActions>
      </>
    </Dialog>
  );
};

export default InviteAgentDialog;
