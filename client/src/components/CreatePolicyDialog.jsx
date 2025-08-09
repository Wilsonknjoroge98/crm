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
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { Add as AddIcon, CheckBox } from '@mui/icons-material';
import { useEffect, useState, Fragment } from 'react';
import { useMutation } from '@tanstack/react-query';
import { postPolicy } from '../utils/query';
import { RELATIONSHIP_OPTIONS, CARRIER_PRODUCTS } from '../utils/constants';

import { NumericFormat } from 'react-number-format';

import DeleteIcon from '@mui/icons-material/Delete';
import { enqueueSnackbar } from 'notistack';

import useAuth from '../hooks/useAuth';

const frequencies = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];
const statuses = ['Active', 'Pending', 'Lapsed', 'Cancelled'];
const draftDays = Array.from({ length: 31 }, (_, i) => `${i + 1}`);
const CreatePolicyDialog = ({ open, setOpen, client, refetchClients }) => {
  const [disabled, setDisabled] = useState(true);

  const { user } = useAuth();

  const initialForm = {
    policyNumber: '',
    clientId: client?.id || '',
    clientName: client ? `${client.firstName} ${client.lastName}` : '',
    carrier: '',
    policyStatus: 'Active',
    coverageAmount: '',
    premiumAmount: '',
    leadSource: 'GetSeniorQuotes.com',
    policyType: '',
    premiumFrequency: '',
    dateSold: '',
    effectiveDate: '',
    draftDay: '',
    beneficiaries: [{ fullName: '', relationship: '', share: '' }],
    contingentBeneficiaries: [],
    notes: '',
    splitPolicy: undefined,
  };

  const { mutate: createPolicy, isPending } = useMutation({
    mutationFn: postPolicy,
    onSuccess: () => {
      refetchClients();
      setDisabled(true);
      setOpen(false);
      setForm(initialForm);
      enqueueSnackbar('Policy created successfully!', {
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

  const [form, setForm] = useState(initialForm);

  const handleChange = (e) => {
    const { name, value } = e.target;

    const uppercasedFields = ['policyNumber']; // Add other fields if needed
    const transformedValue = uppercasedFields.includes(name)
      ? value.toUpperCase()
      : value;

    setForm((prev) => ({ ...prev, [name]: transformedValue }));
  };

  const handleBeneficiaryChange = (i, field, value) => {
    const newList = [...form.beneficiaries];

    newList[i][field] = value;
    setForm((prev) => ({ ...prev, beneficiaries: newList }));
  };

  const handleAddBeneficiary = () => {
    setForm((prev) => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        { fullName: '', relationship: '', share: '' },
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
        contingentBeneficiaries: prev.contingentBeneficiaries.filter(
          (_, index) => index !== i,
        ),
      }));
    }
  };

  const handleContingentChange = (i, field, value) => {
    const newList = [...form.contingentBeneficiaries];

    newList[i][field] = value;
    setForm((prev) => ({ ...prev, contingentBeneficiaries: newList }));
  };

  const handleAddContingent = () => {
    setForm((prev) => ({
      ...prev,
      contingentBeneficiaries: [
        ...prev.contingentBeneficiaries,
        { fullName: '', relationship: '', share: '' },
      ],
    }));
  };

  const handleSubmit = () => {
    createPolicy({
      policy: { ...form },
      clientId: client.id,
      agentId: user.uid,
    });
  };

  console.log('Form:', form);

  useEffect(() => {
    if (
      client?.id &&
      form.clientId !== client.id &&
      form.clientName !== `${client.firstName} ${client.lastName}`
    ) {
      setForm((prev) => ({
        ...prev,
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
      }));
    }
  }, [client?.id]);

  useEffect(() => {
    const modifiedForm = { ...form };
    delete modifiedForm.notes;

    console.log('Modified Form:', modifiedForm);

    const hasEmptyFields = Object.values(modifiedForm).some((key) => {
      return key === '' || key === undefined;
    });

    if (hasEmptyFields) {
      console.log('Empty fields detected');
      setDisabled(true);
      return;
    }

    if (modifiedForm.beneficiaries.length !== 0) {
      const keys = ['fullName', 'relationship', 'share'];
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

    if (modifiedForm.contingentBeneficiaries.length !== 0) {
      const keys = ['fullName', 'relationship', 'share'];
      const hasEmptyFields = modifiedForm.contingentBeneficiaries.some((b) =>
        keys.some((key) => b[key] === ''),
      );

      const shareValue = modifiedForm.contingentBeneficiaries.reduce(
        (acc, b) => acc + parseFloat(b.share || 0),
        0,
      );

      if (hasEmptyFields || shareValue !== 100) {
        console.log('Empty fields in beneficiaries');
        setDisabled(true);
        return;
      }

      if (hasEmptyFields) {
        console.log('Empty fields in contingent beneficiaries');
        setDisabled(true);
        return;
      }
    }

    console.log('Form is valid, enabling submit button');
    setDisabled(false);
  }, [form]);

  if (!form) {
    return null;
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='md' fullWidth>
      <DialogTitle>New Policy</DialogTitle>
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
                      checked={form.splitPolicy === true}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          splitPolicy: true,
                        }))
                      }
                    />
                  }
                  label='Yes'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.splitPolicy === false}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          splitPolicy: false,
                        }))
                      }
                    />
                  }
                  label='No'
                />
              </Stack>
            </FormControl>
          </Grid>
          <Grid size={6}>
            <TextField
              label='Client Name'
              value={client.firstName + ' ' + client.lastName}
              fullWidth
              disabled
            />
          </Grid>

          <Grid size={6}>
            <TextField
              name='leadSource'
              disabled={true}
              label='Lead Source'
              value={form.leadSource}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid size={6}>
            <TextField
              select
              name='carrier'
              label='Carrier'
              value={form.carrier}
              onChange={handleChange}
              fullWidth
            >
              {Object.keys(CARRIER_PRODUCTS).map((carrier) => (
                <MenuItem key={carrier} value={carrier}>
                  {carrier}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={6}>
            <TextField
              select
              name='policyType'
              label='Policy Type'
              value={form.policyType}
              onChange={handleChange}
              fullWidth
            >
              {form.carrier &&
                CARRIER_PRODUCTS[form.carrier].map((carrier) => (
                  <MenuItem key={carrier} value={carrier}>
                    {carrier}
                  </MenuItem>
                ))}
            </TextField>
          </Grid>
          <Grid size={6}>
            <TextField
              name='policyNumber'
              label='Policy #'
              value={form.policyNumber}
              onChange={handleChange}
              fullWidth
              required
            />
          </Grid>

          <Grid size={6}>
            <TextField
              select
              name='policyStatus'
              label='Policy Status'
              value={form.policyStatus}
              onChange={handleChange}
              fullWidth
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
              name='coverageAmount'
              label='Coverage Amount'
              value={form.coverageAmount}
              thousandSeparator=','
              customInput={TextField}
              onValueChange={(values) => {
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, coverageAmount: value }));
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
              name='premiumAmount'
              label='Monthly Premium Amount'
              value={form.premiumAmount}
              decimalScale={2}
              decimalSeparator='.'
              fixedDecimalScale={true}
              thousandSeparator=','
              customInput={TextField}
              onValueChange={(values) => {
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, premiumAmount: value }));
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
              name='premiumFrequency'
              label='Premium Frequency'
              value={form.premiumFrequency}
              onChange={handleChange}
              fullWidth
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
              name='dateSold'
              label='Date Sold'
              type='date'
              InputLabelProps={{ shrink: true }}
              value={form.dateSold}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid size={6}>
            <TextField
              name='effectiveDate'
              label='Effective Date'
              type='date'
              InputLabelProps={{ shrink: true }}
              value={form.effectiveDate}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid size={6}>
            <TextField
              select
              name='draftDay'
              label='Draft Day (1-31)'
              value={form.draftDay}
              onChange={handleChange}
              fullWidth
            >
              {draftDays.map((d) => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
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
                <Grid size={4}>
                  <TextField
                    value={b.fullName}
                    label='Full Name'
                    onChange={(e) =>
                      handleBeneficiaryChange(i, 'fullName', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={4}>
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
                <Grid size={4}>
                  <NumericFormat
                    style={{ width: '100%' }}
                    name='share'
                    label='Share'
                    value={b.share}
                    thousandSeparator=','
                    customInput={TextField}
                    isAllowed={(values) => {
                      const { floatValue } = values;
                      return floatValue === undefined || floatValue <= 100;
                    }}
                    onValueChange={(values) => {
                      const { value } = values; // raw value without formatting
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
                </Grid>
              </Grid>
              {i !== 0 && (
                <Stack direction='row' spacing={1} alignItems='center'>
                  <IconButton
                    onClick={() => handleDeleteBeneficiary('primary', i)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              )}
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
            <Divider sx={{ mt: 2 }} />
          </Grid>

          <Grid size={12}>
            <Typography fontWeight='bold'>Contingent Beneficiaries</Typography>
          </Grid>
          {form.contingentBeneficiaries.map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2} key={i} sx={{ mb: 1 }}>
                <Grid size={4}>
                  <TextField
                    value={b.fullName}
                    label='Full Name'
                    onChange={(e) =>
                      handleContingentChange(i, 'fullName', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid size={4}>
                  <TextField
                    select
                    value={b.relationship}
                    label='Relationship'
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
                <Grid size={4}>
                  <NumericFormat
                    style={{ width: '100%' }}
                    label='Share'
                    value={b.share}
                    max={100}
                    thousandSeparator=','
                    customInput={TextField}
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
                </Grid>
              </Grid>
              <Stack direction='row' spacing={1} alignItems='center'>
                <IconButton
                  onClick={() => handleDeleteBeneficiary('contingent', i)}
                >
                  <DeleteIcon />
                </IconButton>
              </Stack>
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
