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
import { STATES } from '../utils/constants';
import { NumericFormat } from 'react-number-format';

import { toTitleCase } from '../utils/helpers';

import { enqueueSnackbar } from 'notistack';

import useAuth from '../hooks/useAuth';

const maritalOptions = ['Single', 'Married', 'Divorced', 'Widowed'];

const UpdateClientDialog = ({ open, setOpen, client, refetchClients }) => {
  const [form, setForm] = useState({ ...client });
  const [phoneError, setPhoneError] = useState(false);
  const [zipCodeError, setZipCodeError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [updatesMade, setUpdatesMade] = useState(false);
  const [disabled, setDisabled] = useState(true);

  const { userToken } = useAuth();

  const { mutate: updateClient, isPending } = useMutation({
    mutationFn: patchClient,
    onSuccess: () => {
      refetchClients();
      setForm(null);
      setOpen(false);
      enqueueSnackbar('Client updated successfully!', {
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
    onError: (error) => console.error(error),
  });

  useEffect(() => {
    if (client) setForm({ ...client });
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

  function standardizeName(name) {
    const lowerCaseName = name.toLowerCase().trim();

    return lowerCaseName.charAt(0).toUpperCase() + lowerCaseName.slice(1);
  }

  const handleChange = (e) => {
    setUpdatesMade(true);

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
    updateClient({
      token: userToken,
      data: { clientId: client.id, client: form },
    });
  };

  const handleCancel = () => {
    setOpen(false);
  };

  useEffect(() => {
    if (!form) return;
    const keys = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'dob',
      'maritalStatus',
      'address',
      'city',
      'state',
      'zip',
      'occupation',
      'income',
    ];

    const hasEmpty = keys.some((k) => form[k] === '');
    if (!updatesMade || hasEmpty) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [form]);

  if (!form) return null;

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth='md' fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Update Client</DialogTitle>
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

          <Grid item size={6}>
            <TextField
              name='address'
              label='Address'
              value={form.address}
              onChange={handleChange}
              fullWidth
              required
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
              select
              label='State'
              value={form.state}
              onChange={handleChange}
              fullWidth
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
              onValueChange={(values) => {
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, income: value }));
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
