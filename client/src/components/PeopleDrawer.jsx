import { useEffect, useMemo, useState } from 'react';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  Grid,
} from '@mui/material';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { enqueueSnackbar } from 'notistack';
import { getPerson, patchClient, patchLead } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const SERIF = '"Libre Baskerville", serif';

const PROFILE_FIELDS = [
  ['first_name', 'First Name'],
  ['last_name', 'Last Name'],
  ['date_of_birth', 'Date of Birth', 'date'],
  ['phone', 'Phone'],
  ['email', 'Email', 'email'],
  ['state', 'State'],
];

const CLIENT_FIELDS = [
  ['address', 'Street Address'],
  ['city', 'City'],
  ['zip', 'ZIP Code'],
  ['occupation', 'Occupation'],
  ['marital_status', 'Marital Status'],
  ['annual_income', 'Annual Income', 'number'],
];

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const premiumLabel = (person) => {
  if (person?.premium !== null && person?.premium !== undefined) {
    return formatCurrency(person.premium);
  }
  if (
    person?.premium_min !== null &&
    person?.premium_max !== null &&
    person?.premium_min !== undefined &&
    person?.premium_max !== undefined
  ) {
    return `${formatCurrency(person.premium_min)} – ${formatCurrency(
      person.premium_max,
    )}`;
  }
  return '—';
};

const POLICY_PREMIUM_LABELS = {
  weekly: 'Weekly Premium',
  monthly: 'Monthly Premium',
  quarterly: 'Quarterly Premium',
  'semi-annually': 'Semi-Annual Premium',
  'semi-annual': 'Semi-Annual Premium',
  annually: 'Annual Premium',
  annual: 'Annual Premium',
};

const policyPremiumLabel = (frequency) =>
  POLICY_PREMIUM_LABELS[frequency] || 'Premium';

const calculateBmi = (person) => {
  const inches =
    Number(person?.height_feet || 0) * 12 + Number(person?.height_inches || 0);
  const pounds = Number(person?.weight_lbs);
  if (!inches || !pounds) return null;
  return ((pounds / (inches * inches)) * 703).toFixed(1);
};

const profileFormFromPerson = (person) => ({
  first_name: person?.first_name || '',
  last_name: person?.last_name || '',
  date_of_birth: person?.date_of_birth || '',
  phone: person?.phone || '',
  email: person?.email || '',
  state: person?.state || '',
  address: person?.address || '',
  city: person?.city || '',
  zip: person?.zip || '',
  occupation: person?.occupation || '',
  marital_status: person?.marital_status || '',
  annual_income: person?.annual_income ?? '',
  availability: person?.availability || '',
});

// ADD Icon Import: import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

const BooleanIndicator = ({ label, value }) => {
  if (value === null || value === undefined) return null;

  return (
    <Chip
      icon={
        value ? (
          <WarningAmberOutlinedIcon fontSize='small' />
        ) : (
          <CheckCircleOutlinedIcon fontSize='small' />
        )
      }
      label={`${label}: ${value ? 'Yes' : 'No'}`}
      size='small'
      sx={{
        bgcolor: value ? 'warning.light' : 'success.light',
        color: value ? 'warning.dark' : 'success.main',
        fontWeight: 600,
        '& .MuiChip-icon': {
          color: value ? 'warning.dark' : 'success.main',
        },
      }}
    />
  );
};

