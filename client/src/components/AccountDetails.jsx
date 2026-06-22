import {
  Stack,
  Box,
  Button,
  Divider,
  Chip,
  Typography,
  Switch,
  Tooltip,
  IconButton,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getInsurDialConfig, patchAccount } from '../utils/query';

import { useAgent } from '../hooks/useAgent';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';
import UpdateStatesDialog from './UpdateStatesDialog';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';

const CRM_INTEGRATIONS = [
  { key: 'ringy', label: 'Ringy', field: 'ringyEnabled' },
  { key: 'ghl', label: 'GHL', field: 'ghlEnabled' },
  { key: 'insurDial', label: 'InsurDial', field: 'insurDialEnabled' },
  {
    key: 'sendblue',
    label: 'Sendblue',
    field: 'sendBlueEnabled',
    informational: true,
  },
];

const AccountDetails = ({ data }) => {
  const [openStatesDlg, setOpenStatesDlg] = useState(false);
  const [openApiKeyDialog, setOpenApiKeyDialog] = useState(false);
  const [token, setToken] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const navigate = useNavigate();

  const closeApiKeyDialog = () => {
    setToken('');
    setTokenEdited(false);
    setOpenApiKeyDialog(false);
  };

  const formattedDate = data?.lastIssuedDate?._seconds
    ? dayjs.unix(data?.lastIssuedDate._seconds).format('MMM D, YYYY h:mm A')
    : 'N/A';

  const agent = useAgent();
  // console.log('Agent from AccountDetails:', agent);
  const queryClient = useQueryClient();

  const [deliver, setDeliver] = useState(data?.deliver);
  const [states, setStates] = useState(data?.states || []);
  const [crmOverrides, setCrmOverrides] = useState({});

  const {
    data: insurDialConfig,
    isLoading: isConfigLoading,
    isError: isConfigError,
  } = useQuery({
    queryKey: ['insurDialConfig'],
    queryFn: getInsurDialConfig,
    enabled: openApiKeyDialog,
  });

  useEffect(() => {
    if (!openApiKeyDialog || !insurDialConfig) return;
    setToken('x'.repeat(insurDialConfig.tokenLength));
    setTokenEdited(false);
  }, [insurDialConfig, openApiKeyDialog]);

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

  const { mutate: updateCrm, isPending: isCrmPending } = useMutation({
    mutationFn: patchAccount,
    onSuccess: (_, variables) => {
      enqueueSnackbar('Account updated!', SNACKBAR_SUCCESS_OPTIONS);
      queryClient.setQueriesData({ queryKey: ['account'] }, (account) => {
        if (!account) return account;
        return { ...account, [variables.field]: variables.value };
      });
      setCrmOverrides((current) => {
        const next = { ...current };
        delete next[variables.crmKey];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
    onError: (error, variables) => {
      const message =
        error?.response?.data?.message || 'Failed to update account.';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
      setCrmOverrides((current) => {
        const next = { ...current };
        delete next[variables.crmKey];
        return next;
      });
    },
  });

  const { mutate: saveToken, isPending: isTokenPending } = useMutation({
    mutationFn: patchAccount,
    onSuccess: () => {
      enqueueSnackbar('InsurDial API key saved!', SNACKBAR_SUCCESS_OPTIONS);
      queryClient.setQueriesData({ queryKey: ['account'] }, (account) => {
        if (!account) return account;
        return { ...account, insurDialEnabled: true };
      });
      queryClient.setQueryData(['insurDialConfig'], {
        configured: true,
        tokenLength: token.trim().length,
      });
      setToken('');
      setTokenEdited(false);
      setOpenApiKeyDialog(false);
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message || 'Failed to save API key.';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
    },
  });

  const isSettled = isError || isSuccess;

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
      <Dialog
        open={openApiKeyDialog}
        onClose={() => {
          if (!isTokenPending) closeApiKeyDialog();
        }}
        fullWidth
        maxWidth='xs'
      >
        <DialogTitle>Configure InsurDial API Key</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label='API key'
            placeholder='Paste your API key'
            type='password'
            value={token}
            disabled={isConfigLoading || isConfigError}
            error={isConfigError}
            helperText={
              isConfigLoading
                ? 'Checking for an existing API key...'
                : isConfigError
                  ? 'Could not check the existing API key.'
                  : undefined
            }
            onFocus={() => {
              if (!tokenEdited) {
                setToken('');
                setTokenEdited(true);
              }
            }}
            onChange={(event) => {
              setTokenEdited(true);
              setToken(event.target.value);
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            disabled={isTokenPending}
            onClick={closeApiKeyDialog}
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={
              isConfigLoading ||
              isConfigError ||
              isTokenPending ||
              (tokenEdited && !token.trim())
            }
            onClick={() => {
              if (!tokenEdited) {
                closeApiKeyDialog();
                return;
              }
              saveToken({
                data: {
                  email: agent?.email,
                  token: token.trim(),
                },
              });
            }}
          >
            {isTokenPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
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
        {CRM_INTEGRATIONS.map(({ key, label, field, informational }) => {
          const connected = (crmOverrides[key] ?? data?.[field]) === true;
          const updatePending = isCrmPending;

          return (
            <Stack
              key={key}
              direction='row'
              spacing={1}
              justifyContent='space-between'
              alignItems='center'
            >
              <Box display='flex' alignItems='center' position='relative'>
                {key === 'insurDial' && (
                  <Tooltip title='Set API key' arrow>
                    <IconButton
                      aria-label='Set InsurDial API key'
                      size='small'
                      onClick={() => setOpenApiKeyDialog(true)}
                      sx={{
                        position: 'absolute',
                        left: -25,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        p: 0.5,
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <KeyOutlinedIcon
                        sx={{
                          fontSize: '1rem',
                          color: 'text.secondary',
                          transform: 'rotate(45deg)',
                        }}
                      />
                    </IconButton>
                  </Tooltip>
                )}
                <Typography variant='body2'>{label}</Typography>
              </Box>
              <Box display='flex' alignItems='center' gap={0.5}>
                <Typography
                  variant='caption'
                  color={connected ? 'success.main' : 'text.disabled'}
                >
                  {connected ? 'Connected' : 'Not Connected'}
                </Typography>
                {informational ? (
                  <Tooltip title='Talk to administrators' arrow>
                    <Box
                      width={40}
                      height={24}
                      display='flex'
                      alignItems='center'
                      justifyContent='center'
                    >
                      <HelpOutlineIcon
                        aria-label={`${label} integration information`}
                        sx={{ fontSize: '1.25rem', color: 'text.disabled' }}
                      />
                    </Box>
                  </Tooltip>
                ) : (
                  <Switch
                    size='small'
                    checked={connected}
                    onChange={(event) => {
                      if (updatePending) return;
                      const nextConnected = event.target.checked;
                      setCrmOverrides((current) => ({
                        ...current,
                        [key]: nextConnected,
                      }));
                      updateCrm({
                        data: {
                          email: agent?.email,
                          [field]: nextConnected,
                        },
                        crmKey: key,
                        field,
                        value: nextConnected,
                      });
                    }}
                    sx={{
                      pointerEvents: updatePending ? 'none' : 'auto',
                      '& .MuiSwitch-track': {
                        backgroundColor: '#bdbdbd !important',
                        opacity: '0.5 !important',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: 'success.main',
                        opacity: 1,
                      },
                    }}
                    inputProps={{
                      'aria-label': `${label} integration status`,
                      'aria-disabled': updatePending,
                    }}
                  />
                )}
              </Box>
            </Stack>
          );
        })}

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
