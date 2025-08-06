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

const maritalOptions = ['Single', 'Married', 'Divorced', 'Widowed'];

const UpdateClientDialog = ({ open, setOpen, onClose, client }) => {
  const [form, setForm] = useState({ ...client });
  const [phoneError, setPhoneError] = useState(false);
  const [zipCodeError, setZipCodeError] = useState(false);
  const [incomeError, setIncomeError] = useState(false);
  const [emailError, setEmailError] = useState(false);

  const { mutate: updateClientMutate } = useMutation({
    mutationFn: patchClient,
    onSuccess: () => onClose(),
    onError: (error) => console.error(error),
  });

  useEffect(() => {
    if (client) setForm({ ...client });
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      setPhoneError(!/^[0-9]{10}$/.test(value));
    } else if (name === 'zip') {
      setZipCodeError(!/^[0-9]{5}$/.test(value));
    } else if (name === 'income') {
      setIncomeError(!/^\d+$/.test(value));
    } else if (name === 'email') {
      setEmailError(!/^\S+@\S+\.\S+$/.test(value));
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    updateClientMutate({ clientId: client.id, client: form });
  };

  const handleCancel = () => {
    setOpen(false);
  };

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
            <TextField
              name='income'
              label='Annual Income'
              InputProps={{
                startAdornment: (
                  <InputAdornment position='start'>$</InputAdornment>
                ),
              }}
              value={form.income}
              onChange={handleChange}
              error={incomeError}
              helperText={incomeError ? 'Invalid income amount' : ''}
              fullWidth
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
          disabled={Object.keys(form).some((key) => !form[key])}
        >
          Update Client
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateClientDialog;
