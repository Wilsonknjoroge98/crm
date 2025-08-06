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
  InputAdornment,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useEffect, useState, Fragment } from 'react';
import { useMutation } from '@tanstack/react-query';
import { patchPolicy } from '../utils/query';
import { RELATIONSHIP_OPTIONS, CARRIER_PRODUCTS } from '../utils/constants';
import { enqueueSnackbar } from 'notistack';

const frequencies = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual'];
const statuses = ['Active', 'Pending', 'Lapsed', 'Cancelled'];
const draftDays = Array.from({ length: 31 }, (_, i) => `${i + 1}`);

const UpdatePolicyDialog = ({ open, setOpen, policy, refetchPolicies }) => {
  const [form, setForm] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const [pShareError, setPShareError] = useState([]);
  const [cShareError, setCShareError] = useState([]);

  useEffect(() => {
    if (policy) {
      setForm(policy);
      setPShareError(new Array(policy.beneficiaries?.length || 0).fill(false));
      setCShareError(
        new Array(policy.contingentBeneficiaries?.length || 0).fill(false),
      );
    }
  }, [policy]);

  console.log('UpdatePolicyDialog form:', form);

  const { mutate: updatePolicy } = useMutation({
    mutationFn: patchPolicy,
    onSuccess: () => {
      refetchPolicies();
      setForm(null);
      setOpen(false);
      enqueueSnackbar('Policy updated successfully!', {
        variant: 'success',
        style: {
          color: '#1A1A1A',
          fontWeight: 'bold',
          fontFamily: `"Libre Baskerville", serif`,
          fontSize: '1rem',
        },
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'left',
        },
      });
    },
    onError: (error) => {
      console.error('Error updating policy:', error);
      enqueueSnackbar('Failed to update policy.', { variant: 'error' });
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const transformed = name === 'policyNumber' ? value.toUpperCase() : value;
    setForm((prev) => ({ ...prev, [name]: transformed }));
  };

  const handleBeneficiaryChange = (i, field, value) => {
    const newList = [...form.beneficiaries];
    newList[i][field] = value;
    if (field === 'share') {
      setPShareError((prev) => {
        const copy = [...prev];
        copy[i] = !/^(100|[1-9]?[0-9])$/.test(value);
        return copy;
      });
    }
    setForm((prev) => ({ ...prev, beneficiaries: newList }));
  };

  const handleContingentChange = (i, field, value) => {
    const newList = [...form.contingentBeneficiaries];
    newList[i][field] = value;
    if (field === 'share') {
      setCShareError((prev) => {
        const copy = [...prev];
        copy[i] = !/^(100|[1-9]?[0-9])$/.test(value);
        return copy;
      });
    }
    setForm((prev) => ({ ...prev, contingentBeneficiaries: newList }));
  };

  const handleAddBeneficiary = () => {
    setForm((prev) => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        { fullName: '', relationship: '', share: '' },
      ],
    }));
    setPShareError((prev) => [...prev, false]);
  };

  const handleAddContingent = () => {
    setForm((prev) => ({
      ...prev,
      contingentBeneficiaries: [
        ...prev.contingentBeneficiaries,
        { fullName: '', relationship: '', share: '' },
      ],
    }));
    setCShareError((prev) => [...prev, false]);
  };

  const handleDeleteBeneficiary = (type, index) => {
    if (type === 'primary') {
      setForm((prev) => ({
        ...prev,
        beneficiaries: prev.beneficiaries.filter((_, i) => i !== index),
      }));
      setPShareError((prev) => prev.filter((_, i) => i !== index));
    } else {
      setForm((prev) => ({
        ...prev,
        contingentBeneficiaries: prev.contingentBeneficiaries.filter(
          (_, i) => i !== index,
        ),
      }));
      setCShareError((prev) => prev.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    if (!form) return;
    const keys = [
      'policyNumber',
      'carrier',
      'policyStatus',
      'coverageAmount',
      'premiumAmount',
      'premiumFrequency',
      'dateSold',
      'effectiveDate',
      'draftDay',
    ];

    const hasEmpty = keys.some((k) => form[k] === '');
    if (hasEmpty || pShareError.includes(true) || cShareError.includes(true)) {
      setDisabled(true);
    } else {
      setDisabled(false);
    }
  }, [form, pShareError, cShareError]);

  if (!form) return null;

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='md' fullWidth>
      <DialogTitle>Update Policy</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} p={2}>
          <Grid item size={6}>
            <TextField
              label='Client Name'
              value={form.clientName}
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
          <Grid item size={6}>
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
          <Grid item size={6}>
            <TextField
              select
              name='policyType'
              label='Policy Type'
              value={form.policyType}
              onChange={handleChange}
              fullWidth
            >
              {(CARRIER_PRODUCTS[form.carrier] || []).map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item size={6}>
            <TextField
              label='Policy #'
              name='policyNumber'
              value={form.policyNumber}
              onChange={handleChange}
              fullWidth
            />
          </Grid>

          <Grid item size={6}>
            <TextField
              select
              name='policyStatus'
              label='Status'
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
          <Grid item size={6}>
            <TextField
              name='coverageAmount'
              label='Coverage'
              value={form.coverageAmount}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              name='premiumAmount'
              label='Premium'
              value={form.premiumAmount}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item size={6}>
            <TextField
              select
              name='premiumFrequency'
              label='Frequency'
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
          <Grid item size={6}>
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
          <Grid item size={6}>
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
          <Grid item size={6}>
            <TextField
              select
              name='draftDay'
              label='Draft Day'
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

          <Grid item size={12}>
            <Divider />
          </Grid>

          <Grid item size={12}>
            <Typography fontWeight='bold'>Primary Beneficiaries</Typography>
          </Grid>
          {form.beneficiaries.map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2}>
                <Grid item size={4}>
                  <TextField
                    value={b.fullName}
                    label='Full Name'
                    onChange={(e) =>
                      handleBeneficiaryChange(i, 'fullName', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={4}>
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
                <Grid item size={3}>
                  <TextField
                    value={b.share}
                    label='Share %'
                    error={pShareError[i]}
                    onChange={(e) =>
                      handleBeneficiaryChange(i, 'share', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={1}>
                  <IconButton
                    onClick={() => handleDeleteBeneficiary('primary', i)}
                  >
                    <DeleteIcon />
                  </IconButton>
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
          {form.contingentBeneficiaries.map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2}>
                <Grid item size={4}>
                  <TextField
                    value={b.fullName}
                    label='Full Name'
                    onChange={(e) =>
                      handleContingentChange(i, 'fullName', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={4}>
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
                <Grid item size={3}>
                  <TextField
                    value={b.share}
                    label='Share %'
                    error={cShareError[i]}
                    onChange={(e) =>
                      handleContingentChange(i, 'share', e.target.value)
                    }
                    fullWidth
                  />
                </Grid>
                <Grid item size={1}>
                  <IconButton
                    onClick={() => handleDeleteBeneficiary('contingent', i)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Grid>
              </Grid>
            </Fragment>
          ))}
          <Grid item size={12}>
            <Button startIcon={<AddIcon />} onClick={handleAddContingent}>
              Add Contingent Beneficiary
            </Button>
          </Grid>

          <Grid item size={12}>
            <TextField
              name='notes'
              label='Notes'
              value={form.notes || ''}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          onClick={() => updatePolicy({ policy: form })}
          variant='contained'
          disabled={disabled}
          color='action'
        >
          Update Policy
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdatePolicyDialog;
