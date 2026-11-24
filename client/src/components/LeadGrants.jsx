import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
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

// Keep the keys in step with LEAD_TYPES in server/functions/endpoints/lead_grants.js
// and the lead_type check in server/sql/add_lead_grants.sql.
const LEAD_TYPES = {
  gsq_verified: 'GSQ Web - verified',
  gsq_unverified: 'GSQ Web - unverified',
  keyley_verified: 'Keyley - verified',
  gsq_instant_form: 'GSQ Instant Form',
  gsq_live_transfer: 'GSQ Live Transfer',
};

// Pick one, like the Producer Page bio presets; Other takes typed text.
const REASONS = ['Reviews', 'Promotions', 'Refund', 'Unused Discount'];
const OTHER = 'Other';

const EMPTY_FORM = {
  agent: null,
  leadType: 'gsq_verified',
  quantity: '',
  reasonChoice: REASONS[0],
  otherReason: '',
};

const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
  person?.email ||
  '—';

const describe = ({ quantity, leadType }) =>
  `${quantity} ${LEAD_TYPES[leadType]} lead${quantity === 1 ? '' : 's'}`;

// A grant that was sent but got no final answer (network error, timeout, 5xx,
// tab closed). It keeps its id in localStorage, so it survives reloads and
// browser restarts on this browser, and Retry sends the same id: the server
// never adds the leads twice for one id (endpoints/lead_grants.js).
const PENDING_KEY = 'leadGrants.pending';
const loadPending = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY)) || null;
  } catch {
    return null;
  }
};
const savePending = (grant) => {
  if (grant) localStorage.setItem(PENDING_KEY, JSON.stringify(grant));
  else localStorage.removeItem(PENDING_KEY);
};

const LeadGrants = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPendingState] = useState(loadPending);
  const setPending = (grant) => {
    savePending(grant);
    setPendingState(grant);
  };

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });
  const { data: grants = [], isError: grantsFailed } = useQuery({
    queryKey: ['lead-grants'],
    queryFn: getLeadGrants,
  });

  const set = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const quantity = Number(form.quantity);
  const reason =
    form.reasonChoice === OTHER ? form.otherReason.trim() : form.reasonChoice;
  const isValid =
    Boolean(form.agent?.email) &&
    Number.isInteger(quantity) &&
    quantity >= 1 &&
    quantity <= 100 &&
    reason.length >= 1 &&
    reason.length <= 500;
  const name = form.agent ? fullName(form.agent) : '';
  const what = describe({ quantity, leadType: form.leadType });

  // agentName rides along for the pending notice; the server ignores it
  const { mutate: send, isPending } = useMutation({
    mutationFn: ({ agentName, ...grant }) => giveLeadGrant(grant),
    onSuccess: (_, grant) => {
      enqueueSnackbar(
        `Gave ${grant.agentName} ${describe(grant)}`,
        SNACKBAR_SUCCESS_OPTIONS,
      );
      setPending(null);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ['lead-grants'] });
    },
    onError: (error) => {
      // a 4xx is a final answer and nothing was added, so the grant is
      // dropped and the form kept to fix it. No response or a 5xx is no
      // final answer: the grant stays pending for Retry.
      const status = error?.response?.status;
      if (status >= 400 && status < 500) setPending(null);
      enqueueSnackbar(
        error?.response?.data?.error || 'Could not reach the server',
        SNACKBAR_ERROR_OPTIONS,
      );
    },
    onSettled: () => setConfirming(false),
  });

  // the id is made once, here, and saved before the request goes out
  const give = () => {
    const grant = {
      id: crypto.randomUUID(),
      agentId: form.agent.id,
      agentName: name,
      leadType: form.leadType,
      quantity,
      reason,
    };
    setPending(grant);
    send(grant);
  };

  return (
    <Stack spacing={3}>
      {pending && (
        <Alert
          severity='warning'
          sx={{ maxWidth: 560 }}
          action={
            <Stack direction='row' spacing={1}>
              <Button
                color='inherit'
                size='small'
                disabled={isPending}
                onClick={() => setPending(null)}
              >
                Discard
              </Button>
              <Button
                color='inherit'
                size='small'
                variant='outlined'
                disabled={isPending}
                onClick={() => send(pending)}
              >
                Retry
              </Button>
            </Stack>
          }
        >
          {isPending
            ? `Giving ${pending.agentName} ${describe(pending)}…`
            : `Giving ${pending.agentName} ${describe(pending)} did not finish. Retry is safe: it never adds the leads twice. Discard only if you are sure it is not needed.`}
        </Alert>
      )}

      <Paper variant='outlined' sx={{ p: 2, maxWidth: 560 }}>
        <Typography variant='h6' mb={2}>
          Free Leads
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
          <div>
            <FormLabel>Reason</FormLabel>
            <RadioGroup
              value={form.reasonChoice}
              onChange={(e) => set('reasonChoice')(e.target.value)}
            >
              {[...REASONS, OTHER].map((choice) => (
                <FormControlLabel
                  key={choice}
                  value={choice}
                  control={<Radio size='small' />}
                  label={choice}
                />
              ))}
            </RadioGroup>
            {form.reasonChoice === OTHER && (
              <TextField
                autoFocus
                fullWidth
                size='small'
                placeholder='e.g. 2 leads over age 85'
                value={form.otherReason}
                onChange={(e) => set('otherReason')(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 500 } }}
                sx={{ mt: 0.5 }}
              />
            )}
          </div>
          <Button
            variant='contained'
            disabled={!isValid || isPending || Boolean(pending)}
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
            onClick={give}
            disabled={isPending}
          >
            Give
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant='h6'>Recent free leads</Typography>
      {grantsFailed ? (
        <Alert severity='error'>Could not load the free leads list.</Alert>
      ) : grants.length === 0 ? (
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
