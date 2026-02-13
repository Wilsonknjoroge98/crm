import { Stack, Box, Divider, Chip, Typography, Switch, IconButton } from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { patchAccount } from '../utils/query';

import useAuth from '../hooks/useAuth';
import { enqueueSnackbar } from 'notistack';
import { SNACKBAR_SUCCESS_OPTIONS } from '../utils/constants';
import { useQueryClient } from '@tanstack/react-query';

import UpdateStatesDialog from './UpdateStatesDialog';
import EditIcon from '@mui/icons-material/Edit';

const AccountDetails = ({ data }) => {
  const [openStatesDlg, setOpenStatesDlg] = useState(false);

  const formattedDate = data?.lastIssuedDate?._seconds
    ? dayjs.unix(data?.lastIssuedDate._seconds).format('MMM D, YYYY')
    : 'N/A';

  const { userToken, agent } = useAuth();
  const queryClient = useQueryClient();

  const [deliver, setDeliver] = useState(data?.deliver);
  const [states, setStates] = useState(data?.states || []);

  const { mutate, isPending } = useMutation({
    mutationFn: patchAccount,
    onSuccess: () => {
      enqueueSnackbar('Account updated!', SNACKBAR_SUCCESS_OPTIONS);
      if (openStatesDlg) setOpenStatesDlg(false);
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
    onError: (error) => {
      console.error('Error updating account:', error);
    },
  });

  useEffect(() => {
    mutate({
      token: userToken,
      data: {
        deliver: deliver,
        email: agent?.email,
      },
    });
  }, [deliver]);
  // TODO: data.verified + data.unverified lead type counts
  return (
    <>
      <UpdateStatesDialog
        open={openStatesDlg}
        onClose={() => setOpenStatesDlg(false)}
        states={states}
        mutate={mutate}
      />
      <Stack spacing={1}>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2' color='text.secondary'>
            Outstanding Leads:
          </Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.outstandingLeads}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2' color='text.secondary'>
            Verified Leads:
          </Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.verified}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2' color='text.secondary'>
            Unverified Leads:
          </Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.unverified}
          </Typography>
        </Stack>

        <Divider flexItem />

        <Stack spacing={1} py={1}>
          <Box display='flex' alignItems='center' justifyContent='space-between'>
            <Typography variant='body2' color='text.secondary'>
              States:
            </Typography>
            <IconButton size='small' color='action' onClick={() => setOpenStatesDlg(true)}>
              <EditIcon sx={{ fontSize: '1.5rem' }} />
            </IconButton>
          </Box>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {data?.states?.map((state) => (
              <Chip key={state} size='small' label={state} />
            ))}
          </Box>
        </Stack>

        <Divider flexItem />

        <Stack direction='row' spacing={1} justifyContent='space-between' alignItems='center'>
          <Typography variant='body2' color='text.secondary'>
            Lead Flow:
          </Typography>

          <Switch
            variant='body2'
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#CA9837',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: '#CA9837',
              },
            }}
            checked={deliver}
            disabled={!data || isPending}
            onChange={(e) => setDeliver(e.target.checked)}
          />
        </Stack>
        <Divider flexItem />

        <Stack direction='row' justifyContent='space-between'>
          <Typography variant='body2' color='text.secondary'>
            Last Issued:
          </Typography>
          <Typography variant='body2'>{formattedDate}</Typography>
        </Stack>
      </Stack>
    </>
  );
};

export default AccountDetails;
