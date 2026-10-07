import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Button,
  MenuItem,
  InputAdornment,
  Alert,
  Skeleton,
  Stack,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { useEffect, useState, useRef } from 'react';
import { enqueueSnackbar } from 'notistack';
import { STATES, SNACKBAR_SUCCESS_OPTIONS } from '../utils/constants';

import { NumericFormat } from 'react-number-format';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { useMutation, useQuery } from '@tanstack/react-query';
import { postClient, getLeadVendors } from '../utils/query';

import { useLocation } from 'react-router-dom';

import { toTitleCase, formatPhone } from '../utils/helpers';
import SectionHeader from './SectionHeader';
import { pillSx } from './Pill';

// Client-only fields a lead won't have yet; not required to convert a lead
// into a client. Sent as null (not '') so numeric columns like
// annual_income don't reject an empty string.
const OPTIONAL_CLIENT_FIELDS = [
  'address',
  'city',
  'zip',
  'occupation',
  'marital_status',
  'annual_income',
];

const GSQ_LEAD_VENDOR_ID = '1043bc55-a8cd-485f-bddc-46bcfc06d4ba';

// The only fields the dialog blocks submit on (matches the NOT NULL client
// columns). A malformed email also blocks. Whether a GSQ lead was a live
// transfer is derived server-side from gsq's call logs, not asked here.
const REQUIRED_CLIENT_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'state',
  'monthly_premium',
];

const MONO = '"JetBrains Mono", monospace';
const REQUIRED_FILL = '#FAFAF7';

const isEmpty = (value) =>
  value === undefined || value === null || value === '';

const formatUSD = (value) =>
  Number(value).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

// The few fields an agent actually has to fill carry an explicit badge
// instead of MUI's asterisk. The badge borrows the app's pill shape but isn't
// a Pill: that's a button, and a button inside a label would add a tab stop
// and hover state.
// Sizes are in em, not rem/px: MUI sizes the outline's notch from an
// unscaled copy of the label at 0.75em, while the floating label itself is
// transform-scaled to 0.75, so only em-based sizing keeps the notch flush.
const {
  '&:hover': _pillHover,
  transition: _pillTransition,
  ...pillShapeSx
} = pillSx;

const RequiredLabel = ({ children }) => (
  <Stack
    component='span'
    direction='row'
    alignItems='center'
    sx={{ gap: '0.375em' }}
  >
    <span>{children}</span>
    <Box
      component='span'
      sx={{
        ...pillShapeSx,
        px: '0.45em',
        py: 0,
        fontSize: '0.65em',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.6,
      }}
    >
      Required
    </Box>
  </Stack>
);

// Warm fill + a firmer resting border on required inputs; focus and error
// keep the theme's own outline.
const REQUIRED_INPUT_SX = {
  '& .MuiOutlinedInput-root': { bgcolor: REQUIRED_FILL },
  '& .MuiOutlinedInput-root:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline':
    { borderColor: 'rgba(5, 17, 24, 0.35)' },
};

