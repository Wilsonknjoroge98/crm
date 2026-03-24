// AddPolicyDialog.jsx
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
  Divider,
  IconButton,
  Stack,
  Typography,
  FormControl,
  FormControlLabel,
  Checkbox,
  Alert,
  Skeleton,
  Box,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useEffect, useState, Fragment } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  postPolicy,
  getAgents,
  getCarriers,
  getProducts,
} from '../utils/query';
import {
  RELATIONSHIP_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

import { NumericFormat } from 'react-number-format';
import DeleteIcon from '@mui/icons-material/Delete';
import { enqueueSnackbar } from 'notistack';
import { useSelector } from 'react-redux';
import { toTitleCase, formatPhone } from '../utils/helpers';

const frequencies = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];
const statuses = [
  'Active',
  'Pending',
  'Lapsed',
  'Insufficient Funds',
  'Cancelled',
];
const draftDays = Array.from({ length: 31 }, (_, i) => `${i + 1}`);


const CreatePolicyDialog = ({ open, setOpen, client, refetchClients }) => {
  const [disabled, setDisabled] = useState(true);
  const { user } = useSelector((state) => state.user);

  const initialForm = {
    policy_number: '',
    client_id: client?.id || '',
    clientName: client ? `${client.first_name} ${client.last_name}` : '',
    carrier: '',
    policy_status: 'Active',
    coverage_amount: '',
    premium_amount: '',
    lead_vendor_id: client?.lead_vendor_id || 'GetSeniorQuotes.com',
    product: '',
    premium_frequency: 'Monthly',
    sold_date: '',
    effective_date: '',
    draft_day: '',
    beneficiaries: [
      { first_name: '', last_name: '', relationship: '', phone: '', share: '' },
    ],
    contingent_beneficiaries: [],
    notes: '',
    split_policy: '',
    split_agent_id: undefined,
    split_agent_share: undefined,
  };

  const {
    mutate: createPolicy,
    isPending,
    error,
  } = useMutation({
    mutationFn: postPolicy,
    onSuccess: () => {
      refetchClients();
      setDisabled(true);
      setOpen(false);
      setForm(initialForm);
      enqueueSnackbar('Policy created successfully!', SNACKBAR_SUCCESS_OPTIONS);
    },
  });

  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  const { data: carriers = [], isLoading: carriersLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: getCarriers,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const [form, setForm] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value } = e.target;

    const uppercasedFields = ['policy_number'];
    const transformedValue = uppercasedFields.includes(name)
      ? value.toUpperCase()
      : value;

    setForm((prev) => ({ ...prev, [name]: transformedValue }));
  };

  const handleBeneficiaryChange = (i, field, value) => {
    const newList = [...form.beneficiaries];

    if (field === 'first_name' || field === 'last_name') {
      value = toTitleCase(value);
    }

    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    newList[i][field] = value;
    setForm((prev) => ({ ...prev, beneficiaries: newList }));
  };

  const handleContingentChange = (i, field, value) => {
    const newList = [...form.contingent_beneficiaries];

    if (field === 'first_name' || field === 'last_name') {
      value = toTitleCase(value);
    }

    if (field === 'phone') {
      value = value.replace(/\D/g, '').slice(0, 10);
    }

    newList[i][field] = value;
    setForm((prev) => ({ ...prev, contingent_beneficiaries: newList }));
  };

  const handleAddBeneficiary = () => {
    setForm((prev) => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        {
          first_name: '',
          last_name: '',
          relationship: '',
          phone: '',
          share: '',
        },
      ],
    }));
  };

  const handleDeleteBeneficiary = (type, i) => {
    if (type === 'primary') {
      setForm((prev) => ({
        ...prev,
        beneficiaries: prev.beneficiaries.filter((_, index) => index !== i),
      }));
    } else if (type === 'contingent') {
      setForm((prev) => ({
        ...prev,
        contingent_beneficiaries: prev.contingent_beneficiaries.filter(
          (_, index) => index !== i,
        ),
      }));
    }
  };

  const handleAddContingent = () => {
    setForm((prev) => ({
      ...prev,
      contingent_beneficiaries: [
        ...prev.contingent_beneficiaries,
        {
          first_name: '',
          last_name: '',
          relationship: '',
          phone: '',
          share: '',
        },
      ],
    }));
  };

  const handleSubmit = () => {
    createPolicy({
      data: {
        policy: { ...form },
        client_id: form?.client_id,
      },
    });
  };

  useEffect(() => {
    if (
      client?.id &&
      form.clientId !== client.id &&
      form.clientName !== `${client.first_name} ${client.last_name}`
    ) {
      setForm((prev) => ({
        ...prev,
        clientId: client.id,
        clientName: `${client.first_name} ${client.last_name}`,
      }));
    }
  }, [client?.id]);

  useEffect(() => {
    if (!form) return;
    const modifiedForm = { ...form };
    delete modifiedForm.notes;

    console.log('Validating form', modifiedForm);

    const hasEmptyFields = Object.keys(modifiedForm).some((key) => {
      return (
        key !== 'split_agent_id' &&
        key !== 'split_agent_share' &&
        modifiedForm[key] === ''
      );
    });

    if (hasEmptyFields) {
      console.log('Form', modifiedForm);
      console.log('Empty fields detected');
      setDisabled(true);
      return;
    }

    if (modifiedForm.split_policy) {
      if (!modifiedForm.split_agent_id || !modifiedForm.split_agent_share) {
        console.log('Empty fields detected');
        setDisabled(true);
        return;
      }
    }

    if (modifiedForm.beneficiaries.length !== 0) {
      const keys = ['first_name', 'last_name', 'relationship', 'share'];
      const hasEmptyFields = modifiedForm.beneficiaries.some((b) =>
        keys.some((key) => b[key] === ''),
      );

      const shareValue = modifiedForm.beneficiaries.reduce(
        (acc, b) => acc + parseFloat(b.share || 0),
        0,
      );

      if (hasEmptyFields || shareValue !== 100) {
        console.log('Empty fields in beneficiaries');
        setDisabled(true);
        return;
      }
    }

    if (modifiedForm.contingent_beneficiaries.length !== 0) {
      const keys = ['first_name', 'last_name', 'relationship', 'share'];
      const hasEmptyFields = modifiedForm.contingent_beneficiaries.some((b) =>
        keys.some((key) => b[key] === ''),
      );

      const shareValue = modifiedForm.contingent_beneficiaries.reduce(
        (acc, b) => acc + parseFloat(b.share || 0),
        0,
      );

      if (hasEmptyFields || shareValue !== 100) {
        console.log('Empty fields in beneficiaries');
        setDisabled(true);
        return;
      }
    }

    console.log('Form is valid, enabling submit button');
    setDisabled(false);
  }, [form]);

  if (!agents) {
    console.log('Agents data is undefined');
  }

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
            Creating policy for
          </Typography>
          <Typography variant='subtitle1' fontWeight={600}>
            {client.first_name} {client.last_name}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} p={2}>

          <Grid size={12}>
            <FormControl fullWidth>
              <Alert sx={{ width: 'fit-content' }} severity='warning'>
                Is this a split policy?
              </Alert>

              <Stack direction='row' spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.split_policy === true}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          split_policy: true,
                        }))
                      }
                    />
                  }
                  label='Yes'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.split_policy === false}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          split_policy: false,
                        }))
                      }
                    />
                  }
                  label='No'
                />
              </Stack>
            </FormControl>
            {form.split_policy && (
              <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
                {agentsLoading ? (
                  <Skeleton variant='rectangular' width={210} height={56} />
                ) : (
                  <TextField
                    select
                    name='split_agent_id'
                    label='Other Agent'
                    value={form?.split_agent_id || ''}
                    onChange={handleChange}
                    fullWidth
                    required
                  >
                    {agents.length !== 0 &&
                      agents.map((agent) => {
                        if (agent.id === user?.id) return null;
                        return (
                          <MenuItem key={agent.id} value={agent.id}>
                            {[agent.first_name, agent.last_name]
                              .filter(Boolean)
                              .join(' ')}
                          </MenuItem>
                        );
                      })}
                  </TextField>
                )}

                <NumericFormat
                  style={{ width: '100%' }}
                  name='split_agent_share'
                  label='Other Agent’s Commission Share'
                  value={form?.split_agent_share || ''}
                  thousandSeparator=','
                  onChange={handleChange}
                  customInput={TextField}
                  required
                  isAllowed={(values) => {
                    const { floatValue } = values;
                    return floatValue === undefined || floatValue <= 99;
                  }}
                  onValueChange={(values) => {
                    const { value } = values; // raw value without formatting
                    setForm({ ...form, split_agent_share: value });
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
          <Grid size={6}>
            <TextField
              name='policy_number'
              label='Policy #'
              value={form.policy_number}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>

          <Grid size={6}>
            <TextField
              select
              name='policy_status'
              label='Policy Status'
              value={form.policy_status}
              onChange={handleChange}
              fullWidth
              required
            >
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={6}>
            <NumericFormat
              style={{ width: '100%' }}
              name='coverage_amount'
              label='Coverage Amount'
              value={form.coverage_amount}
              thousandSeparator=','
              customInput={TextField}
              required
              onValueChange={(values) => {
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, coverage_amount: value }));
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
          <Grid size={6}>
            <NumericFormat
              name='premium_amount'
              label='Monthly Premium Amount'
              value={form.premium_amount}
              decimalScale={2}
              decimalSeparator='.'
              fixedDecimalScale={true}
              thousandSeparator=','
              customInput={TextField}
              required
              onValueChange={(values) => {
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, premium_amount: value }));
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

          <Grid size={6}>
            <TextField
              select
              name='draft_day'
              label='Recurring Draft Day'
              value={form.draft_day}
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

          <Grid size={6}>
            <TextField
              select
              name='premium_frequency'
              label='Premium Frequency'
              value={form.premium_frequency}
              onChange={handleChange}
              fullWidth
              required
            >
              {frequencies.map((f) => (
                <MenuItem key={f} value={f}>
                  {f}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={6}>
            <TextField
              name='sold_date'
              label='Date Sold'
              type='date'
              value={form.sold_date}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>
          <Grid size={6}>
            <TextField
              name='effective_date'
              label='Effective Date'
              type='date'
              value={form.effective_date}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>

          <Grid size={12}>
            <Divider />
          </Grid>
          <Grid size={12}>
            <Typography fontWeight='bold'>Primary Beneficiaries</Typography>
          </Grid>
          {form.beneficiaries.map((b, i) => (
            <>
              <Grid container spacing={2} key={i} sx={{ mb: 1 }}>
                <Grid size={2}>
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
                <Grid size={2}>
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
                <Grid size={2}>
                  <TextField
                    select
                    value={b.relationship}
                    label='Relationship'
                    required
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
                  <TextField
                    value={formatPhone(b.phone || '')}
                    label='Phone'
                    onChange={(e) =>
                      handleBeneficiaryChange(i, 'phone', e.target.value)
                    }
                    fullWidth
                  />
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
                        const { value } = values;
                        handleBeneficiaryChange(i, 'share', value);
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
            </>
          ))}
          <Grid size={12}>
            <Button
              onClick={handleAddBeneficiary}
              startIcon={<AddIcon />}
              sx={{ mt: 1 }}
            >
              Add Primary Beneficiary
            </Button>
          </Grid>

          <Grid size={12}>
            <Divider />
          </Grid>
          <Grid size={12}>
            <Typography fontWeight='bold'>Contingent Beneficiaries</Typography>
          </Grid>

          {form.contingent_beneficiaries.map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2} key={i} sx={{ mb: 1 }}>
                <Grid size={2}>
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
                <Grid size={2}>
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
                <Grid size={2}>
                  <TextField
                    select
                    value={b.relationship}
                    label='Relationship'
                    onChange={(e) =>
                      handleContingentChange(i, 'relationship', e.target.value)
                    }
                    fullWidth
                    required
                  >
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <MenuItem value={option} key={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={3}>
                  <TextField
                    value={formatPhone(b.phone || '')}
                    label='Phone'
                    onChange={(e) =>
                      handleContingentChange(i, 'phone', e.target.value)
                    }
                    fullWidth
                  />
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
                        const { value } = values;
                        handleContingentChange(i, 'share', value);
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
          <Grid size={12}>
            <Button
              onClick={handleAddContingent}
              startIcon={<AddIcon />}
              sx={{ mt: 1 }}
            >
              Add Contingent Beneficiary
            </Button>
          </Grid>
          {error && (
            <Alert severity='error' sx={{ mb: 2, width: '100%', p: 2 }}>
              {error?.response?.status === 409
                ? 'A policy with this policy number already exists.'
                : error?.response?.data?.error || error.message}
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
          {isPending ? 'Saving...' : 'Save Policy'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePolicyDialog;
