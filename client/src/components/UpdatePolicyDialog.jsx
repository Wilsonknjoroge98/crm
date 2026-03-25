// UpdatePolicyDialog.jsx
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
  IconButton,
  Typography,
  InputAdornment,
  FormControl,
  FormControlLabel,
  Alert,
  Stack,
  Checkbox,
  Box,
  Skeleton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useEffect, useState, Fragment } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getCarriers, getProducts, patchPolicy } from '../utils/query';
import {
  RELATIONSHIP_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';
import { enqueueSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import { NumericFormat } from 'react-number-format';
import { useQuery } from '@tanstack/react-query';

const frequencies = ['monthly', 'quarterly', 'semi-annual', 'annual'];
const statuses = [
  'active',
  'pending',
  'lapsed',
  'insufficient funds',
  'cancelled',
];
const draftDays = Array.from({ length: 31 }, (_, i) => `${i + 1}`);

const UpdatePolicyDialog = ({
  open,
  setOpen,
  policy,
  refetchPolicies,
  agents,
}) => {
  const [form, setForm] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const [updatesMade, setUpdatesMade] = useState(false);
  const { user } = useSelector((state) => state.user);

  console.log();

  useEffect(() => {
    if (policy) {
      const primaryBens = (policy.beneficiaries || [])
        .filter((b) => b.beneficiary_type === 'primary')
        .map((b) => ({ ...b, share: b.allocation_percent ?? '' }));

      const contingentBens = (policy.beneficiaries || [])
        .filter((b) => b.beneficiary_type === 'contingent')
        .map((b) => ({ ...b, share: b.allocation_percent ?? '' }));

      setForm({
        ...policy,
        beneficiaries: primaryBens,
        contingent_beneficiaries: contingentBens,
      });
    }
  }, [policy]);

  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: getCarriers,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { mutate: updatePolicy, isPending } = useMutation({
    mutationFn: patchPolicy,
    onSuccess: () => {
      refetchPolicies();
      setForm(null);
      setOpen(false);
      enqueueSnackbar('Policy updated successfully!', SNACKBAR_SUCCESS_OPTIONS);
    },
    onError: (error) => {
      console.error('Error updating policy:', error);
      enqueueSnackbar('Failed to update policy.', SNACKBAR_ERROR_OPTIONS);
    },
  });

  const handleSubmit = () => {
    updatePolicy({ data: { ...form } });
  };

  const handleChange = (e) => {
    setUpdatesMade(true);
    const { name, value } = e.target;
    const transformed = name === 'policy_number' ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: transformed }));
  };

  const handleBeneficiaryChange = (i, field, value) => {
    setUpdatesMade(true);
    const newList = [...form.beneficiaries];
    newList[i][field] = value;
    setForm((prev) => ({ ...prev, beneficiaries: newList }));
  };

  const handleContingentChange = (i, field, value) => {
    setUpdatesMade(true);
    const newList = [...form.contingent_beneficiaries];
    newList[i][field] = value;
    setForm((prev) => ({ ...prev, contingent_beneficiaries: newList }));
  };

  const handleAddBeneficiary = () => {
    setUpdatesMade(true);
    setForm((prev) => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        { first_name: '', last_name: '', relationship: '', share: '' },
      ],
    }));
  };

  const handleAddContingent = () => {
    setUpdatesMade(true);
    setForm((prev) => ({
      ...prev,
      contingent_beneficiaries: [
        ...prev.contingent_beneficiaries,
        { first_name: '', last_name: '', relationship: '', share: '' },
      ],
    }));
  };

  const handleDeleteBeneficiary = (type, index) => {
    setUpdatesMade(true);
    if (type === 'primary') {
      setForm((prev) => ({
        ...prev,
        beneficiaries: prev.beneficiaries.filter((_, i) => i !== index),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        contingent_beneficiaries: prev.contingent_beneficiaries.filter(
          (_, i) => i !== index,
        ),
      }));
    }
  };

  useEffect(() => {
    if (!form) return;
    const modifiedForm = { ...form };
    delete modifiedForm.notes;

    const hasEmptyFields = Object.keys(modifiedForm).some((key) => {
      return (
        key !== 'split_agent_id' &&
        key !== 'split_agent_share' &&
        modifiedForm[key] === ''
      );
    });

    if (hasEmptyFields || !updatesMade) {
      setDisabled(true);
      return;
    }

    if (modifiedForm.split_policy) {
      if (!modifiedForm.split_agent_id || !modifiedForm.split_agent_share) {
        setDisabled(true);
        return;
      }
    }

    if ((modifiedForm.beneficiaries ?? []).length !== 0) {
      const keys = ['first_name', 'last_name', 'relationship', 'share'];
      const hasEmptyBenFields = modifiedForm.beneficiaries.some((b) =>
        keys.some((key) => b[key] === ''),
      );
      const shareValue = modifiedForm.beneficiaries.reduce(
        (acc, b) => acc + parseFloat(b.share || 0),
        0,
      );
      if (hasEmptyBenFields || shareValue !== 100) {
        setDisabled(true);
        return;
      }
    }

    if ((modifiedForm.contingent_beneficiaries ?? []).length !== 0) {
      const keys = ['first_name', 'last_name', 'relationship', 'share'];
      const hasEmptyConFields = modifiedForm.contingent_beneficiaries.some(
        (b) => keys.some((key) => b[key] === ''),
      );
      const shareValue = modifiedForm.contingent_beneficiaries.reduce(
        (acc, b) => acc + parseFloat(b.share || 0),
        0,
      );
      if (hasEmptyConFields || shareValue !== 100) {
        setDisabled(true);
        return;
      }
    }

    setDisabled(false);
  }, [form]);

  if (!form) {
    return null;
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box
          sx={{
            borderLeft: '3px solid',
            borderColor: 'primary.main',
            pl: 1.5,
          }}
        >
          <Typography variant='caption' color='text.secondary'>
            Updating policy for
          </Typography>
          <Typography variant='subtitle1' fontWeight={600}>
            {policy.client_name}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} p={2}>
          <Grid size={12}>
            <FormControl error={true} fullWidth>
              <Alert sx={{ width: 'fit-content' }} severity='warning'>
                Is this a split policy?
              </Alert>
              <Stack direction='row' spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        form.split_policy === true || form.split_agent_id
                      }
                      onChange={() => {
                        setUpdatesMade(true);
                        setForm((prev) => ({ ...prev, split_policy: true }));
                      }}
                    />
                  }
                  label='Yes'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        form.split_policy === false || !form.split_agent_id
                      }
                      onChange={() => {
                        setUpdatesMade(true);
                        setForm((prev) => ({ ...prev, split_policy: false }));
                      }}
                    />
                  }
                  label='No'
                />
              </Stack>
            </FormControl>
            {form.split_policy && (
              <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
                <TextField
                  select
                  name='split_agent_id'
                  label='Other Agent'
                  value={form?.split_agent_id || ''}
                  onChange={handleChange}
                  fullWidth
                  required
                >
                  {Array.isArray(agents) &&
                    agents.map((agent) => {
                      if (user && agent?.id === user?.id) return null;
                      return (
                        <MenuItem key={agent?.id} value={agent?.id}>
                          {[agent?.first_name, agent?.last_name]
                            .filter(Boolean)
                            .join(' ')}
                        </MenuItem>
                      );
                    })}
                </TextField>

                <NumericFormat
                  style={{ width: '100%' }}
                  name='split_agent_share'
                  label="Other Agent's Commission Share"
                  value={form?.split_agent_share || ''}
                  thousandSeparator=','
                  onChange={handleChange}
                  customInput={TextField}
                  required
                  isAllowed={(values) => {
                    const { floatValue } = values;
                    return floatValue === undefined || floatValue <= 100;
                  }}
                  onValueChange={(values) => {
                    setForm({ ...form, split_agent_share: values.value });
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position='start'>%</InputAdornment>
                      ),
                    },
                  }}
                />
              </Stack>
            )}
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid size={6}>
            {carriersLoading ? (
              <Skeleton variant='rounded' height={56} />
            ) : (
              <TextField
                select
                name='carrier'
                label='Carrier'
                value={form.carrier}
                onChange={handleChange}
                fullWidth
                required
              >
                {carriers.map((carrier) => (
                  <MenuItem key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Grid>

          <Grid size={6}>
            {productsLoading ? (
              <Skeleton variant='rounded' height={56} />
            ) : (
              <TextField
                select
                name='product'
                label='Product'
                value={form.product}
                onChange={handleChange}
                fullWidth
                required
              >
                {products
                  .filter((p) => p.carrier_id === form.carrier)
                  .map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
          </Grid>
          <Grid item size={6}>
            <TextField
              label='Policy #'
              name='policy_number'
              value={form.policy_number || ''}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              select
              name='policy_status'
              label='Status'
              value={form.policy_status || ''}
              onChange={handleChange}
              fullWidth
              required
            >
              {statuses.map((s) => (
                <MenuItem
                  key={s}
                  value={s}
                  sx={{ textTransform: 'capitalize' }}
                >
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item size={6}>
            <NumericFormat
              style={{ width: '100%' }}
              name='coverage_amount'
              label='Coverage Amount'
              value={form.coverage_amount || ''}
              thousandSeparator=','
              customInput={TextField}
              required
              onValueChange={(values) => {
                setUpdatesMade(true);
                setForm((prev) => ({ ...prev, coverage_amount: values.value }));
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
          <Grid item size={6}>
            <NumericFormat
              name='premium_amount'
              label='Monthly Premium Amount'
              value={form.premium_amount || ''}
              thousandSeparator=','
              customInput={TextField}
              required
              onValueChange={(values) => {
                setUpdatesMade(true);
                setForm((prev) => ({ ...prev, premium_amount: values.value }));
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position='start'>$</InputAdornment>
                  ),
                },
              }}
              style={{ width: '100%' }}
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              select
              name='premium_frequency'
              label='Frequency'
              value={form.premium_frequency || ''}
              onChange={handleChange}
              fullWidth
              required
            >
              {frequencies.map((f) => (
                <MenuItem
                  key={f}
                  value={f}
                  sx={{ textTransform: 'capitalize' }}
                >
                  {f}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item size={6}>
            <TextField
              name='sold_date'
              label='Date Sold'
              type='date'
              InputLabelProps={{ shrink: true }}
              value={form.sold_date || ''}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              name='effective_date'
              label='Effective Date'
              type='date'
              InputLabelProps={{ shrink: true }}
              value={form.effective_date || ''}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              select
              name='draft_day'
              label='Draft Day'
              value={form.draft_day || ''}
              onChange={handleChange}
              fullWidth
              required
            >
              {draftDays.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item size={12}>
            <Divider />
          </Grid>

          <Grid item size={12}>
            <Typography fontWeight='bold'>Primary Beneficiaries</Typography>
          </Grid>
          {(form.beneficiaries ?? []).map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2}>
                <Grid item size={3}>
                  <TextField
                    value={b.first_name}
                    label='First Name'
                    required
                    onChange={(e) =>
                      handleBeneficiaryChange(i, 'first_name', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    value={b.last_name}
                    label='Last Name'
                    required
                    onChange={(e) =>
                      handleBeneficiaryChange(i, 'last_name', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    select
                    value={b.relationship}
                    label='Relationship'
                    onChange={(e) =>
                      handleBeneficiaryChange(i, 'relationship', e.target.value)
                    }
                    fullWidth
                  >
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <MenuItem value={option} key={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={3}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <NumericFormat
                      style={{ width: '100%' }}
                      name='share'
                      label='Share'
                      value={b.share}
                      thousandSeparator=','
                      customInput={TextField}
                      required
                      isAllowed={(values) => {
                        const { floatValue } = values;
                        return floatValue === undefined || floatValue <= 100;
                      }}
                      onValueChange={(values) => {
                        handleBeneficiaryChange(i, 'share', values.value);
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position='start'>%</InputAdornment>
                          ),
                        },
                      }}
                    />
                    {i !== 0 && (
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <IconButton
                          onClick={() => handleDeleteBeneficiary('primary', i)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    )}
                  </Stack>
                </Grid>
              </Grid>
            </Fragment>
          ))}
          <Grid item size={12}>
            <Button startIcon={<AddIcon />} onClick={handleAddBeneficiary}>
              Add Primary Beneficiary
            </Button>
          </Grid>

          <Grid item size={12}>
            <Divider />
          </Grid>

          <Grid item size={12}>
            <Typography fontWeight='bold'>Contingent Beneficiaries</Typography>
          </Grid>
          {(form.contingent_beneficiaries ?? []).map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2}>
                <Grid item size={3}>
                  <TextField
                    value={b.first_name}
                    label='First Name'
                    required
                    onChange={(e) =>
                      handleContingentChange(i, 'first_name', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    value={b.last_name}
                    label='Last Name'
                    required
                    onChange={(e) =>
                      handleContingentChange(i, 'last_name', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    select
                    value={b.relationship}
                    label='Relationship'
                    required
                    onChange={(e) =>
                      handleContingentChange(i, 'relationship', e.target.value)
                    }
                    fullWidth
                  >
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <MenuItem value={option} key={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={3}>
                  <Stack direction='row' spacing={1} alignItems='center'>
                    <NumericFormat
                      style={{ width: '100%' }}
                      name='share'
                      label='Share'
                      value={b.share}
                      thousandSeparator=','
                      customInput={TextField}
                      required
                      isAllowed={(values) => {
                        const { floatValue } = values;
                        return floatValue === undefined || floatValue <= 100;
                      }}
                      onValueChange={(values) => {
                        handleContingentChange(i, 'share', values.value);
                      }}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position='start'>%</InputAdornment>
                          ),
                        },
                      }}
                    />
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <IconButton
                        onClick={() => handleDeleteBeneficiary('contingent', i)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Grid>
              </Grid>
            </Fragment>
          ))}
          <Grid item size={12}>
            <Button startIcon={<AddIcon />} onClick={handleAddContingent}>
              Add Contingent Beneficiary
            </Button>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant='contained'
          disabled={disabled || isPending}
          color='action'
        >
          {isPending ? 'Updating...' : 'Update Policy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdatePolicyDialog;