const PeopleDrawer = ({ open, personId, onClose, onUpdated, onMarkSold }) => {
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState(false);

  const {
    data: person,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['person', personId],
    queryFn: () => getPerson(personId),
    enabled: open && Boolean(personId),
  });

  useEffect(() => {
    if (!person) return;
    setForm(profileFormFromPerson(person));
    setEditing(false);
  }, [person]);

  useEffect(() => {
    if (open || !person) return;
    setForm(profileFormFromPerson(person));
    setEditing(false);
  }, [open, person]);

  const { mutate: saveProfile, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const identity = Object.fromEntries(
        PROFILE_FIELDS.map(([field]) => [field, form[field]]),
      );

      if (person.client_id) {
        await patchClient({
          data: {
            clientId: person.client_id,
            client: {
              ...identity,
              ...Object.fromEntries(
                CLIENT_FIELDS.map(([field]) => [field, form[field]]),
              ),
            },
          },
        });
        if (
          person.lead_id &&
          form.availability !== (person.availability || '')
        ) {
          await patchLead({
            leadId: person.lead_id,
            lead: { availability: form.availability },
          });
        }
        return;
      }

      await patchLead({
        leadId: person.lead_id,
        lead: { ...identity, availability: form.availability },
      });
    },
    onSuccess: async () => {
      enqueueSnackbar('Profile updated', SNACKBAR_SUCCESS_OPTIONS);
      setEditing(false);
      await refetch();
      onUpdated?.();
    },
    onError: (mutationError) => {
      enqueueSnackbar(
        mutationError?.response?.data?.error || 'Failed to update profile',
        SNACKBAR_ERROR_OPTIONS,
      );
    },
  });

  const bmi = useMemo(() => calculateBmi(person), [person]);
  const fullName =
    [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
    'Person';

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const renderProfileField = ([field, label, type = 'text']) => (
    <Grid key={field} size={{ xs: 12, sm: 6 }}>
      <TextField
        name={field}
        label={label}
        type={type}
        value={form[field] ?? ''}
        onChange={handleFormChange}
        size='small'
        fullWidth
      />
    </Grid>
  );

  const handleCopy = async (label, value) => {
    await navigator.clipboard.writeText(value);
    enqueueSnackbar(`${label} copied`, SNACKBAR_SUCCESS_OPTIONS);
  };

  const readFieldValue = (field) => {
    if (field === 'date_of_birth') return formatDate(person?.date_of_birth);
    if (field === 'annual_income') {
      return person?.annual_income != null
        ? formatCurrency(person.annual_income)
        : '—';
    }
    return person?.[field] || '—';
  };

  const renderReadField = ([field, label]) => {
    const value = readFieldValue(field);
    const mono = ['phone', 'date_of_birth', 'zip', 'annual_income'].includes(
      field,
    );
    const copyable = ['phone', 'email'].includes(field) && value !== '—';
    return (
      <Grid key={field} size={{ xs: 12, sm: 6 }}>
        <Typography
          variant='caption'
          sx={{ fontFamily: SANS, fontWeight: 700, color: 'text.secondary' }}
        >
          {label}
        </Typography>
        <Stack direction='row' spacing={0.5} alignItems='center'>
          <Typography
            variant='body2'
            sx={{
              fontWeight: 600,
              fontFamily: mono ? MONO : SANS,
              overflowWrap: 'anywhere',
            }}
          >
            {value}
          </Typography>
          {copyable && (
            <IconButton
              size='small'
              aria-label={`Copy ${label.toLowerCase()}`}
              onClick={() => handleCopy(label, value)}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          )}
        </Stack>
      </Grid>
    );
  };

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 620 },
            maxWidth: '100vw',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          p: 2,
        }}
      >
        <Stack
          direction='row'
          alignItems='center'
          justifyContent='space-between'
          spacing={2}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='h6' noWrap>
              {fullName}
            </Typography>
            {person && (
              <Chip
                label={person.lifecycle_status}
                size='small'
                sx={{
                  mt: 0.5,
                  bgcolor:
                    person.lifecycle_status === 'SALE'
                      ? 'success.light'
                      : 'grey.200',
                  color:
                    person.lifecycle_status === 'SALE'
                      ? 'success.main'
                      : 'text.primary',
                }}
              />
            )}
          </Box>
          <Stack direction='row' spacing={1} alignItems='center'>
            {person?.lifecycle_status === 'LEAD' && (
              <Button
                variant='contained'
                color='action'
                onClick={() => onMarkSold?.(person)}
              >
                Mark Sold
              </Button>
            )}
            <IconButton aria-label='Close profile' onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ p: 2 }}>
        {isLoading && (
          <Stack alignItems='center' sx={{ py: 8 }}>
            <CircularProgress />
          </Stack>
        )}
        {error && (
          <Alert severity='error'>
            {error?.response?.data?.error || 'Failed to load person'}
          </Alert>
        )}

        {person && (
          <Stack spacing={1.5}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700}>Profile & Address</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {editing ? (
                  <Grid container spacing={2}>
                    {PROFILE_FIELDS.map(renderProfileField)}
                    {person.client_id && CLIENT_FIELDS.map(renderProfileField)}
                    <Grid size={12}>
                      <TextField
                        name='availability'
                        label='Availability'
                        value={form.availability ?? ''}
                        onChange={handleFormChange}
                        size='small'
                        fullWidth
                      />
                    </Grid>
                    <Grid size={12}>
                      <Stack
                        direction='row'
                        spacing={1}
                        justifyContent='flex-end'
                      >
                        <Button
                          onClick={() => {
                            setForm(profileFormFromPerson(person));
                            setEditing(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant='contained'
                          onClick={() => saveProfile()}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving…' : 'Save'}
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Stack spacing={2}>
                    <Paper
                      variant='outlined'
                      sx={{ bgcolor: '#FAFAFA', p: 2, borderRadius: 2 }}
                    >
                      <Grid container spacing={2}>
                        {PROFILE_FIELDS.map(renderReadField)}
                        {person.client_id && CLIENT_FIELDS.map(renderReadField)}
                        {renderReadField(['availability', 'Availability'])}
                      </Grid>
                    </Paper>
                    <Stack direction='row' justifyContent='flex-end'>
                      <Button
                        variant='outlined'
                        onClick={() => setEditing(true)}
                      >
                        Edit profile
                      </Button>
                    </Stack>
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700}>Underwriting Data</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {/* 1. BUILD & TOBACCO HEADER BANNER */}
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.5,
                      bgcolor: 'info.alertBackground',
                      color: 'info.alertTextColor',
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      '& .MuiAlert-icon': { color: 'info.alertIconColor' },
                    }}
                  >
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <InfoOutlinedIcon
                        sx={{
                          color: 'info.alertIconColor',
                          fontSize: '1.25rem',
                        }}
                      />
                      <Typography
                        variant='body2'
                        sx={{ fontFamily: MONO, fontWeight: 600 }}
                      >
                        {person.height_feet || '—'}&apos;
                        {person.height_inches ?? '—'}&quot; |{' '}
                        {person.weight_lbs || '—'} lbs{' '}
                        {bmi ? `(BMI: ${bmi})` : ''}
                      </Typography>
                    </Stack>

                    <Chip
                      label={person.smoker ? 'Smoker' : 'Non-smoker'}
                      size='small'
                      color={person.smoker ? 'error' : 'success'}
                      sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                    />
                  </Paper>

                  {/* 2. FINANCIAL QUOTE CARD (Replaces standalone Premium/Coverage chips) */}
                  <Paper
                    variant='outlined'
                    sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}
                  >
                    <Grid container spacing={2}>
                      <Grid size={6}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          fontWeight={700}
                          sx={{ display: 'block', letterSpacing: '0.5px' }}
                        >
                          SELECTED PREMIUM
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{ fontFamily: MONO, fontWeight: 700 }}
                        >
                          {premiumLabel(person)}
                        </Typography>
                      </Grid>

                      <Grid size={6}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          fontWeight={700}
                          sx={{ display: 'block', letterSpacing: '0.5px' }}
                        >
                          SELECTED COVERAGE
                        </Typography>
                        <Typography
                          variant='body1'
                          sx={{ fontFamily: MONO, fontWeight: 700 }}
                        >
                          {person.face_amount !== null
                            ? formatCurrency(person.face_amount)
                            : '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* 3. MEDICAL HISTORY FLAGS */}
                  <Box>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      fontWeight={700}
                      sx={{ display: 'block', mb: 1, letterSpacing: '0.5px' }}
                    >
                      MEDICAL HISTORY
                    </Typography>
                    <Stack
                      direction='row'
                      spacing={1}
                      flexWrap='wrap'
                      useFlexGap
                    >
                      <BooleanIndicator
                        label='Cholesterol medication'
                        value={person.cholesterol_medication}
                      />
                      <BooleanIndicator
                        label='Blood pressure medication'
                        value={person.blood_pressure_medication}
                      />
                    </Stack>
                  </Box>

                  <Paper
                    variant='outlined'
                    sx={{ bgcolor: '#FAFAFA', p: 2, borderRadius: 2 }}
                  >
                    <Grid container spacing={2}>
                      {[
                        ['Selected Carrier', person.selected_carrier, 6],
                        ['Selected Plan', person.selected_plan, 6],
                        ['Reason', person.why, 12],
                      ].map(([label, value, size]) => (
                        <Grid key={label} size={{ xs: 12, sm: size }}>
                          <Typography
                            variant='caption'
                            display='block'
                            sx={{
                              fontFamily: SANS,
                              fontWeight: 700,
                              color: 'text.secondary',
                              textTransform: 'uppercase',
                            }}
                          >
                            {label}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{
                              fontWeight: 600,
                              color: value ? 'text.primary' : 'text.disabled',
                            }}
                          >
                            {value || 'None'}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Stack>
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={700}>
                  Policies & Beneficiaries ({person.policies?.length || 0})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {!person.policies?.length ? (
                  <Typography color='text.secondary'>
                    No policies are linked to this person.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {person.policies.map((policy) => (
                      <Card
                        key={policy.id}
                        variant='outlined'
                        sx={{ borderRadius: 2, borderColor: '#E0E0E0' }}
                      >
                        <CardContent>
                          <Stack
                            direction='row'
                            justifyContent='space-between'
                            spacing={2}
                            alignItems='flex-start'
                          >
                            <Box>
                              <Typography fontWeight={700}>
                                {policy.carrier_name || 'Unknown Carrier'}
                              </Typography>
                              <Typography
                                variant='body2'
                                color='text.secondary'
                                sx={{ fontFamily: MONO }}
                              >
                                {policy.policy_number || 'No policy number'}
                              </Typography>
                            </Box>
                            <Chip
                              label={policy.policy_status || 'Unknown'}
                              size='small'
                              color={
                                policy.policy_status === 'active'
                                  ? 'success'
                                  : policy.policy_status === 'lapsed'
                                    ? 'error'
                                    : 'warning'
                              }
                            />
                          </Stack>
                          <Grid container spacing={1.5} sx={{ mt: 1 }}>
                            <Grid size={6}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                Coverage
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ fontFamily: MONO }}
                              >
                                {formatCurrency(policy.coverage_amount)}
                              </Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                {policyPremiumLabel(policy.premium_frequency)}
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ fontFamily: MONO }}
                              >
                                {formatCurrency(policy.premium_amount)}
                              </Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                Effective Date
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ fontFamily: MONO }}
                              >
                                {formatDate(policy.effective_date)}
                              </Typography>
                            </Grid>
                            <Grid size={6}>
                              <Typography
                                variant='caption'
                                color='text.secondary'
                              >
                                Draft Day
                              </Typography>
                              <Typography
                                variant='body2'
                                sx={{ fontFamily: MONO }}
                              >
                                {policy.draft_day || '—'}
                              </Typography>
                            </Grid>
                          </Grid>
                          {!!policy.beneficiaries?.length && (
                            <>
                              <Divider sx={{ my: 1.5 }} />
                              <Typography
                                variant='caption'
                                fontWeight={700}
                                color='text.secondary'
                              >
                                BENEFICIARIES
                              </Typography>
                              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                {policy.beneficiaries.map((beneficiary) => (
                                  <Stack
                                    key={beneficiary.id}
                                    direction='row'
                                    justifyContent='space-between'
                                    spacing={2}
                                  >
                                    <Typography
                                      variant='body2'
                                      sx={{
                                        fontFamily: SERIF,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {beneficiary.first_name}{' '}
                                      {beneficiary.last_name}
                                    </Typography>
                                    <Typography
                                      variant='body2'
                                      color='text.secondary'
                                    >
                                      {beneficiary.relationship || '—'} ·{' '}
                                      <Box
                                        component='span'
                                        sx={{ fontFamily: MONO }}
                                      >
                                        {beneficiary.allocation_percent ?? '—'}%
                                      </Box>
                                    </Typography>
                                  </Stack>
                                ))}
                              </Stack>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
};

export default PeopleDrawer;
