// updateClientDialog.jsx
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
} from '@mui/material';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { patchClient } from '../utils/query';
import { SNACKBAR_SUCCESS_OPTIONS, STATES } from '../utils/constants';
import { NumericFormat } from 'react-number-format';

import { toTitleCase } from '../utils/helpers';

import { enqueueSnackbar } from 'notistack';

const maritalOptions = ['single', 'married', 'divorced', 'widowed'];

// Mirrors CreateClientDialog: the NOT NULL client columns plus the premium
// the sale is recorded against. Everything else may be cleared.
const REQUIRED_CLIENT_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'phone',
  'date_of_birth',
  'state',
  'monthly_premium',
];
const OPTIONAL_CLIENT_FIELDS = [
  'address',
  'city',
  'zip',
  'occupation',
  'marital_status',
  'annual_income',
];
const EDITABLE_CLIENT_FIELDS = [
  ...REQUIRED_CLIENT_FIELDS,
  ...OPTIONAL_CLIENT_FIELDS,
];

// Rows arrive with nulls for anything unset (and business-view rows carry
// lead/policy columns too); controlled inputs want '' and only the editable
// columns need to round-trip.
const toForm = (client) =>
  Object.fromEntries(
    EDITABLE_CLIENT_FIELDS.map((key) => [key, client?.[key] ?? '']),
  );

const UpdateClientDialog = ({ open, setOpen, client, refetchClients }) => {
  const [form, setForm] = useState(() => toForm(client));
  const [phoneError, setPhoneError] = useState(false);
  const [zipCodeError, setZipCodeError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [updatesMade, setUpdatesMade] = useState(false);
  const [disabled, setDisabled] = useState(true);

  const { mutate: updateClient, isPending } = useMutation({
    mutationFn: patchClient,
    onSuccess: () => {
      refetchClients();
      setForm(null);
      setOpen(false);
      enqueueSnackbar('Client updated successfully!', SNACKBAR_SUCCESS_OPTIONS);
    },
    onError: (error) => console.error(error),
  });

  useEffect(() => {
    if (client) {
      setForm(toForm(client));
      setUpdatesMade(false);
    }
  }, [client]);

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
    setUpdatesMade(true);

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
      setZipCodeError(value !== '' && !/^[0-9]{5}$/.test(value));
    } else if (name === 'email') {
      setEmailError(!/^\S+@\S+\.\S+$/.test(value));
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Numeric inputs bypass handleChange, so they flag the edit themselves.
  const handleNumberChange = (name, value) => {
    setUpdatesMade(true);
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const data = { ...form };
    OPTIONAL_CLIENT_FIELDS.forEach((field) => {
      if (data[field] === '') data[field] = null;
    });
    updateClient({
      data: { clientId: client.id, client: data },
    });
  };

  const handleCancel = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!form) return;
    const hasEmpty = REQUIRED_CLIENT_FIELDS.some(
      (k) => form[k] === '' || form[k] === null || form[k] === undefined,
    );
    setDisabled(!updatesMade || hasEmpty || emailError || phoneError);
  }, [form, updatesMade, emailError, phoneError]);

  if (!form) return null;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Update Client</DialogTitle>
      <DialogContent sx={{ mt: 1 }}>
        <Grid container spacing={2} p={2}>
          {/* Leads the form for the same reason it does in CreateClientDialog:
              it's the sale amount on the card and the one number most often
              corrected after close. */}
          <Grid item size={6}>
            <NumericFormat
              style={{ width: '100%' }}
              name='monthly_premium'
              label='Monthly Premium'
              value={form.monthly_premium}
              thousandSeparator=','
              decimalScale={2}
              customInput={TextField}
              required
              onValueChange={({ value }) =>
                handleNumberChange('monthly_premium', value)
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>$</InputAdornment>
                  ),
                },
              }}
            />
          </Grid>
          <Grid item size={6} />
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

          <Grid item size={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item size={6}>
            <TextField
              name='address'
              label='Street Address (Optional)'
              value={form.address}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              name='city'
              label='City (Optional)'
              value={form.city}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              name='state'
              select
              label='State'
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
              label='Zip Code (Optional)'
              value={form.zip}
              onChange={handleChange}
              error={zipCodeError}
              helperText={zipCodeError ? 'Invalid zip code' : ''}
              fullWidth
            />
          </Grid>

          <Grid item size={6}>
            <TextField
              name='occupation'
              label='Occupation (Optional)'
              value={form.occupation}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item size={6}>
            <NumericFormat
              style={{ width: '100%' }}
              name='annual_income'
              label='Annual Income (Optional)'
              value={form.annual_income}
              thousandSeparator=','
              customInput={TextField}
              onValueChange={({ value }) =>
                handleNumberChange('annual_income', value)
              }
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
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          color='action'
          disabled={disabled || isPending}
        >
          {isPending ? 'Updating...' : 'Update Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateClientDialog;
