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
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { useEffect, useState, Fragment } from "react";
import { useMutation } from "@tanstack/react-query";
import { patchPolicy } from "../utils/query";
import { RELATIONSHIP_OPTIONS, CARRIER_PRODUCTS } from "../utils/constants";
import { enqueueSnackbar } from "notistack";
import useAuth from "../hooks/useAuth";

const frequencies = ["Monthly", "Quarterly", "Semi-Annual", "Annual"];
const statuses = ["Active", "Pending", "Lapsed", "Cancelled"];
const draftDays = Array.from({ length: 31 }, (_, i) => `${i + 1}`);

import { NumericFormat } from "react-number-format";

const UpdatePolicyDialog = ({ open, setOpen, policy, refetchPolicies, agents }) => {
  const [form, setForm] = useState(null);
  const [disabled, setDisabled] = useState(true);
  const [updatesMade, setUpdatesMade] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (policy) {
      setForm(policy);
    }
  }, [policy]);

  const { mutate: updatePolicy, isPending } = useMutation({
    mutationFn: patchPolicy,
    onSuccess: () => {
      refetchPolicies();
      setForm(null);
      setOpen(false);
      enqueueSnackbar("Policy updated successfully!", {
        variant: "success",
        style: {
          fontWeight: "bold",
          fontFamily: `"Libre Baskerville", serif`,
          fontSize: "1rem",
        },
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "right",
        },
      });
    },
    onError: (error) => {
      console.error("Error updating policy:", error);
      enqueueSnackbar("Failed to update policy.", {
        variant: "error",
        style: {
          fontWeight: "bold",
          fontFamily: `"Libre Baskerville", serif`,
          fontSize: "1rem",
        },
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "right",
        },
      });
    },
  });

  const handleSubmit = () => {
    const agentIds = !form.splitPolicy ? [user.uid] : [user.uid, form.splitPolicyAgent];

    updatePolicy({ policy: { ...form, agentIds } });
  };

  const handleChange = (e) => {
    setUpdatesMade(true);

    const { name, value } = e.target;

    const transformed = name === "policyNumber" ? value.toUpperCase() : value;
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
    const newList = [...form.contingentBeneficiaries];
    newList[i][field] = value;

    setForm((prev) => ({ ...prev, contingentBeneficiaries: newList }));
  };

  const handleAddBeneficiary = () => {
    setUpdatesMade(true);
    setForm((prev) => ({
      ...prev,
      beneficiaries: [
        ...prev.beneficiaries,
        { firstName: "", lastName: "", relationship: "", share: "" },
      ],
    }));
  };

  const handleAddContingent = () => {
    setUpdatesMade(true);
    setForm((prev) => ({
      ...prev,
      contingentBeneficiaries: [
        ...prev.contingentBeneficiaries,
        { firstName: "", lastName: "", relationship: "", share: "" },
      ],
    }));
  };

  const handleDeleteBeneficiary = (type, index) => {
    setUpdatesMade(true);
    if (type === "primary") {
      setForm((prev) => ({
        ...prev,
        beneficiaries: prev.beneficiaries.filter((_, i) => i !== index),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        contingentBeneficiaries: prev.contingentBeneficiaries.filter((_, i) => i !== index),
      }));
    }
  };

  useEffect(() => {
    if (!form) return;
    const modifiedForm = { ...form };
    delete modifiedForm.notes;

    console.log("Modified Form:", modifiedForm);

    const hasEmptyFields = Object.values(modifiedForm).some((key) => key === "");

    if (hasEmptyFields || !updatesMade) {
      console.log("Empty fields detected");
      setDisabled(true);
      return;
    }

    if (modifiedForm.splitPolicy) {
      if (!modifiedForm.splitPolicyAgent || !modifiedForm.splitPolicyShare) {
        console.log("Empty split policy fields detected");
        setDisabled(true);
        return;
      }
    }

    if (modifiedForm.beneficiaries.length !== 0) {
      const keys = ["firstName", "lastName", "relationship", "share"];
      const hasEmptyFields = modifiedForm.beneficiaries.some((b) =>
        keys.some((key) => b[key] === "")
      );

      const shareValue = modifiedForm.beneficiaries.reduce(
        (acc, b) => acc + parseFloat(b.share || 0),
        0
      );

      if (hasEmptyFields || shareValue !== 100) {
        console.log("Empty fields in beneficiaries");
        setDisabled(true);
        return;
      }
    }

    if (modifiedForm.contingentBeneficiaries.length !== 0) {
      const keys = ["firstName", "lastName", "relationship", "share"];
      const hasEmptyFields = modifiedForm.contingentBeneficiaries.some((b) =>
        keys.some((key) => b[key] === "")
      );

      const shareValue = modifiedForm.contingentBeneficiaries.reduce(
        (acc, b) => acc + parseFloat(b.share || 0),
        0
      );

      if (hasEmptyFields || shareValue !== 100) {
        console.log("Empty fields in beneficiaries");
        setDisabled(true);
        return;
      }

      if (hasEmptyFields) {
        console.log("Empty fields in contingent beneficiaries");
        setDisabled(true);
        return;
      }
    }

    console.log("Form is valid, enabling submit button");
    setDisabled(false);
  }, [form]);

  if (!form) {
    return null;
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth='md' fullWidth>
      <DialogTitle>Update Policy</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} p={2}>
          <Grid size={12}>
            <FormControl error={true} fullWidth>
              <Alert sx={{ width: "fit-content" }} severity='warning'>
                Is this a split policy?
              </Alert>
              <Stack direction='row' spacing={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.splitPolicy === true}
                      onChange={() => {
                        setUpdatesMade(true);
                        setForm((prev) => ({
                          ...prev,
                          splitPolicy: true,
                        }));
                      }}
                    />
                  }
                  label='Yes'
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.splitPolicy === false}
                      onChange={() => {
                        setUpdatesMade(true);
                        setForm((prev) => ({
                          ...prev,
                          splitPolicy: false,
                        }));
                      }}
                    />
                  }
                  label='No'
                />
              </Stack>
            </FormControl>
            {form.splitPolicy && (
              <Stack direction='row' spacing={2} sx={{ mt: 2 }}>
                <TextField
                  select
                  name='splitPolicyAgent'
                  label='Other Agent'
                  value={form?.splitPolicyAgent}
                  onChange={handleChange}
                  fullWidth
                  required
                >
                  {Array.isArray(agents) &&
                    agents.map((agent) => {
                      if (agent.uid === user.uid) return null; // Skip current user
                      return (
                        <MenuItem key={agent.uid} value={agent.uid}>
                          {agent.name}
                        </MenuItem>
                      );
                    })}
                </TextField>

                <NumericFormat
                  style={{ width: "100%" }}
                  name='splitPolicyShare'
                  label='Other Agent’s Commission Share'
                  value={form?.splitPolicyShare}
                  thousandSeparator=','
                  onChange={handleChange}
                  customInput={TextField}
                  required
                  isAllowed={(values) => {
                    const { floatValue } = values;
                    return floatValue === undefined || floatValue <= 100;
                  }}
                  onValueChange={(values) => {
                    const { value } = values; // raw value without formatting
                    setForm({ ...form, splitPolicyShare: value });
                  }}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position='start'>%</InputAdornment>,
                    },
                  }}
                />
              </Stack>
            )}
            <Divider sx={{ my: 2 }} />
          </Grid>
          <Grid item size={6}>
            <TextField label='Client Name' value={form.clientName} fullWidth disabled />
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
              required
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
              required
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
              required
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
              required
            >
              {statuses.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item size={6}>
            <NumericFormat
              style={{ width: "100%" }}
              name='coverageAmount'
              label='Coverage Amount'
              value={form.coverageAmount}
              thousandSeparator=','
              customInput={TextField}
              required
              onValueChange={(values) => {
                setUpdatesMade(true);
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, coverageAmount: value }));
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                },
              }}
            />
          </Grid>
          <Grid item size={6}>
            <NumericFormat
              name='premiumAmount'
              label='Monthly Premium Amount'
              value={form.premiumAmount}
              thousandSeparator=','
              customInput={TextField}
              required
              onValueChange={(values) => {
                setUpdatesMade(true);
                const { value } = values; // raw value without formatting
                setForm((prev) => ({ ...prev, premiumAmount: value }));
              }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position='start'>$</InputAdornment>,
                },
              }}
              style={{ width: "100%" }}
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
              required
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
              required
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
              required
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
          {form.beneficiaries.map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2}>
                <Grid item size={3}>
                  <TextField
                    value={b.firstName}
                    label='First Name'
                    required
                    onChange={(e) => handleBeneficiaryChange(i, "firstName", e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    value={b.lastName}
                    label='Last Name'
                    required
                    onChange={(e) => handleBeneficiaryChange(i, "lastName", e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    select
                    value={b.relationship}
                    label='Relationship'
                    onChange={(e) => handleBeneficiaryChange(i, "relationship", e.target.value)}
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
                      style={{ width: "100%" }}
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
                        const { value } = values; // raw value without formatting
                        handleBeneficiaryChange(i, "share", value);
                      }}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position='start'>%</InputAdornment>,
                        },
                      }}
                    />
                    {i !== 0 && (
                      <Stack direction='row' spacing={1} alignItems='center'>
                        <IconButton onClick={() => handleDeleteBeneficiary("primary", i)}>
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
          {form.contingentBeneficiaries.map((b, i) => (
            <Fragment key={i}>
              <Grid container spacing={2}>
                <Grid item size={3}>
                  <TextField
                    value={b.firstName}
                    label='First Name'
                    required
                    onChange={(e) => handleContingentChange(i, "firstName", e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    value={b.lastName}
                    label='Last Name'
                    required
                    onChange={(e) => handleContingentChange(i, "lastName", e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item size={3}>
                  <TextField
                    select
                    value={b.relationship}
                    label='Relationship'
                    required
                    onChange={(e) => handleContingentChange(i, "relationship", e.target.value)}
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
                      style={{ width: "100%" }}
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
                        const { value } = values; // raw value without formatting
                        handleBeneficiaryChange(i, "share", value);
                      }}
                      slotProps={{
                        input: {
                          startAdornment: <InputAdornment position='start'>%</InputAdornment>,
                        },
                      }}
                    />

                    <Stack direction='row' spacing={1} alignItems='center'>
                      <IconButton onClick={() => handleDeleteBeneficiary("contingent", i)}>
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
          {isPending ? "Updating..." : "Update Policy"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdatePolicyDialog;
