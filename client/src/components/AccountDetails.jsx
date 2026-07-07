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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Link,
} from '@mui/material';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getInsurDialConfig,
  patchAccount,
  patchInsurDialConfig,
} from '../utils/query';

import { useAgent } from '../hooks/useAgent';
import { enqueueSnackbar } from 'notistack';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';
import UpdateStatesDialog from './UpdateStatesDialog';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import AgentCardSettings from './AgentCardSettings';

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
  const [activeTab, setActiveTab] = useState(0);

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
    queryKey: ['insurDialConfig', agent?.email],
    queryFn: () => getInsurDialConfig({ email: agent?.email }),
    enabled: openApiKeyDialog && !!agent?.email,
  });

  useEffect(() => {
    if (!openApiKeyDialog || !insurDialConfig) return;
    setToken('x'.repeat(insurDialConfig.tokenLength));
    setTokenEdited(false);
  }, [insurDialConfig, openApiKeyDialog]);

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
      const crm = error?.response?.data?.crm;
      const message =
        crm === 'insurDialEnabled' ? (
          'Set InsurDial API key before enabling.'
        ) : crm === 'ringyEnabled' || crm === 'ghlEnabled' ? (
          <>
            <Link
              href={
                crm === 'ringyEnabled'
                  ? 'https://docs.google.com/document/d/120EYPFnRJczO79oIkzEU7uARHvHJzFCFswnElkdxx9A/edit?tab=t.0'
                  : 'https://docs.google.com/document/d/1rtzU2BLKzsZnedzcLOvHWQAqS1nUMR85Iep3y1B53GY/edit?usp=sharing'
              }
              target='_blank'
              rel='noopener noreferrer'
              sx={{ mr: 0.5 }}
            >
              Set up {crm === 'ringyEnabled' ? 'Ringy' : 'GHL'}
            </Link>
            before enabling.
          </>
        ) :
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
    mutationFn: patchInsurDialConfig,
    onSuccess: () => {
      enqueueSnackbar('InsurDial API key saved!', SNACKBAR_SUCCESS_OPTIONS);
      queryClient.setQueriesData({ queryKey: ['account'] }, (account) => {
        if (!account) return account;
        return { ...account, insurDialEnabled: true };
      });
      queryClient.setQueryData(['insurDialConfig', agent?.email], {
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

  if (!data) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 560 }}>
        <Typography variant='h6' fontWeight='bold'>
          No Account Found
        </Typography>
        <Typography variant='body2' color='text.secondary'>
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
        maxWidth='sm'
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
      <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)}>
        <Tab label='Leads' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
        <Tab
          label='Integrations'
          sx={{ letterSpacing: 1, fontSize: '.875rem' }}
        />
        <Tab label='States' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
        <Tab label='Card' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
      </Tabs>

      <Box sx={{ mt: 4 }}>
        {activeTab === 1 && (
          <Box sx={{ maxWidth: 525 }}>
            <Typography variant='h6' fontWeight={600} mb={1}>
              CRM Integrations
            </Typography>
            <Stack divider={<Divider flexItem />}>
              {CRM_INTEGRATIONS.map(
                ({ key, label, field, informational }) => {
                  const connected =
                    (crmOverrides[key] ?? data?.[field]) === true;
                  const updatePending = isCrmPending;

                  return (
                    <Stack
                      key={key}
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent='space-between'
                      alignItems={{ xs: 'stretch', sm: 'center' }}
                      spacing={2}
                      sx={{ py: 1 }}
                    >
                      <Stack
                        direction='row'
                        alignItems='center'
                        sx={{ position: 'relative' }}
                      >
                        {key === 'insurDial' && (
                          <Tooltip title='Set API key' arrow>
                            <IconButton
                              size='small'
                              aria-label='Set InsurDial API key'
                              onClick={() => setOpenApiKeyDialog(true)}
                              sx={{
                                position: 'absolute',
                                right: 'calc(100% + 2px)',
                                p: 0.5,
                              }}
                            >
                              <KeyOutlinedIcon
                                sx={{
                                  fontSize: '1.1rem',
                                  transform: 'rotate(45deg)',
                                }}
                              />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Typography variant='subtitle2'>{label}</Typography>
                      </Stack>

                      {informational ? (
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Typography
                            variant='caption'
                            color={connected ? 'success.main' : 'text.secondary'}
                          >
                            {connected ? 'Connected' : 'Not Connected'}
                          </Typography>
                          <Box
                            sx={{
                              width: 38,
                              display: 'flex',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Tooltip title='Talk to administrators' arrow>
                              <IconButton
                                size='small'
                                aria-label={`${label} integration information`}
                              >
                                <HelpOutlineIcon
                                  sx={{
                                    fontSize: '1.25rem',
                                    color: 'text.secondary',
                                  }}
                                />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Stack>
                      ) : (
                        <Stack
                          direction='row'
                          alignItems='center'
                          justifyContent={{ xs: 'space-between', sm: 'flex-end' }}
                          spacing={1}
                          sx={{ flexShrink: 0 }}
                        >
                          <Typography
                            variant='caption'
                            color={connected ? 'success.main' : 'text.secondary'}
                          >
                            {connected ? 'Connected' : 'Not Connected'}
                          </Typography>
                          <Switch
                            size='small'
                            checked={connected}
                            sx={{
                              pointerEvents: updatePending ? 'none' : 'auto',
                              '& .MuiSwitch-switchBase.Mui-checked': {
                                color: 'success.main',
                              },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: 'success.main',
                              },
                            }}
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
                            inputProps={{
                              'aria-label': `${label} integration status`,
                              'aria-disabled': updatePending,
                            }}
                          />
                        </Stack>
                      )}
                    </Stack>
                  );
                },
              )}
            </Stack>
          </Box>
        )}

        {activeTab === 0 && (
          <Box sx={{ maxWidth: 600 }}>
            <Typography variant='h6' fontWeight={600} mb={2}>
              Leads Summary
            </Typography>
            <Stack spacing={0.75}>
              {[
                ['Outstanding Leads', data?.outstandingLeads ?? 0],
                ['Verified Leads', data?.verified ?? 0],
                ['Unverified Leads', data?.unverified ?? 0],
                ['Live Transfers', data?.liveTransfers ?? 0],
              ].map(([label, value]) => (
                <Stack
                  key={label}
                  direction='row'
                  spacing={2}
                  alignItems='baseline'
                >
                  <Typography
                    variant='body1'
                    color='text.secondary'
                    sx={{ width: 180, whiteSpace: 'nowrap' }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant='body1'
                    fontWeight={600}
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />

            <Stack spacing={0.75} alignItems='flex-start'>
              <Stack direction='row' spacing={2} alignItems='center'>
                <Typography
                  variant='body1'
                  color='text.secondary'
                  sx={{ width: 180 }}
                >
                  Lead Flow
                </Typography>
                <Switch
                  size='small'
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
              <Stack direction='row' spacing={2} alignItems='baseline'>
                <Typography
                  variant='body1'
                  color='text.secondary'
                  sx={{ width: 180, whiteSpace: 'nowrap' }}
                >
                  Last Issued
                </Typography>
                <Typography variant='body1'>{formattedDate}</Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            <Stack spacing={3} alignItems='flex-start'>
              <Box>
                <Typography variant='h6' fontWeight={600} mb={1}>
                  Licensed States
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {data?.states?.length ? (
                    data.states.map((state) => (
                      <Chip key={state} size='small' label={state} />
                    ))
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      No states selected
                    </Typography>
                  )}
                </Box>
              </Box>
              <Button
                variant='outlined'
                startIcon={<EditIcon />}
                onClick={() => setOpenStatesDlg(true)}
              >
                Edit States
              </Button>
            </Stack>
          </Box>
        )}

        {activeTab === 3 && (
          <AgentCardSettings accountData={data} agentData={agent} />
        )}
      </Box>
    </>
  );
};

export default AccountDetails;
