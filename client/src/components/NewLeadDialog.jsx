import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { enqueueSnackbar } from 'notistack';
import { getLeadVendors, postLead } from '../utils/query';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  STATES,
} from '../utils/constants';

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  state: '',
  lead_vendor_id: '',
  premium: '',
  availability: '',
};

const NewLeadDialog = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: leadVendorsData } = useQuery({
    queryKey: ['leadVendors'],
    queryFn: getLeadVendors,
    enabled: open,
  });
  const leadVendors = leadVendorsData || [];
  const defaultLeadVendorId = leadVendors[0]?.id || '';

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
  }, [open]);

  useEffect(() => {
    if (!open || !defaultLeadVendorId) return;
    setForm((current) =>
      current.lead_vendor_id
        ? current
        : { ...current, lead_vendor_id: defaultLeadVendorId },
    );
  }, [open, defaultLeadVendorId]);

  const requiredComplete = useMemo(
    () =>
      [
        'first_name',
        'last_name',
        'email',
        'phone',
        'date_of_birth',
        'state',
        'lead_vendor_id',
      ].every((field) => String(form[field] || '').trim()),
    [form],
  );

  const { mutate, isPending, error } = useMutation({
    mutationFn: postLead,
    onSuccess: (lead) => {
      enqueueSnackbar('Lead created successfully', SNACKBAR_SUCCESS_OPTIONS);
      onCreated?.(lead);
      onClose();
    },
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === 'phone'
        ? value.replace(/\D/g, '').slice(0, 10)
        : name === 'email'
          ? value.toLowerCase()
          : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
  };

  const handleSubmit = () => {
    const payload = { ...form };
    if (!payload.premium) delete payload.premium;
    if (!payload.availability) delete payload.availability;
    mutate(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>New Lead</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='first_name'
              label='First Name'
              value={form.first_name}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='last_name'
              label='Last Name'
              value={form.last_name}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='email'
              label='Email'
              type='email'
              value={form.email}
              onChange={handleChange}
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='phone'
              label='Phone'
              value={form.phone}
              onChange={handleChange}
              helperText='10 digits'
              required
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <DatePicker
              label='Date of Birth'
              value={form.date_of_birth ? dayjs(form.date_of_birth) : null}
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  date_of_birth: value?.isValid?.()
                    ? value.format('YYYY-MM-DD')
                    : '',
                }))
              }
              slotProps={{
                textField: { required: true, fullWidth: true },
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='state'
              label='State'
              value={form.state}
              onChange={handleChange}
              select
              required
              fullWidth
            >
              {STATES.map((state) => (
                <MenuItem key={state} value={state}>
                  {state}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField
              name='lead_vendor_id'
              label='Lead Source'
              value={form.lead_vendor_id}
              onChange={handleChange}
              select
              required
              fullWidth
            >
              {leadVendors.map((vendor) => (
                <MenuItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='premium'
              label='Premium'
              value={form.premium}
              onChange={handleChange}
              placeholder='67.35 or 50 - 75'
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name='availability'
              label='Availability'
              value={form.availability}
              onChange={handleChange}
              placeholder='Weekdays after 3 PM'
              fullWidth
            />
          </Grid>
          {error && (
            <Grid size={12}>
              <Alert severity='error'>
                {error?.response?.data?.error ||
                  error.message ||
                  'Failed to create lead'}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant='contained'
          color='action'
          disabled={!requiredComplete || isPending}
          onClick={handleSubmit}
        >
          {isPending ? 'Creating…' : 'Create Lead'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewLeadDialog;
