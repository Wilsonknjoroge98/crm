// AccessRequests.jsx
// Admin queue for the landing page's "Get access" requests. Approving mints
// an invite (the approving admin becomes the new agent's upline, the same
// as pressing "Invite agent") and emails the applicant their sign-up link.
// If that email fails, or to send it again, the link is here to copy.
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import dayjs from 'dayjs';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { getAccessRequests, reviewAccessRequest } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';
import PageContainer from '../components/PageContainer';

const MONO = '"JetBrains Mono", monospace';
const HEAD_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: '.75rem',
  letterSpacing: 1,
};

const TABS = [
  { value: 'requested', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
  { value: 'all', label: 'All' },
];
const STATUS_CHIP_COLOR = {
  requested: 'warning',
  approved: 'success',
  denied: 'error',
};
const STATUS_LABEL = {
  requested: 'pending',
  approved: 'approved',
  denied: 'denied',
};

const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ');
const formatDate = (value) =>
  value ? dayjs(value).format('MMM D, YYYY') : '—';
const formatPhone = (value) =>
  /^\d{10}$/.test(value || '')
    ? `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`
    : value || '—';

const inviteLink = (request) =>
  `${window.location.origin}/signup?token=${request.invite_token}`;

// Opens the admin's own mail app with the invite written out; they press
// send.
const inviteMailto = (request) => {
  const subject = encodeURIComponent('Your FEX Digital invite');
  const body = encodeURIComponent(
    `Hi ${request.first_name},\n\nYou're approved. Use this link to create your FEX Digital account:\n\n${inviteLink(request)}\n\nThe link works for 7 days.\n`,
  );
  return `mailto:${request.email}?subject=${subject}&body=${body}`;
};

const copyInvite = async (request) => {
  try {
    await navigator.clipboard.writeText(inviteLink(request));
    enqueueSnackbar('Invite link copied', SNACKBAR_SUCCESS_OPTIONS);
  } catch {
    enqueueSnackbar('Could not copy the link', SNACKBAR_ERROR_OPTIONS);
  }
};

// Shown right after an approval, and again from the Approved tab.
function InviteDialog({ request, onClose }) {
  if (!request) return null;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Send {request.first_name} their invite</DialogTitle>
      <DialogContent>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          {request.invite_emailed === false
            ? 'Approved, but the invite email could not be sent. '
            : ''}
          This is the sign-up link for {request.email}. It works for 7 days from
          approval, and the form opens with their details filled in.
        </Typography>
        <TextField
          fullWidth
          size='small'
          value={inviteLink(request)}
          inputProps={{ readOnly: true, style: { fontFamily: MONO } }}
          onFocus={(e) => e.target.select()}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button
          startIcon={<ContentCopyOutlinedIcon />}
          onClick={() => copyInvite(request)}
        >
          Copy link
        </Button>
        <Button
          variant='contained'
          startIcon={<MailOutlineIcon />}
          href={inviteMailto(request)}
        >
          Email invite
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const AccessRequests = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('requested');
  const [pendingId, setPendingId] = useState(null);
  const [inviteFor, setInviteFor] = useState(null);
  const isPendingTab = status === 'requested';

  const {
    data: requests = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['access-requests', status],
    queryFn: () => getAccessRequests({ status }),
  });

  const { mutate: review } = useMutation({
    mutationFn: reviewAccessRequest,
    onMutate: ({ id }) => setPendingId(id),
    onSuccess: (request, { action }) => {
      if (action === 'deny') {
        enqueueSnackbar('Request denied', SNACKBAR_SUCCESS_OPTIONS);
      } else if (request.invite_emailed) {
        enqueueSnackbar(
          `Approved. Invite emailed to ${request.email}`,
          SNACKBAR_SUCCESS_OPTIONS,
        );
      } else {
        // Approved, but the email didn't go out: hand over the link.
        setInviteFor(request);
      }
      queryClient.invalidateQueries({ queryKey: ['access-requests'] });
    },
    onError: (error, { action }) =>
      enqueueSnackbar(
        error?.response?.data?.error || `Failed to ${action} request`,
        SNACKBAR_ERROR_OPTIONS,
      ),
    onSettled: () => setPendingId(null),
  });

  const handleDeny = (request) => {
    const reason = window.prompt(
      `Deny the access request from ${fullName(request) || request.email}? This cannot be undone, and they are not notified. Optionally add a reason (kept for your records).`,
    );
    if (reason === null) return;
    review({ id: request.id, action: 'deny', reason: reason || undefined });
  };

  if (isLoading) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (isError) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
        <Alert severity='error'>
          Failed to load access requests. Please refresh or try again later.
        </Alert>
      </Stack>
    );
  }

  return (
    <PageContainer>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        mb={1}
      >
        <Typography variant='h4'>Access Requests</Typography>
        <Typography variant='body2' color='text.secondary'>
          {requests.length} {isPendingTab ? 'pending' : ''} result
          {requests.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      <Tabs
        value={status}
        onChange={(_, value) => setStatus(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </Tabs>

      {requests.length === 0 ? (
        <Alert severity={isPendingTab ? 'success' : 'info'}>
          {isPendingTab
            ? 'No access requests to review.'
            : 'No access requests found for this filter.'}
        </Alert>
      ) : (
        <TableContainer
          component={Paper}
          variant='outlined'
          sx={{ boxShadow: 0, border: 'none', backgroundColor: 'transparent' }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell sx={HEAD_CELL_SX}>AGENT</TableCell>
                <TableCell sx={HEAD_CELL_SX}>PHONE</TableCell>
                <TableCell sx={HEAD_CELL_SX}>NPN</TableCell>
                <TableCell sx={HEAD_CELL_SX}>LICENSED STATES</TableCell>
                <TableCell sx={HEAD_CELL_SX}>REQUESTED</TableCell>
                {!isPendingTab && (
                  <>
                    <TableCell sx={HEAD_CELL_SX}>STATUS</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>REVIEWED</TableCell>
                  </>
                )}
                <TableCell sx={HEAD_CELL_SX} />
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((request) => (
                <TableRow
                  key={request.id}
                  hover
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant='subtitle2' fontWeight={600}>
                      {fullName(request) || '—'}
                    </Typography>
                    <Typography variant='caption' sx={{ fontFamily: MONO }}>
                      {request.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>
                    {formatPhone(request.phone)}
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>{request.npn}</TableCell>
                  <TableCell sx={{ maxWidth: 260 }}>
                    {(request.states || []).join(', ') || '—'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO, whiteSpace: 'nowrap' }}>
                    {formatDate(request.created_at)}
                  </TableCell>
                  {!isPendingTab && (
                    <>
                      <TableCell>
                        <Tooltip
                          title={
                            request.status === 'denied' && request.denial_reason
                              ? `Reason: ${request.denial_reason}`
                              : ''
                          }
                        >
                          <Chip
                            size='small'
                            label={STATUS_LABEL[request.status]}
                            color={STATUS_CHIP_COLOR[request.status]}
                            variant='outlined'
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {formatDate(request.reviewed_at)}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {fullName(request.reviewed_by) ||
                            request.reviewed_by?.email ||
                            '—'}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                  <TableCell align='right'>
                    {request.status === 'requested' && (
                      <Stack
                        direction='row'
                        spacing={1}
                        justifyContent='flex-end'
                      >
                        <Button
                          size='small'
                          variant='contained'
                          startIcon={<CheckCircleOutlinedIcon />}
                          disabled={pendingId === request.id}
                          onClick={() =>
                            review({ id: request.id, action: 'approve' })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          startIcon={<BlockOutlinedIcon />}
                          disabled={pendingId === request.id}
                          onClick={() => handleDeny(request)}
                        >
                          Deny
                        </Button>
                      </Stack>
                    )}
                    {request.status === 'approved' && request.invite_token && (
                      <Button
                        size='small'
                        onClick={() => setInviteFor(request)}
                      >
                        Invite link
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <InviteDialog request={inviteFor} onClose={() => setInviteFor(null)} />
    </PageContainer>
  );
};

export default AccessRequests;
