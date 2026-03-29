import {
  Stack,
  Box,
  Button,
  Divider,
  Chip,
  Typography,
  Switch,
  IconButton,
  Alert,
} from '@mui/material';
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
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

const AccountDetails = ({ data }) => {
  const [openStatesDlg, setOpenStatesDlg] = useState(false);
  const navigate = useNavigate();

  const formattedDate = data?.lastIssuedDate?._seconds
    ? dayjs.unix(data?.lastIssuedDate._seconds).format('MMM D, YYYY HH:mm:ss')
    : 'N/A';

  const agent = useAgent();
  console.log('Agent from AccountDetails:', agent);
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
      const message =
        error?.response?.data?.message || 'Failed to update account.';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
      setDeliver(false);
    },
  });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();

      navigate('/login');
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };
  return (
    <>
      <UpdateStatesDialog
        open={openStatesDlg}
        onClose={() => setOpenStatesDlg(false)}
        states={states}
        mutate={mutate}
      />
      <Stack spacing={1} minWidth={250}>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2'>Outstanding Leads:</Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.outstandingLeads || '—'}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2'>Verified Leads:</Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.verified || '—'}
          </Typography>
        </Stack>
        <Stack direction='row' spacing={1} justifyContent='space-between'>
          <Typography variant='body2'>Unverified Leads:</Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.unverified || '—'}
          </Typography>
        </Stack>

        <Divider flexItem />

        <Stack spacing={1} py={1}>
          <Box
            display='flex'
            alignItems='center'
            justifyContent='space-between'
          >
            <Typography variant='body2'>States:</Typography>
            <IconButton
              size='small'
              color='primary'
              onClick={() => setOpenStatesDlg(true)}
            >
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

        <Stack
          direction='row'
          spacing={1}
          justifyContent='space-between'
          alignItems='center'
        >
          <Typography variant='body2'>Lead Flow:</Typography>

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
            onChange={(e) => {
              const newValue = e.target.checked;
              setDeliver(newValue);
              mutate({ data: { deliver: newValue, email: agent?.email } });
            }}
          />
        </Stack>
        <Divider flexItem />

        <Stack direction='row' justifyContent='space-between'>
          <Typography variant='body2'>Last Issued:</Typography>
          <Typography variant='body2'>{formattedDate}</Typography>
        </Stack>
        <Divider flexItem />
        {!data && (
          <Alert severity='error'>
            <Typography variant='caption'>
              Unable to load account details
            </Typography>
          </Alert>
        )}
        <Stack direction='row' justifyContent='flex-end'>
          <Button
            endIcon={<LogoutOutlinedIcon />}
            size='small'
            color='error'
            onClick={handleSignOut}
            sx={{ mt: 1 }}
          >
            Sign Out
          </Button>
        </Stack>
      </Stack>
    </>
  );
};

export default AccountDetails;
