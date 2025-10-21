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
  CircularProgress,
} from '@mui/material';

const maritalOptions = ['Single', 'Married', 'Divorced', 'Widowed'];

import { enqueueSnackbar } from 'notistack';

import { useEffect, useState, useRef } from 'react';

import { STATES } from '../utils/constants';

import { NumericFormat } from 'react-number-format';

import { useMutation } from '@tanstack/react-query';
import { postClient } from '../utils/query';
import useAuth from '../hooks/useAuth';

import { toTitleCase } from '../utils/helpers';

const initialForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dob: '',
  maritalStatus: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  occupation: '',
  income: '',
  notes: '',
};

const CreateClientDialog = ({ open, setOpen, lead, refetchClients }) => {
  const [form, setForm] = useState(initialForm);
  const [phoneError, setPhoneError] = useState(false);
  const [zipCodeError, setZipCodeError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [disabled, setDisabled] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    if (lead) {
      setForm({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: lead.email || '',
        phone: lead.phone || '',
        dob: lead.dob || '',
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

  const { mutate: createClient, isPending } = useMutation({
    mutationFn: postClient,
    onSuccess: () => {
      if (typeof refetchClients === 'function') {
        refetchClients();
      }
      setOpen(false);
      enqueueSnackbar('Client created successfully!', {
        variant: 'success',
        style: {
          fontWeight: 'bold',
          fontFamily: `"Libre Baskerville", serif`,
          fontSize: '1rem',
        },
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
      });
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

    const titleCaseFields = ['firstName', 'lastName', 'city', 'occupation'];

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
    createClient({
      token: userToken,
      data: { ...form, agentIds: [user.uid] },
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
          <Grid item size={6}>
            <TextField
              name='firstName'
              label='First Name'
              value={form.firstName}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              name='lastName'
              label='Last Name'
              value={form.lastName}
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
              name='dob'
              label='Date of Birth'
              type='date'
              value={form.dob}
              onChange={handleChange}
              fullWidth
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              select
              name='maritalStatus'
              label='Marital Status'
              value={form.maritalStatus}
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
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        {isPending ? (
          <CircularProgress
            variant='indeterminate'
            sx={{
              ml: 1,
              color: 'action.main',
              width: '100%',
              height: '100%',
              borderRadius: 'inherit',
            }}
          />
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={disabled || isPending}
            sx={{ ml: 1 }}
            variant='contained'
            color='action'
          >
            Save Client
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateClientDialog;
