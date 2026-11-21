import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Tooltip,
  Typography,
} from '@mui/material';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import dayjs from 'dayjs';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { getAgents, getLeadGrants, giveLeadGrant } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

// Free leads an admin gives an agent: review bounties, make-goods for bad
// leads, comps, the owner's own use. The server records the grant, then
// credits the agent's GSQ ledger the same way a purchase does.

const MONO = '"JetBrains Mono", monospace';
const HEAD_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: '.75rem',
  letterSpacing: 1,
};

const COUNT_SX = { width: { xs: '100%', sm: 220 } };

// the server's limit (endpoints/lead_grants.js)
const MAX_QUANTITY = 100;
const MAX_NOTE_LENGTH = 500;

const PRODUCTS = [
  { value: 'web', label: 'GSQ Web leads' },
  { value: 'instant_form', label: 'GSQ Instant Form leads' },
  { value: 'live_transfer', label: 'GSQ Live Transfers' },
];
const REASONS = [
  { value: 'review_bounty', label: 'Review bounty' },
  { value: 'bad_lead_make_good', label: 'Bad lead make-good' },
  { value: 'comp', label: 'Comp' },
  { value: 'owner_use', label: 'Owner use' },
  { value: 'other', label: 'Other' },
];
const REASON_LABEL = Object.fromEntries(REASONS.map((r) => [r.value, r.label]));
const STATUS_TOOLTIP = {
  failed: (error) => `GSQ refused it, nothing was credited: ${error}`,
  pending: (error) =>
    `Not confirmed${error ? ` (${error})` : ''}. Check the agent's GSQ ` +
    'balance before giving these again.',
};
const STATUS_CHIP_COLOR = {
  credited: 'success',
  pending: 'warning',
  failed: 'error',
};

const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ');
const formatDate = (value) =>
  value ? dayjs(value).format('MMM D, YYYY h:mm A') : '—';
const plural = (n, word) => `${word}${n === 1 ? '' : 's'}`;

// "2 verified GSQ Web leads", "2 verified and 1 unverified GSQ Web leads",
// "3 GSQ Instant Form leads", "1 GSQ Live Transfer"
const describeGrant = ({ product, verified = 0, unverified = 0, quantity }) => {
  if (product === 'web') {
    const total = verified + unverified;
    const parts = [];
    if (verified) parts.push(`${verified} verified`);
    if (unverified) parts.push(`${unverified} unverified`);
    return `${parts.join(' and ') || '0'} GSQ Web ${plural(total, 'lead')}`;
  }
  if (product === 'instant_form') {
    return `${quantity} GSQ Instant Form ${plural(quantity, 'lead')}`;
  }
  return `${quantity} GSQ Live ${plural(quantity, 'Transfer')}`;
};

// blank is 0 (only the web split uses it); anything else must be a whole
// number from 0 to the limit, or the result is NaN
const parseCount = (value) => {
  if (value === '' || value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= MAX_QUANTITY ? n : NaN;
};

// A UUID v4 for the grant's request id. randomUUID needs a secure page, so
// fall back to getRandomValues (and Math.random as a last resort).
const newRequestId = () => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else bytes.forEach((_, i) => (bytes[i] = Math.floor(Math.random() * 256)));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10, 16),
  ]
    .map((part) => part.join(''))
    .join('-');
};

// True when the server answered that nothing was recorded or credited, so a
// retry may safely be a new grant. No answer at all, a 5xx whose outcome is
// unknown, or a duplicate means the first attempt may have gone through.
const nothingRecorded = (error) => {
  const response = error?.response;
  if (!response) return false;
  if (response.data?.data?.status === 'failed') return true;
  return (
    response.status >= 400 && response.status < 500 && !response.data?.duplicate
  );
};

const hasEmail = (agent) => Boolean(agent?.email?.trim());

const EMPTY_FORM = {
  agent: null,
  product: 'web',
  verified: '',
  unverified: '',
  count: '',
  reason: '',
  note: '',
};