const CreateClientDialog = ({
  open,
  setOpen,
  lead,
  refetchClients,
  onCreated,
}) => {
  const { pathname } = useLocation();
  const initialForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    marital_status: '',
    lead_vendor_id: GSQ_LEAD_VENDOR_ID,
    address: '',
    city: '',
    state: '',
    zip: '',
    occupation: '',
    annual_income: '',
    monthly_premium: '',
  };

  const [form, setForm] = useState(initialForm);
  const [phoneError, setPhoneError] = useState(false);
  const [phoneMask, setPhoneMask] = useState('###-###-####');
  const [zipCodeError, setZipCodeError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const inputRef = useRef(null);

  const maritalOptions = ['single', 'married', 'divorced', 'widowed'];

  const { data: leadVendors = [], isLoading: leadVendorsLoading } = useQuery({
    queryKey: ['leadVendors'],
    queryFn: getLeadVendors,
  });

  useEffect(() => {
    if (lead) {
      setForm({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        date_of_birth: lead.date_of_birth || '',
        lead_vendor_id: lead.lead_vendor_id || GSQ_LEAD_VENDOR_ID,
        marital_status: lead.marital_status || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        zip: lead.zip || '',
        occupation: lead.occupation || '',
        annual_income: lead.annual_income || '',
        monthly_premium: '',
      });
    }
  }, [lead]);

  function getAddressComponent(components, type) {
    const comp = components.find((c) => c.types.includes(type));
    return comp ? comp.long_name : '';
  }

  const {
    mutate: createClient,
    isPending,
    error,
  } = useMutation({
    mutationFn: postClient,
    onSuccess: (client) => {
      if (typeof onCreated === 'function') {
        onCreated(client);
      }
      if (typeof refetchClients === 'function') {
        refetchClients();
      }
      setOpen(false);
      setToast({
        open: true,
        message: 'Client created successfully!',
        severity: 'success',
      });
      enqueueSnackbar('Client created successfully!', SNACKBAR_SUCCESS_OPTIONS);
    },
  });

  useEffect(() => {
    if (!window.google) return;

    const timer = setTimeout(() => {
      if (!inputRef.current) return;

      console.log(inputRef.current);

      const autocomplete = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          fields: ['address_components'],
        },
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log(place.address_components);
        if (!place.address_components) return;

        const addressComponents = place.address_components;
        const streetNumber = getAddressComponent(
          addressComponents,
          'street_number',
        );
        const route = getAddressComponent(addressComponents, 'route');
        const city = getAddressComponent(addressComponents, 'locality');
        const zip = getAddressComponent(addressComponents, 'postal_code');
        const state = getAddressComponent(
          addressComponents,
          'administrative_area_level_1',
        );

        console.log({ streetNumber, route, city, zip, state });

        const fullStreet = [streetNumber, route].filter(Boolean).join(' ');
        setForm((prev) => ({ ...prev, address: fullStreet, city, zip, state }));
      });
    }, 500); // wait 500ms

    return () => clearTimeout(timer);
  }, []);

  const standardizeAddress = (address) => {
    return address
      .toLowerCase()
      .split(/\s+/)
      .map((part) => {
        const idx = part.search(/[a-z]/i);
        if (idx === -1) return part;
        return (
          part.slice(0, idx) + part[idx].toUpperCase() + part.slice(idx + 1)
        );
      })
      .join(' ');
  };

  const handleChange = (e) => {
    const name = e.target.name;
    let value = e.target.value;

    const titleCaseFields = ['first_name', 'last_name', 'city', 'occupation'];

    if (titleCaseFields.includes(name)) {
      value = toTitleCase(value);
    }

    if (name === 'email') {
      value = value.toLowerCase();
    }

    if (name === 'address') {
      value = standardizeAddress(value);
    }

    if (name === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
      setPhoneError(value.length > 0 && value.length < 10);
    } else if (name === 'zip') {
      setZipCodeError(!/^[0-9]{5}$/.test(value));
    } else if (name === 'email') {
      // emptiness is handled by the required check; only flag a malformed
      // value here so the field doesn't error while the user is typing
      setEmailError(value !== '' && !/^\S+@\S+\.\S+$/.test(value));
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const data = { ...form };
    OPTIONAL_CLIENT_FIELDS.forEach((field) => {
      if (data[field] === '') data[field] = null;
    });
    console.log('Submitting form:', data);
    createClient({ data });
  };

  const handleDateChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value?.isValid?.() ? value.format('YYYY-MM-DD') : '',
    }));
  };

  const handleCancel = () => {
    setForm(initialForm);
  };

  const missingRequired = REQUIRED_CLIENT_FIELDS.filter((key) =>
    isEmpty(form[key]),
  );

  useEffect(() => {
    setDisabled(missingRequired.length > 0 || emailError);
  }, [missingRequired.length, emailError]);

  const monthlyPremium = Number(form.monthly_premium);
  const annualPremium =
    form.monthly_premium !== '' && Number.isFinite(monthlyPremium)
      ? monthlyPremium * 12
      : null;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        New Client
        {/* <Typography
          variant='body2'
          color='text.secondary'
          sx={{ mt: 0.5, fontWeight: 400 }}
        >
          {lead
            ? 'Confirm client details and premium to mark this lead sold. '
            : 'Enter client details and premium to log the sale. '}
          <Box
            component='span'
            sx={{
              fontWeight: 600,
              color: missingRequired.length ? 'text.primary' : 'success.main',
            }}
          >
            {missingRequired.length
              ? `${missingRequired.length} required field${missingRequired.length === 1 ? '' : 's'} left.`
              : 'All required fields complete.'}
          </Box>
        </Typography> */}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {/* Monthly premium is the sale itself (drives the card's Sale amount
              and AP), so it leads the form with the AP it implies. */}
          <Grid size={12}>
            <SectionHeader title='Sale Details' />
          </Grid>
          <Grid size={{ xs: 12, sm: 7 }}>
            <NumericFormat
              name='monthly_premium'
              label={<RequiredLabel>Monthly Premium</RequiredLabel>}
              value={form.monthly_premium}
              thousandSeparator=','
              decimalScale={2}
              customInput={TextField}
              fullWidth
              onValueChange={(values) => {
                const { value } = values;
                setForm((prev) => ({ ...prev, monthly_premium: value }));
              }}
              sx={{
                ...REQUIRED_INPUT_SX,
                '& .MuiInputBase-input': {
                  fontFamily: MONO,
                  fontSize: '1.25rem',
                  fontWeight: 600,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>$</InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 5 }} sx={{ alignSelf: 'center' }}>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Estimated Annual Premium
            </Typography>
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '1.5rem',
                fontWeight: 700,
                color: annualPremium ? 'success.main' : 'text.disabled',
              }}
            >
              {annualPremium !== null
                ? `${formatUSD(annualPremium)}`
                : '—'}
            </Typography>
          </Grid>
          {/* Lead Source only matters when a client is keyed in by hand;
              a converted lead already carries its vendor. */}
          {!lead && (
            <Grid size={{ xs: 12, sm: 7 }}>
              {leadVendorsLoading ? (
                <Skeleton variant='rounded' height={56} />
              ) : (
                <TextField
                  select
                  name='lead_vendor_id'
                  label='Lead Source'
                  value={form.lead_vendor_id}
                  onChange={handleChange}
                  fullWidth
                  sx={REQUIRED_INPUT_SX}
                >
                  {leadVendors.map((vendor) => (
                    <MenuItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            </Grid>
          )}

          <Grid size={12}>
            <SectionHeader title='Personal Information' />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='first_name'
              label='First Name'
              value={form.first_name}
              onChange={handleChange}
              fullWidth
              sx={REQUIRED_INPUT_SX}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='last_name'
              label='Last Name'
              value={form.last_name}
              onChange={handleChange}
              fullWidth
              sx={REQUIRED_INPUT_SX}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='email'
              label='Email'
              value={form.email}
              onChange={handleChange}
              error={emailError}
              helperText={emailError ? 'Invalid email address' : ''}
              type='email'
              fullWidth
              sx={REQUIRED_INPUT_SX}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='phone'
              label='Phone'
              value={formatPhone(form.phone)}
              onChange={handleChange}
              error={phoneError}
              helperText={phoneError ? 'Invalid phone number' : ''}
              fullWidth
              sx={REQUIRED_INPUT_SX}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label={
                lead?.date_of_birth ? (
                  'Date of Birth'
                ) : (
                  <RequiredLabel>Date of Birth</RequiredLabel>
                )
              }
              format='MM/DD/YYYY'
              value={form.date_of_birth ? dayjs(form.date_of_birth) : null}
              onChange={(value) => handleDateChange('date_of_birth', value)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  sx: REQUIRED_INPUT_SX,
                },
                desktopPaper: { sx: { boxShadow: 3 } },
                mobilePaper: { sx: { boxShadow: 3 } },
              }}
            />
          </Grid>
          {/* State is required, so it lives here rather than in the
              collapsed location fields below. */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='state'
              select
              label='State'
              value={form.state}
              onChange={handleChange}
              fullWidth
              sx={REQUIRED_INPUT_SX}
            >
              {STATES.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              name='marital_status'
              label='Marital Status'
              value={form.marital_status}
              onChange={handleChange}
              fullWidth
            >
              {maritalOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Address and financials are rarely needed to log a sale. The
              accordion keeps its fields mounted, so the address autocomplete
              still binds while collapsed. */}
          <Grid size={12}>
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                mt: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                '&::before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant='body2' sx={{ fontWeight: 600 }}>
                  Add Address & Financial Details
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ ml: 1 }}
                >
                  (Optional)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={12}>
                    <SectionHeader title='Location' />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      name='address'
                      label='Street Address'
                      value={form.address}
                      onChange={handleChange}
                      fullWidth
                      inputRef={inputRef}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      name='city'
                      label='City'
                      value={form.city}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      name='zip'
                      label='Zip Code'
                      value={form.zip}
                      onChange={handleChange}
                      error={zipCodeError}
                      helperText={zipCodeError ? 'Invalid zip code' : ''}
                      fullWidth
                    />
                  </Grid>

                  <Grid size={12}>
                    <SectionHeader title='Employment & Financials' />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      name='occupation'
                      label='Occupation'
                      value={form.occupation}
                      onChange={handleChange}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumericFormat
                      style={{ width: '100%' }}
                      name='annual_income'
                      label='Annual Income'
                      value={form.annual_income}
                      thousandSeparator=','
                      customInput={TextField}
                      onValueChange={(values) => {
                        const { value } = values; // raw value without formatting
                        setForm((prev) => ({ ...prev, annual_income: value }));
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position='start'>$</InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {error && (
            <Alert severity='error' sx={{ mb: 2, width: '100%', p: 2 }}>
              {error.message}
            </Alert>
          )}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          color='action'
          disabled={disabled || isPending}
        >
          {isPending ? 'Saving...' : 'Save Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateClientDialog;
