import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Button,
  MenuItem,
  Divider,
  InputAdornment,
  LinearProgress,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';

import { enqueueSnackbar } from 'notistack';

import { useEffect, useState, useRef } from 'react';

import { SNACKBAR_SUCCESS_OPTIONS, STATES } from '../utils/constants';

import { NumericFormat } from 'react-number-format';

import { useMutation } from '@tanstack/react-query';
import { postClient } from '../utils/query';
import useAuth from '../hooks/useAuth';

import { toTitleCase } from '../utils/helpers';

const CreateClientDialog = ({ open, setOpen, lead, refetchClients }) => {
  const initialForm = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    marital_status: '',
    leadSource: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    occupation: '',
    income: '',
    notes: '',
  };

  const [form, setForm] = useState(initialForm);
  const [phoneError, setPhoneError] = useState(false);
  const [zipCodeError, setZipCodeError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const inputRef = useRef(null);

  const maritalOptions = ['single', 'married', 'divorced', 'widowed'];
  const leadSourceOptions = [
    'GetSeniorQuotes.com',
    'Ethos',
    'Life Jacket',
    'Legacy Term',
    'Freedom Life',
    'Veteran Exclusive',
    'LeadConex',
    'Arise',
    'CRM Center',
    'ILC',
    'Closer Tech',
    'StrongPoint',
    'NeverBroke',
    'Referral',
    'Self Generated',
  ];

  useEffect(() => {
    if (lead) {
      setForm({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        date_of_birth: lead.dob || '',
        leadSource: 'GetSeniorQuotes.com',
        maritalStatus: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        occupation: '',
        income: '',
        notes: '',
      });
    }
  }, [lead]);

  function getAddressComponent(components, type) {
    const comp = components.find((c) => c.types.includes(type));
    return comp ? comp.long_name : '';
  }
  const { user, userToken } = useAuth();

  const {
    mutate: createClient,
    isPending,
    error,
  } = useMutation({
    mutationFn: postClient,
    onSuccess: () => {
      if (typeof refetchClients === 'function') {
        refetchClients();
      }
      setOpen(false);
      enqueueSnackbar('Client created successfully!', SNACKBAR_SUCCESS_OPTIONS);
    },
  });

  useEffect(() => {
    if (!window.google) return;

    const timer = setTimeout(() => {
      if (!inputRef.current) return;

      console.log(inputRef.current);

      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ['address_components'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        console.log(place.address_components);
        if (!place.address_components) return;

        const addressComponents = place.address_components;
        const streetNumber = getAddressComponent(addressComponents, 'street_number');
        const route = getAddressComponent(addressComponents, 'route');
        const city = getAddressComponent(addressComponents, 'locality');
        const zip = getAddressComponent(addressComponents, 'postal_code');
        const state = getAddressComponent(addressComponents, 'administrative_area_level_1');

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
        return part.slice(0, idx) + part[idx].toUpperCase() + part.slice(idx + 1);
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
      setPhoneError(!/^\d{3}-?\d{3}-?\d{4}$/.test(value));
      value = value.replace(/-/g, '');
    } else if (name === 'zip') {
      setZipCodeError(!/^[0-9]{5}$/.test(value));
    } else if (name === 'email') {
      setEmailError(!/^\S+@\S+\.\S+$/.test(value));
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    console.log('Submitting form:', form);
    createClient({
      data: { ...form },
    });
  };

  const handleCancel = () => {
    setForm(initialForm);
  };

  useEffect(() => {
    const modifiedForm = { ...form };
    delete modifiedForm.notes;
    const hasEmptyFields = Object.keys(modifiedForm).some((key) => !form[key]);
    if (hasEmptyFields) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [form]);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>New Client</DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        <Grid container spacing={2} p={2}>
          <Grid item size={12}>
            <TextField
              sx={{ width: '100%' }}
              select
              disabled={!!lead}
              name='leadSource'
              label='Lead Source'
              value={form.leadSource}
              onChange={handleChange}
              fullWidth
              required
            >
              {leadSourceOptions.map((source) => (
                <MenuItem key={source} value={source}>
                  {source}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item size={6}>
            <TextField
              name='first_name'
              label='First Name'
              value={form.first_name}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              name='last_name'
              label='Last Name'
              value={form.last_name}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>

          <Grid item size={6}>
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
          <Grid item size={6}>
            <TextField
              name='phone'
              label='Phone'
              value={form.phone}
              onChange={handleChange}
              error={phoneError}
              helperText={phoneError ? 'Invalid phone number' : ''}
              fullWidth
              required
            />
          </Grid>

          <Grid item size={6}>
            <TextField
              name='date_of_birth'
              label='Date of Birth'
              type='date'
              value={form.date_of_birth}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              select
              name='marital_status'
              label='Marital Status'
              value={form.marital_status}
              onChange={handleChange}
              fullWidth
              required
            >
              {maritalOptions.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item size={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>
          <Grid size={6}>
            <TextField
              name='address'
              label='Street Address'
              value={form.address}
              onChange={handleChange}
              fullWidth
              required
              inputRef={inputRef}
            />
          </Grid>

          <Grid item size={6}>
            <TextField
              name='city'
              label='City'
              value={form.city}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item size={6}>
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
          <Grid item size={6}>
            <TextField
              name='zip'
              label='Zip Code'
              value={form.zip}
              onChange={handleChange}
              error={zipCodeError}
              helperText={zipCodeError ? 'Invalid zip code' : ''}
              fullWidth
              required
            />
          </Grid>

          <Grid item size={6}>
            <TextField
              name='occupation'
              label='Occupation'
              value={form.occupation}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item size={6}>
            <NumericFormat
              style={{ width: '100%' }}
              name='income'
              label='Annual Income'
              value={form.income}
              thousandSeparator=','
              customInput={TextField}
              required
              onValueChange={(values) => {
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, income: value }));
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                },
              }}
            />
          </Grid>

          <Grid item size={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item size={12}>
            <TextField
              name='notes'
              label='Notes'
              value={form.notes}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
          {error && (
            <Alert severity='error' sx={{ mb: 2, width: '100%', p: 2 }}>
              {error.message}
            </Alert>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
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
