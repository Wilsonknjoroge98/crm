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

const maritalOptions = ['Single', 'Married', 'Divorced', 'Widowed'];

import { enqueueSnackbar } from 'notistack';

import { useEffect, useState } from 'react';

import { STATES } from '../utils/constants';

import { NumericFormat } from 'react-number-format';

import { useMutation } from '@tanstack/react-query';
import { postClient } from '../utils/query';
import useAuth from '../hooks/useAuth';

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

const CreateClientDialog = ({ open, setOpen, onClose, refetchClients }) => {
  const [form, setForm] = useState(initialForm);
  const [phoneError, setPhoneError] = useState(false);
  const [zipCodeError, setZipCodeError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [disabled, setDisabled] = useState(true);

  const { user } = useAuth();

  const { mutate: createClient, isPending } = useMutation({
    mutationFn: postClient,
    onSuccess: () => {
      refetchClients();
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

  const handleChange = (e) => {
    const name = e.target.name;
    let value = e.target.value;

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
      client: { ...form, agentIds: [user.uid] },
    });
  };

  const handleCancel = () => {
    setForm(initialForm);
    onClose();
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
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          disabled={disabled || isPending}
          sx={{ ml: 1 }}
          variant='contained'
          color='action'
        >
          {isPending ? 'Saving...' : 'Save Client'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateClientDialog;
