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
  Stack,
  Alert,
  FormControl,
  FormControlLabel,
  Checkbox,
  Skeleton,
} from '@mui/material';

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

const CreateClientDialog = ({ open, setOpen, lead, refetchClients, onCreated }) => {
  const { pathname } = useLocation();
  const initialForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    marital_status: '',
    lead_vendor_id: '1043bc55-a8cd-485f-bddc-46bcfc06d4ba',
    address: '',
    city: '',
    state: '',
    zip: '',
    occupation: '',
    annual_income: '',
    live_transfer: undefined,
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
        lead_vendor_id:
          lead.lead_vendor_id || '1043bc55-a8cd-485f-bddc-46bcfc06d4ba',
        marital_status: lead.marital_status || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        zip: lead.zip || '',
        occupation: lead.occupation || '',
        annual_income: lead.annual_income || '',
        live_transfer: lead.gsq_live_transfer ?? undefined,
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
      setEmailError(!/^\S+@\S+\.\S+$/.test(value));
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

  useEffect(() => {
    const modifiedForm = { ...form };
    console.log('Modified Form:', modifiedForm);
    OPTIONAL_CLIENT_FIELDS.forEach((field) => delete modifiedForm[field]);

    if (form.lead_vendor_id !== import.meta.env.VITE_GSQ_LEAD_VENDOR_ID) {
      delete modifiedForm.live_transfer;
    }
    const hasEmptyFields = Object.keys(modifiedForm).some(
      (key) => modifiedForm[key] === undefined || modifiedForm[key] === '',
    );
    if (hasEmptyFields) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [form]);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
      <DialogTitle>New Client</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={12}>
            <SectionHeader title='Lead information' />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            {leadVendorsLoading ? (
              <Skeleton variant='rounded' height={56} />
            ) : (
              <TextField
                sx={{ width: '100%' }}
                select
                disabled={!!lead}
                name='lead_vendor_id'
                label='Lead Source'
                value={form.lead_vendor_id}
                onChange={handleChange}
                fullWidth
                required
              >
                {leadVendors.map((vendor) => (
                  <MenuItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Grid>
          {form.lead_vendor_id === '1043bc55-a8cd-485f-bddc-46bcfc06d4ba' && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl error={true} fullWidth>
                <Alert severity='warning'>Is this a live transfer lead?</Alert>

                <Stack direction='row' spacing={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.live_transfer === true}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            live_transfer: true,
                          }))
                        }
                      />
                    }
                    label='Yes'
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.live_transfer === false}
                        onChange={() =>
                          setForm((prev) => ({
                            ...prev,
                            live_transfer: false,
                          }))
                        }
                      />
                    }
                    label='No'
                  />
                </Stack>
              </FormControl>
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
              required
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='last_name'
              label='Last Name'
              value={form.last_name}
              onChange={handleChange}
              fullWidth
              required
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
              required
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
              required
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label='Date of Birth'
              format='MM/DD/YYYY'
              value={form.date_of_birth ? dayjs(form.date_of_birth) : null}
              onChange={(value) => handleDateChange('date_of_birth', value)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                },
                desktopPaper: { sx: { boxShadow: 3 } },
                mobilePaper: { sx: { boxShadow: 3 } },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              name='marital_status'
              label='Marital Status (Optional)'
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

          {/* Section 2: Address */}
          <Grid size={12}>
            <SectionHeader title='Location' />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='address'
              label='Street Address (Optional)'
              value={form.address}
              onChange={handleChange}
              fullWidth
              inputRef={inputRef}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='city'
              label='City (Optional)'
              value={form.city}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='state'
              id='outlined-select-currency'
              select
              label='State'
              sx={{ width: '100%' }}
              value={form.state}
              onChange={handleChange}
              fullWidth
              required
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
              name='zip'
              label='Zip Code (Optional)'
              value={form.zip}
              onChange={handleChange}
              error={zipCodeError}
              helperText={zipCodeError ? 'Invalid zip code' : ''}
              fullWidth
            />
          </Grid>

          <Grid size={12}>
            <SectionHeader title='Employment & Financials (Optional)' />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='occupation'
              label='Occupation (Optional)'
              value={form.occupation}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <NumericFormat
              style={{ width: '100%' }}
              name='annual_income'
              label='Annual Income (Optional)'
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
