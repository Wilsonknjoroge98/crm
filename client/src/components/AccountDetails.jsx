import {
  Stack,
  Box,
  Button,
  Divider,
  Chip,
  Typography,
  Switch,
  IconButton,
  Link,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { patchAccount } from '../utils/query';

import { useAgent } from '../hooks/useAgent';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';
import { useQueryClient } from '@tanstack/react-query';

import UpdateStatesDialog from './UpdateStatesDialog';
import EditIcon from '@mui/icons-material/Edit';

const AccountDetails = ({ data }) => {
  const [openStatesDlg, setOpenStatesDlg] = useState(false);
  const navigate = useNavigate();

  const formattedDate = data?.lastIssuedDate?._seconds
    ? dayjs.unix(data?.lastIssuedDate._seconds).format('MMM D, YYYY h:mm A')
    : 'N/A';

  const agent = useAgent();
  // console.log('Agent from AccountDetails:', agent);
  const queryClient = useQueryClient();

  const [deliver, setDeliver] = useState(data?.deliver);
  const [states, setStates] = useState(data?.states || []);

  const { mutate, isPending, isError, isSuccess } = useMutation({
    mutationFn: patchAccount,
    onSuccess: () => {
      enqueueSnackbar('Account updated!', SNACKBAR_SUCCESS_OPTIONS);
      if (openStatesDlg) setOpenStatesDlg(false);
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message || 'Failed to update account.';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
      setDeliver(false);
    },
  });

  const isSettled = isError || isSuccess;

  const crmStatuses = [
    {
      label: 'Ringy',
      connected:
        data?.ringyEnabled === true &&
        typeof data?.ringySid === 'string' &&
        data.ringySid.length > 0 &&
        typeof data?.ringyToken === 'string' &&
        data.ringyToken.length > 0,
    },
    { label: 'GHL', connected: data?.ghlEnabled === true },
    { label: 'Sendblue', connected: data?.sendBlueEnabled === true },
    { label: 'InsurDial', connected: data?.insurDialEnabled === true },
  ];

  if (!data && isSettled) {
    return (
      <Stack spacing={1.5} minWidth={250}>
        <Typography variant='body2' fontWeight='bold'>
          No Account Found
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          It looks like you haven&apos;t purchased leads yet. Once you complete
          your purchase, your account will be created and you can configure your
          states and control your lead flow.{' '}
          <strong>Make sure to use the same email for your purchase.</strong>
        </Typography>
        <Button
          variant='contained'
          onClick={() =>
            window.open(
              'https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p',
              '_blank',
            )
          }
          sx={{ mt: 1 }}
          // href='https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p'
          // target='_blank'
          // rel='noopener noreferrer'
          // variant='body2'
          // underline='always'
        >
          Purchase Leads
        </Button>
        <Divider flexItem />
        <Stack direction='column' spacing={0.1}>
          <Button
            // endIcon={<LogoutOutlinedIcon />}
            size='small'
            color='error'
            onClick={handleSignOut}
          >
            Sign Out
          </Button>
          <Button
            size='small'
            color='inherit'
            onClick={() => navigate('/reset-password')}
            sx={{ color: 'text.secondary' }}
          >
            Reset Password
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <>
      <UpdateStatesDialog
        open={openStatesDlg}
        onClose={() => setOpenStatesDlg(false)}
        states={states}
        mutate={mutate}
      />
      <Stack spacing={1} minWidth={250}>
        <Typography variant='caption' color='text.secondary' fontWeight='bold'>
          Leads
        </Typography>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2'>Outstanding Leads</Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.outstandingLeads || '—'}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2'>Verified Leads</Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.verified || '—'}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2'>Unverified Leads</Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.unverified || '—'}
          </Typography>
        </Stack>

        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2'>Live Transfers</Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.liveTransfers || '—'}
          </Typography>
        </Stack>

        <Divider flexItem />

        <Typography variant='caption' color='text.secondary' fontWeight='bold'>
          Integrations
        </Typography>
        {crmStatuses
          .sort((a, b) => b.connected - a.connected)
          .map(({ label, connected }) => (
            <Stack
              key={label}
              direction='row'
              spacing={1}
              justifyContent='space-between'
              alignItems='center'
            >
              <Typography variant='body2'>{label}</Typography>
              <Box display='flex' alignItems='center' gap={0.5}>
                {connected ? (
                  <CheckCircleIcon
                    sx={{ fontSize: '1rem', color: 'success.main' }}
                  />
                ) : (
                  <CancelIcon
                    sx={{ fontSize: '1rem', color: 'text.disabled' }}
                  />
                )}
                <Typography
                  variant='caption'
                  color={connected ? 'success.main' : 'text.disabled'}
                >
                  {connected ? 'Connected' : 'Not Connected'}
                </Typography>
              </Box>
            </Stack>
          ))}

        <Divider flexItem />
        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
        >
          <Typography
            variant='caption'
            color='text.secondary'
            fontWeight='bold'
          >
            States
          </Typography>
          <Box
            display='flex'
            alignItems='center'
            justifyContent='space-between'
          >
            <IconButton
              size='small'
              color='primary'
              onClick={() => setOpenStatesDlg(true)}
            >
              <EditIcon sx={{ fontSize: '1.5rem' }} />
            </IconButton>
          </Box>
        </Stack>
        <Stack spacing={1} py={1}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {data?.states?.map((state) => (
              <Chip key={state} size='small' label={state} />
            ))}
          </Box>
        </Stack>

        <Divider flexItem />

        <Stack
          direction='row'
          spacing={1}
          justifyContent='space-between'
          alignItems='center'
        >
          <Typography variant='body2'>Lead Flow</Typography>

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
            disabled={isPending}
            onChange={(e) => {
              const newValue = e.target.checked;
              setDeliver(newValue);
              mutate({ data: { deliver: newValue, email: agent?.email } });
            }}
          />
        </Stack>
        <Divider flexItem />

        <Stack direction='row' justifyContent='space-between'>
          <Typography variant='body2'>Last Issued</Typography>
          <Typography variant='body2'>{formattedDate}</Typography>
        </Stack>
      </Stack>
    </>
  );
};

export default AccountDetails;