const LeadGrants = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirming, setConfirming] = useState(null);
  // One request id per filled-in form, kept across retries so a retry of a
  // grant that may already have gone through is refused by the server
  // instead of crediting twice. A new id once any field changes, or after
  // the server confirmed nothing was recorded.
  const [requestId, setRequestId] = useState(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const {
    data: grants = [],
    isLoading: grantsLoading,
    isError: grantsError,
  } = useQuery({
    queryKey: ['lead-grants'],
    queryFn: () => getLeadGrants(),
  });

  const set = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setRequestId(null);
  };

  const isWeb = form.product === 'web';
  const verified = parseCount(form.verified);
  const unverified = parseCount(form.unverified);
  const count = parseCount(form.count);
  const quantity = isWeb ? verified + unverified : count;
  const countsValid =
    Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;
  const note = form.note.trim();
  const canSubmit =
    Boolean(form.agent?.id) &&
    hasEmail(form.agent) &&
    countsValid &&
    Boolean(form.reason) &&
    note.length > 0 &&
    note.length <= MAX_NOTE_LENGTH;

  const { mutate: give, isPending: isGiving } = useMutation({
    mutationFn: giveLeadGrant,
    onSuccess: (result) => {
      if (result?.warning) {
        enqueueSnackbar(result.warning, SNACKBAR_ERROR_OPTIONS);
      } else {
        enqueueSnackbar(
          `Gave ${confirming?.summary || 'the free leads'}`,
          SNACKBAR_SUCCESS_OPTIONS,
        );
      }
      setConfirming(null);
      setForm(EMPTY_FORM);
      setRequestId(null);
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.error || 'Failed to give free leads',
        SNACKBAR_ERROR_OPTIONS,
      );
      if (nothingRecorded(error)) setRequestId(null);
      setConfirming(null);
    },
    // a failed grant is recorded too, so the table refreshes either way
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['lead-grants'] }),
  });

  const openConfirm = () => {
    if (!canSubmit) return;
    const id = requestId || newRequestId();
    setRequestId(id);
    const name = fullName(form.agent) || form.agent.email;
    const what = describeGrant({
      product: form.product,
      verified: isWeb ? verified : 0,
      unverified: isWeb ? unverified : 0,
      quantity,
    });
    setConfirming({
      summary: `${name} ${what}`,
      body: {
        requestId: id,
        agentId: form.agent.id,
        product: form.product,
        ...(isWeb ? { verified, unverified } : { count }),
        reason: form.reason,
        note,
      },
    });
  };

  return (
    <Stack spacing={3}>
      <Paper variant='outlined' sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant='h6' mb={0.5}>
          Give free leads
        </Typography>
        <Typography variant='body2' color='text.secondary' mb={2}>
          Credits the agent&apos;s GSQ balance and keeps a record of who gave
          what and why. Use this instead of editing balances in Firebase.
        </Typography>

        <Stack spacing={2}>
          <Autocomplete
            options={agents}
            loading={agentsLoading}
            value={form.agent}
            onChange={(_, value) => set('agent')(value)}
            getOptionLabel={(agent) =>
              agent ? `${fullName(agent)} (${agent.email || 'no email'})` : ''
            }
            getOptionDisabled={(agent) => !hasEmail(agent)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField {...params} label='Agent' required />
            )}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label='Product'
              value={form.product}
              onChange={(e) => set('product')(e.target.value)}
              sx={{ flex: 1 }}
              required
            >
              {PRODUCTS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label='Reason'
              value={form.reason}
              onChange={(e) => set('reason')(e.target.value)}
              sx={{ flex: 1 }}
              required
            >
              {REASONS.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {isWeb ? (
              <>
                <TextField
                  label='Verified'
                  type='number'
                  value={form.verified}
                  onChange={(e) => set('verified')(e.target.value)}
                  slotProps={{
                    htmlInput: { min: 0, max: MAX_QUANTITY, step: 1 },
                  }}
                  error={Number.isNaN(verified)}
                  sx={COUNT_SX}
                  helperText={`0 to ${MAX_QUANTITY}`}
                />
                <TextField
                  label='Unverified'
                  type='number'
                  value={form.unverified}
                  onChange={(e) => set('unverified')(e.target.value)}
                  slotProps={{
                    htmlInput: { min: 0, max: MAX_QUANTITY, step: 1 },
                  }}
                  error={Number.isNaN(unverified)}
                  sx={COUNT_SX}
                  helperText={
                    verified + unverified > MAX_QUANTITY
                      ? `At most ${MAX_QUANTITY} in total`
                      : `0 to ${MAX_QUANTITY}`
                  }
                />
              </>
            ) : (
              <TextField
                label='Count'
                type='number'
                value={form.count}
                onChange={(e) => set('count')(e.target.value)}
                slotProps={{
                  htmlInput: { min: 1, max: MAX_QUANTITY, step: 1 },
                }}
                error={Number.isNaN(count)}
                sx={COUNT_SX}
                helperText={`1 to ${MAX_QUANTITY}`}
                required
              />
            )}
          </Stack>

          <TextField
            label='Note'
            placeholder='received 2 verified leads over the age of 85'
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
            multiline
            minRows={2}
            required
            error={note.length > MAX_NOTE_LENGTH}
            helperText={`${note.length}/${MAX_NOTE_LENGTH}`}
          />

          <Stack direction='row' justifyContent='flex-end'>
            <Button
              variant='contained'
              startIcon={<CardGiftcardOutlinedIcon />}
              disabled={!canSubmit || isGiving}
              onClick={openConfirm}
            >
              Give leads
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Dialog
        open={Boolean(confirming)}
        onClose={() => !isGiving && setConfirming(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Give free leads?</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Typography variant='body1'>
              Give <strong>{confirming?.summary}</strong>.
            </Typography>
            <Typography variant='body2'>
              Reason: {REASON_LABEL[confirming?.body.reason]}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Note: {confirming?.body.note}
            </Typography>
            <Alert severity='info'>
              The leads are added to the agent&apos;s GSQ balance right away.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)} disabled={isGiving}>
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={isGiving}
            onClick={() => give(confirming.body)}
            startIcon={
              isGiving ? <CircularProgress size={16} color='inherit' /> : null
            }
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      <Typography variant='h6'>Recent free leads</Typography>
      {grantsLoading ? (
        <Stack alignItems='center' sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : grantsError ? (
        <Alert severity='error'>
          Failed to load free leads given. Please refresh or try again later.
        </Alert>
      ) : grants.length === 0 ? (
        <Alert severity='info'>No free leads given yet.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          variant='outlined'
          sx={{ boxShadow: 0, border: 'none', backgroundColor: 'transparent' }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={HEAD_CELL_SX}>DATE</TableCell>
                <TableCell sx={HEAD_CELL_SX}>AGENT</TableCell>
                <TableCell sx={HEAD_CELL_SX}>GIVEN</TableCell>
                <TableCell sx={HEAD_CELL_SX}>REASON</TableCell>
                <TableCell sx={HEAD_CELL_SX}>GIVEN BY</TableCell>
                <TableCell sx={HEAD_CELL_SX}>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grants.map((grant) => (
                <TableRow
                  key={grant.id}
                  hover
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  <TableCell sx={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>
                    {formatDate(grant.created_at)}
                  </TableCell>
                  <TableCell>
                    <Typography variant='subtitle2' fontWeight={600}>
                      {fullName(grant.agent) || '—'}
                    </Typography>
                    <Typography variant='caption' sx={{ fontFamily: MONO }}>
                      {grant.agent_email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {describeGrant({
                      product: grant.product,
                      verified: grant.verified_count,
                      unverified: grant.unverified_count,
                      quantity: grant.quantity,
                    })}
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {REASON_LABEL[grant.reason] || grant.reason}
                    </Typography>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                      sx={{ whiteSpace: 'pre-wrap' }}
                    >
                      {grant.note}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {fullName(grant.granted_by_agent) ||
                      grant.granted_by_agent?.email ||
                      '—'}
                  </TableCell>
                  <TableCell>
                    <Tooltip
                      title={STATUS_TOOLTIP[grant.status]?.(grant.error) || ''}
                    >
                      <Chip
                        size='small'
                        label={grant.status}
                        color={STATUS_CHIP_COLOR[grant.status]}
                        variant='outlined'
                      />
                    </Tooltip>
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
