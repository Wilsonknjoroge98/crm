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
  Card,
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
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import AgentCardSettings from './AgentCardSettings';

const SERIF = '"Libre Baskerville", serif';
const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const BORDER = '#E5E7EB';

const STATUS_PILL_BASE = {
  height: 20,
  borderRadius: 10,
  fontFamily: SANS,
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  px: 0.5,
  '& .MuiChip-label': {
    px: 0.75,
  },
};

const CRM_INTEGRATIONS = [
  {
    key: 'ringy',
    label: 'Ringy CRM',
    field: 'ringyEnabled',
    description: 'Large support network. Easy integration.',
    setupUrl:
      'https://docs.google.com/document/d/120EYPFnRJczO79oIkzEU7uARHvHJzFCFswnElkdxx9A/edit?tab=t.0',
  },
  {
    key: 'ghl',
    label: 'GoHighLevel (GHL)',
    field: 'ghlEnabled',
    description:
      'Streamlined integration process for sub-accounts. Just click and install.',
    setupUrl:
      'https://docs.google.com/document/d/1rtzU2BLKzsZnedzcLOvHWQAqS1nUMR85Iep3y1B53GY/edit?usp=sharing',
  },
  {
    key: 'sendblue',
    label: 'Sendblue SMS',
    field: 'sendBlueEnabled',
    description: 'Native iMessage line and fexdigital integration.',
    informational: true,
  },
  {
    key: 'insurDial',
    label: 'InsurDial',
    field: 'insurDialEnabled',
    description: 'High-speed dialer.',
    setupUrl: null,
  },
];

// dayjs renders these in the viewer's own browser timezone (no .utc()/.tz()
// call anywhere), which is what we want, but that's invisible to the agent
// without a label. Resolves the abbreviation from the specific timestamp
// being formatted, not from "now", so DST-boundary dates still show the
// correct abbreviation for that moment (e.g. a January date reads PST even
// when viewed in July).
const formatLocalTimestamp = (seconds) => {
  if (!seconds) return 'N/A';
  const date = dayjs.unix(seconds).toDate();
  const tzAbbr = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
    .formatToParts(date)
    .find((part) => part.type === 'timeZoneName')?.value;
  const formatted = dayjs(date).format('MMM D, YYYY h:mm A');
  return tzAbbr ? `${formatted} ${tzAbbr}` : formatted;
};

const MetricRow = ({ label, value }) => (
  <Stack
    direction='row'
    justifyContent='space-between'
    alignItems='center'
    py={1}
    sx={{ borderBottom: '1px solid #F5F5F4' }}
  >
    <Typography
      variant='body2'
      sx={{ fontFamily: SANS, color: 'text.secondary' }}
    >
      {label}
    </Typography>
    <Typography
      variant='body2'
      sx={{ fontFamily: MONO, fontWeight: 700, color: 'text.primary' }}
    >
      {value}
    </Typography>
  </Stack>
);

