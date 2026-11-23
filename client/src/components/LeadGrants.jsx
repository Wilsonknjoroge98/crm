import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { getAgents, getLeadGrants, giveLeadGrant } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

// Free leads an admin gives an agent. The server adds them to the agent's
// GSQ balance and keeps a record (endpoints/lead_grants.js).

const LEAD_TYPES = {
  web_verified: 'GSQ Web - verified',
  web_unverified: 'GSQ Web - unverified',
  instant_form: 'GSQ Instant Form',
  live_transfer: 'GSQ Live Transfer',
};

const EMPTY_FORM = {
  agent: null,
  leadType: 'web_verified',
  quantity: '',
  reason: '',
};

const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
  person?.email ||
  '—';

const LeadGrants = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirming, setConfirming] = useState(false);

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });
  const { data: grants = [] } = useQuery({
    queryKey: ['lead-grants'],
    queryFn: getLeadGrants,
  });

  const set = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const quantity = Number(form.quantity);
  const reason = form.reason.trim();
  const isValid =
    Boolean(form.agent?.email) &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 100 &&
    reason.length >= 1 &&
    reason.length <= 500;
  const name = form.agent ? fullName(form.agent) : '';
  const what = `${quantity} ${LEAD_TYPES[form.leadType]} lead${quantity === 1 ? '' : 's'}`;

  const { mutate: give, isPending } = useMutation({
    mutationFn: () =>
      giveLeadGrant({
        agentId: form.agent.id,
        leadType: form.leadType,
        quantity,
        reason,
      }),
    onSuccess: () => {
      enqueueSnackbar(`Gave ${name} ${what}`, SNACKBAR_SUCCESS_OPTIONS);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ['lead-grants'] });
    },
    onError: (error) =>
      enqueueSnackbar(
        error?.response?.data?.error || 'Could not give the leads',
        SNACKBAR_ERROR_OPTIONS,
      ),
    onSettled: () => setConfirming(false),
  });

  return (
    <Stack spacing={3}>
      <Paper variant='outlined' sx={{ p: 2, maxWidth: 560 }}>
        <Typography variant='h6'>Give free leads</Typography>
        <Typography variant='body2' color='text.secondary' mb={2}>
          Adds leads to the agent&apos;s GSQ balance and keeps a record.
        </Typography>
        <Stack spacing={2}>
          <Autocomplete
            options={agents}
            value={form.agent}
            onChange={(_, value) => set('agent')(value)}
            getOptionLabel={(agent) =>
              `${fullName(agent)} (${agent.email || 'no email'})`
            }
            getOptionDisabled={(agent) => !agent.email}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => <TextField {...params} label='Agent' />}
          />
          <TextField
            select
            label='Lead type'
            value={form.leadType}
            onChange={(e) => set('leadType')(e.target.value)}
          >
            {Object.entries(LEAD_TYPES).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label='How many'
            type='number'
            value={form.quantity}
            onChange={(e) => set('quantity')(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: 100, step: 1 } }}
          />
          <TextField
            label='Reason'
            placeholder='e.g. 2 leads over age 85'
            value={form.reason}
            onChange={(e) => set('reason')(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <Button
            variant='contained'
            disabled={!isValid || isPending}
            onClick={() => setConfirming(true)}
            sx={{ alignSelf: 'flex-end' }}
          >
            Give leads
          </Button>
        </Stack>
      </Paper>

      <Dialog
        open={confirming}
        onClose={() => !isPending && setConfirming(false)}
      >
        <DialogContent>
          <Typography>
            Give {name} {what}?
          </Typography>
          <Typography variant='body2' color='text.secondary' mt={1}>
            {reason}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant='contained'
            onClick={() => give()}
            disabled={isPending}
          >
            Give
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant='h6'>Recent free leads</Typography>
      {grants.length === 0 ? (
        <Alert severity='info'>No free leads given yet.</Alert>
      ) : (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Given</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Given by</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grants.map((grant) => (
                <TableRow key={grant.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {dayjs(grant.created_at).format('MMM D, YYYY h:mm A')}
                  </TableCell>
                  <TableCell>
                    {grant.agent ? fullName(grant.agent) : grant.agent_email}
                  </TableCell>
                  <TableCell>
                    {grant.quantity}{' '}
                    {LEAD_TYPES[grant.lead_type] || grant.lead_type}
                  </TableCell>
                  <TableCell>{grant.reason}</TableCell>
                  <TableCell>
                    {grant.given_by_agent
                      ? fullName(grant.given_by_agent)
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
};

export default LeadGrants;