const AccountDetails = ({ data, defaultTab }) => {
  const [openStatesDlg, setOpenStatesDlg] = useState(false);
  const [openApiKeyDialog, setOpenApiKeyDialog] = useState(false);
  const [token, setToken] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab ?? 0);

  const closeApiKeyDialog = () => {
    setToken('');
    setTokenEdited(false);
    setOpenApiKeyDialog(false);
  };

  const agent = useAgent();
  const queryClient = useQueryClient();

  const [deliver, setDeliver] = useState(data?.deliver);
  const states = data?.states || [];
  const [crmOverrides, setCrmOverrides] = useState({});

  useEffect(() => {
    setDeliver(data?.deliver);
  }, [data?.deliver]);

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
    setToken('x'.repeat(insurDialConfig.tokenLength || 0));
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
        ) : (
          error?.response?.data?.message || 'Failed to update account.'
        );
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

  // Every connected CRM, not just one "winning" one — dispatch fans out to
  // all of them in parallel (see metaLeadWebhook/routes/lead.js), and
  // instant-forms eligibility counts any one of the four as "connected,"
  // Sendblue included. Reuses CRM_INTEGRATIONS instead of a separate
  // hardcoded list so this can't quietly drift from what actually gates
  // delivery server-side.
  const connectedCrmLabels = CRM_INTEGRATIONS.filter(
    ({ key, field }) => (crmOverrides[key] ?? data?.[field]) === true,
  ).map(({ label }) => label);

  const isInstantActive = states.length > 0 && connectedCrmLabels.length > 0;

  if (!data) {
    return (
      <Card
        variant='outlined'
        sx={{
          maxWidth: 600,
          p: 3.5,
          mt: 3,
          borderRadius: 3,
          bgcolor: '#FFFFFF',
          borderColor: BORDER,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <Typography
          variant='h6'
          sx={{ fontFamily: SERIF, fontWeight: 700, mb: 1 }}
        >
          No Account Found
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mb: 2.5, lineHeight: 1.6 }}
        >
          It looks like you haven&apos;t purchased leads yet. Once you complete
          your purchase, your account will be initialized and you can select
          licensed states, connect your CRM, and control your lead flow.
        </Typography>
        <Button
          variant='contained'
          onClick={() =>
            window.open(
              'https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p',
              '_blank',
            )
          }
          sx={{
            bgcolor: 'action.main',
            color: 'action.contrastText',
            fontWeight: 600,
            '&:hover': { bgcolor: '#C49F2B' },
          }}
        >
          Purchase Leads
        </Button>
      </Card>
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

      {/* InsurDial API Key Dialog */}
      <Dialog
        open={openApiKeyDialog}
        onClose={() => {
          if (!isTokenPending) closeApiKeyDialog();
        }}
        fullWidth
        maxWidth='sm'
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1 },
          },
        }}
      >
        <DialogTitle sx={{ fontFamily: SERIF, fontWeight: 700 }}>
          Configure InsurDial API Key
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size='small'
            label='API Key'
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
            sx={{ mt: 1.5 }}
          />
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button
            size='small'
            disabled={isTokenPending}
            onClick={closeApiKeyDialog}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            size='small'
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
            sx={{
              bgcolor: 'action.main',
              color: 'action.contrastText',
              '&:hover': { bgcolor: '#C49F2B' },
            }}
          >
            {isTokenPending ? 'Saving...' : 'Save API Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Profile Section Navigation */}
      <Box sx={{ borderBottom: `1px solid ${BORDER}`, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontFamily: SANS,
              fontSize: '0.9rem',
              fontWeight: 600,
              minWidth: 100,
              color: 'text.secondary',
              '&.Mui-selected': { color: 'text.primary' },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'text.primary',
              height: 2.5,
              borderRadius: '2px 2px 0 0',
            },
          }}
        >
          <Tab label='Leads' />
          <Tab label='CRMs' />
          <Tab label='States' />
          <Tab label='Producer Page' />
        </Tabs>
      </Box>

      {/* TAB 0: LEADS (Three-Way Split) */}
      {activeTab === 0 && (
        <Box sx={{ maxWidth: 640 }}>
          <Stack spacing={3.5}>
            {/* 1. STANDARD FUNNEL LEADS */}
            <Box>
              <Typography
                variant='caption'
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: 'text.disabled',
                  fontSize: '0.675rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                Standard Funnel
              </Typography>

              {/* Funnel Flow Switch & Last Issued */}
              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 2,
                  bgcolor: '#FBFBFA',
                  border: `1px solid ${BORDER}`,
                }}
              >
                <Box sx={{ pr: 2 }}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color: 'text.primary' }}
                    >
                      Lead Flow
                    </Typography>
                    <Chip
                      label={deliver ? 'Active' : 'Paused'}
                      size='small'
                      sx={{
                        ...STATUS_PILL_BASE,
                        bgcolor: deliver ? 'success.light' : '#F3F4F6',
                        color: deliver ? 'success.main' : 'text.secondary',
                        border: `1px solid ${deliver ? 'rgba(63, 111, 91, 0.2)' : BORDER}`,
                      }}
                    />
                  </Stack>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                  >
                    Pause or resume inbound web funnel delivery at any time.
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{
                      color: 'text.disabled',
                      display: 'block',
                      mt: 0.5,
                      fontFamily: SANS,
                    }}
                  >
                    Last issued:{' '}
                    <Box
                      component='span'
                      sx={{ fontFamily: MONO, color: 'text.secondary' }}
                    >
                      {formatLocalTimestamp(data?.lastIssuedDate?._seconds)}
                    </Box>
                  </Typography>
                </Box>
                <Switch
                  size='small'
                  checked={Boolean(deliver)}
                  disabled={isPending}
                  onChange={(e) => {
                    const newValue = e.target.checked;
                    setDeliver(newValue);
                    mutate({
                      data: { deliver: newValue, email: agent?.email },
                    });
                  }}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: 'text.primary',
                      '& + .MuiSwitch-track': { bgcolor: 'text.primary' },
                    },
                  }}
                />
              </Stack>

              {/* Aggregate Parent Row */}
              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                py={1.25}
                sx={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <Typography
                  variant='body2'
                  sx={{
                    fontFamily: SANS,
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  Outstanding Balance
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    fontFamily: MONO,
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  {data?.outstandingLeads ?? 0}
                </Typography>
              </Stack>

              {/* Indented Breakdown Children */}
              <Box sx={{ pl: 2 }}>
                <Stack
                  direction='row'
                  justifyContent='space-between'
                  alignItems='center'
                  py={0.75}
                  sx={{ borderBottom: '1px solid #F5F5F4' }}
                >
                  <Typography
                    variant='caption'
                    sx={{ fontFamily: SANS, color: 'text.secondary' }}
                  >
                    ↳ Verified
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 600,
                      color: 'text.secondary',
                    }}
                  >
                    {data?.verified ?? 0}
                  </Typography>
                </Stack>
                <Stack
                  direction='row'
                  justifyContent='space-between'
                  alignItems='center'
                  py={0.75}
                  sx={{ borderBottom: '1px solid #F5F5F4' }}
                >
                  <Typography
                    variant='caption'
                    sx={{ fontFamily: SANS, color: 'text.secondary' }}
                  >
                    ↳ Unverified
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{
                      fontFamily: MONO,
                      fontWeight: 600,
                      color: 'text.secondary',
                    }}
                  >
                    {data?.unverified ?? 0}
                  </Typography>
                </Stack>
              </Box>
            </Box>

            {/* 2. INSTANT FORM LEADS */}
            <Box>
              <Typography
                variant='caption'
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: 'text.disabled',
                  fontSize: '0.675rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                Instant Forms
              </Typography>

              {/* Automation Status Panel */}
              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                sx={{
                  p: 2,
                  mb: 1.5,
                  borderRadius: 2,
                  bgcolor: '#FBFBFA',
                  border: `1px solid ${BORDER}`,
                }}
              >
                <Box sx={{ pr: 2 }}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600, color: 'text.primary' }}
                    >
                      Delivery Status
                    </Typography>
                    <Chip
                      label={isInstantActive ? 'Active' : 'Pending Setup'}
                      size='small'
                      sx={{
                        ...STATUS_PILL_BASE,
                        bgcolor: isInstantActive
                          ? 'success.light'
                          : 'warning.light',
                        color: isInstantActive
                          ? 'success.main'
                          : 'warning.main',
                        border: `1px solid ${
                          isInstantActive
                            ? 'rgba(63, 111, 91, 0.2)'
                            : 'rgba(183, 129, 3, 0.25)'
                        }`,
                      }}
                    />
                  </Stack>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                  >
                    {isInstantActive
                      ? `Active: routing to ${states.length} state${states.length === 1 ? '' : 's'} via ${connectedCrmLabels.join(', ')}.`
                      : 'Activates automatically once states are set and at least one CRM is connected.'}
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{
                      color: 'text.disabled',
                      display: 'block',
                      mt: 0.5,
                      fontFamily: SANS,
                    }}
                  >
                    Last issued:{' '}
                    <Box
                      component='span'
                      sx={{ fontFamily: MONO, color: 'text.secondary' }}
                    >
                      {formatLocalTimestamp(
                        data?.instantFormsLastIssuedDate?._seconds,
                      )}
                    </Box>
                  </Typography>
                </Box>
              </Stack>

              <MetricRow
                label='Outstanding Instant Form Leads'
                value={data?.instantForms ?? 0}
              />
            </Box>

            {/* 3. LIVE TRANSFERS */}
            <Box>
              <Typography
                variant='caption'
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: 'text.disabled',
                  fontSize: '0.675rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                Live Transfers
              </Typography>

              {/* Balance leads — it's the only thing agents actually check
                  this section for. No flow switch or CRM dependency to
                  explain here, unlike the other two sections. */}
              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                py={1.25}
                sx={{ borderBottom: `1px solid ${BORDER}` }}
              >
                <Typography
                  variant='body2'
                  sx={{
                    fontFamily: SANS,
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  Outstanding Balance
                </Typography>
                <Typography
                  variant='body2'
                  sx={{
                    fontFamily: MONO,
                    fontWeight: 700,
                    color: 'text.primary',
                  }}
                >
                  {data?.liveTransfers ?? 0}
                </Typography>
              </Stack>

              <Typography
                variant='caption'
                sx={{ color: 'text.secondary', display: 'block', mt: 1 }}
              >
                Inbound calls transfer live to your primary line whenever your
                balance is above zero.
              </Typography>

              {/* Diagnostics only — kept small and below the fold on
                  purpose. Useful for "is my line actually working" support
                  questions, not something agents need to check routinely. */}
              <Stack direction='row' spacing={2} sx={{ mt: 0.75 }}>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.disabled', fontFamily: SANS }}
                >
                  Last dialed:{' '}
                  <Box
                    component='span'
                    sx={{ fontFamily: MONO, color: 'text.secondary' }}
                  >
                    {formatLocalTimestamp(data?.lastDialedDate?._seconds)}
                  </Box>
                </Typography>
                <Typography
                  variant='caption'
                  sx={{ color: 'text.disabled', fontFamily: SANS }}
                >
                  Last bridged:{' '}
                  <Box
                    component='span'
                    sx={{ fontFamily: MONO, color: 'text.secondary' }}
                  >
                    {formatLocalTimestamp(data?.lastBridgedDate?._seconds)}
                  </Box>
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      )}

      {/* TAB 1: CRMS (Integration Cards Grid) */}
      {activeTab === 1 && (
        <Box sx={{ maxWidth: 860 }}>
          <Stack spacing={2}>
            {CRM_INTEGRATIONS.map(
              ({ key, label, field, description, informational, setupUrl }) => {
                const connected = (crmOverrides[key] ?? data?.[field]) === true;
                const updatePending = isCrmPending;

                return (
                  <Card
                    key={key}
                    variant='outlined'
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      bgcolor: '#FFFFFF',
                      borderColor: BORDER,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          bgcolor: '#F8F9FA',
                          border: `1px solid ${BORDER}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: connected ? 'success.main' : 'text.secondary',
                        }}
                      >
                        <HubOutlinedIcon sx={{ fontSize: '1.35rem' }} />
                      </Box>
                      <Box>
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <Typography
                            variant='subtitle1'
                            sx={{ fontWeight: 600, color: 'text.primary' }}
                          >
                            {label}
                          </Typography>
                          <Chip
                            label={connected ? 'Connected' : 'Not Connected'}
                            size='small'
                            sx={{
                              ...STATUS_PILL_BASE,
                              bgcolor: connected ? 'success.light' : '#F3F4F6',
                              color: connected
                                ? 'success.main'
                                : 'text.secondary',
                              border: `1px solid ${connected ? 'rgba(63, 111, 91, 0.2)' : BORDER}`,
                            }}
                          />
                        </Stack>
                        <Typography
                          variant='caption'
                          sx={{
                            color: 'text.secondary',
                            display: 'block',
                            mt: 0.25,
                          }}
                        >
                          {description}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction='row' spacing={1.5} alignItems='center'>
                      {key === 'insurDial' && (
                        <Button
                          size='small'
                          variant='outlined'
                          startIcon={
                            <KeyOutlinedIcon
                              sx={{ fontSize: '0.9rem !important' }}
                            />
                          }
                          onClick={() => setOpenApiKeyDialog(true)}
                          sx={{
                            py: 0.4,
                            px: 1.25,
                            fontSize: '0.75rem',
                            borderRadius: 1.5,
                            color: 'text.primary',
                            borderColor: BORDER,
                          }}
                        >
                          API Key
                        </Button>
                      )}

                      {setupUrl && !connected && (
                        <Button
                          size='small'
                          variant='text'
                          href={setupUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                        >
                          Docs ↗
                        </Button>
                      )}

                      {informational ? (
                        <Tooltip
                          title='Sendblue lines are attributed natively. Contact support to modify your assigned number.'
                          arrow
                        >
                          <IconButton
                            size='small'
                            sx={{ color: 'text.secondary' }}
                          >
                            <HelpOutlineIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Switch
                          size='small'
                          checked={connected}
                          disabled={updatePending}
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
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: 'success.main',
                              '& + .MuiSwitch-track': {
                                bgcolor: 'success.main',
                              },
                            },
                          }}
                        />
                      )}
                    </Stack>
                  </Card>
                );
              },
            )}
          </Stack>
        </Box>
      )}

      {/* TAB 2: STATES (Licensed States Card) */}
      {activeTab === 2 && (
        <Box sx={{ maxWidth: 720 }}>
          <Card
            variant='outlined'
            sx={{
              p: 3,
              borderRadius: 3,
              bgcolor: '#FFFFFF',
              borderColor: BORDER,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Stack
              direction='row'
              justifyContent='space-between'
              alignItems='center'
              mb={2.5}
            >
              <Stack direction='row' spacing={1.25} alignItems='center'>
                <PublicOutlinedIcon
                  sx={{ color: 'text.secondary', fontSize: '1.25rem' }}
                />
                <Box>
                  <Typography
                    variant='subtitle1'
                    sx={{ fontWeight: 700, fontFamily: SERIF }}
                  >
                    Licensed States
                  </Typography>
                  <Typography
                    variant='caption'
                    sx={{ color: 'text.secondary', display: 'block' }}
                  >
                    Leads will only be routed to your CRM from these specified
                    states.
                  </Typography>
                </Box>
              </Stack>
              <Chip
                label={`${states.length} Active`}
                size='small'
                sx={{
                  ...STATUS_PILL_BASE,
                  bgcolor: 'success.light',
                  color: 'success.main',
                  border: '1px solid rgba(63, 111, 91, 0.2)',
                }}
              />
            </Stack>

            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#FBFBFA',
                border: `1px solid ${BORDER}`,
                minHeight: 80,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
              }}
            >
              {states.length > 0 ? (
                states.map((state) => (
                  <Chip
                    key={state}
                    label={state}
                    size='small'
                    sx={{
                      height: 24,
                      borderRadius: 1,
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      bgcolor: '#FFFFFF',
                      color: 'text.primary',
                      border: `1px solid ${BORDER}`,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  />
                ))
              ) : (
                <Typography
                  variant='body2'
                  sx={{ color: 'text.disabled', fontStyle: 'italic' }}
                >
                  No licensed states selected. Add states to enable routing.
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 2.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant='outlined'
                size='small'
                startIcon={<EditIcon sx={{ fontSize: '0.85rem !important' }} />}
                onClick={() => setOpenStatesDlg(true)}
                sx={{
                  borderRadius: 1.5,
                  py: 0.5,
                  px: 1.75,
                  color: 'text.primary',
                  borderColor: BORDER,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  '&:hover': { borderColor: '#051118', bgcolor: '#F9FAFB' },
                }}
              >
                Edit States
              </Button>
            </Box>
          </Card>
        </Box>
      )}

      {/* TAB 3: PRODUCER PAGE */}
      {activeTab === 3 && (
        <AgentCardSettings accountData={data} agentData={agent} />
      )}
    </>
  );
};

export default AccountDetails;
