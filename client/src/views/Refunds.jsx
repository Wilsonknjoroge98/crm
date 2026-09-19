import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Container,
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
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import dayjs from 'dayjs';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { getRefunds, reviewRefund } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

const MONO = '"JetBrains Mono", monospace';
const HEAD_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: '.75rem',
  letterSpacing: 1,
};

// Every outcome is terminal, so a lead has at most one review cycle — these
// tabs are the complete history, not just a rolling window of it.
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

const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ');
// null means trestle was not reachable when the agent asked
const yesNo = (value) =>
  value === true ? 'Yes' : value === false ? 'No' : '—';
const formatDate = (value) => (value ? dayjs(value).format('MMM D, YYYY') : '—');

const Refunds = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('requested');
  const [pendingId, setPendingId] = useState(null);
  const isPendingTab = status === 'requested';

  const {
    data: refunds = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['refunds', status],
    queryFn: () => getRefunds({ status }),
  });

  const { mutate: review } = useMutation({
    mutationFn: reviewRefund,
    onMutate: ({ leadId }) => setPendingId(leadId),
    onSuccess: (_, { action }) => {
      enqueueSnackbar(
        action === 'approve'
          ? 'Refund approved, agent credited one unverified lead'
          : 'Refund denied',
        SNACKBAR_SUCCESS_OPTIONS,
      );
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
      // the card button reads refund_status from the business list
      queryClient.invalidateQueries({ queryKey: ['business'] });
    },
    onError: (error, { action }) =>
      enqueueSnackbar(
        error?.response?.data?.error || `Failed to ${action} refund`,
        SNACKBAR_ERROR_OPTIONS,
      ),
    onSettled: () => setPendingId(null),
  });

  // Denial is permanent — no re-request — so the reason is worth asking
  // for; it's the only explanation the agent (and this history view) ever
  // gets.
  const handleDeny = (refund) => {
    const reason = window.prompt(
      `Deny the refund request for ${fullName(refund) || 'this lead'}? This cannot be undone — the agent will not be able to request it again. Optionally add a reason (shown to the agent).`,
    );
    if (reason === null) return;
    review({ leadId: refund.id, action: 'deny', reason: reason || undefined });
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
          Failed to load refund requests. Please refresh or try again later.
        </Alert>
      </Stack>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 6 }}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        mb={1}
      >
        <Typography variant='h4'>Refunds</Typography>
        <Typography variant='body2' color='text.secondary'>
          {refunds.length} {isPendingTab ? 'pending' : ''} result
          {refunds.length !== 1 ? 's' : ''}
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

      {refunds.length === 0 ? (
        <Alert severity={isPendingTab ? 'success' : 'info'}>
          {isPendingTab
            ? 'No refund requests to review.'
            : 'No refund requests found for this filter.'}
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
                <TableCell sx={HEAD_CELL_SX}>LEAD</TableCell>
                <TableCell sx={HEAD_CELL_SX}>REQUESTED BY</TableCell>
                <TableCell sx={HEAD_CELL_SX}>REQUESTED</TableCell>
                <TableCell sx={HEAD_CELL_SX}>CONTACT GRADE</TableCell>
                <TableCell sx={HEAD_CELL_SX}>ACTIVITY SCORE</TableCell>
                <TableCell sx={HEAD_CELL_SX}>NAME MATCH</TableCell>
                {!isPendingTab && (
                  <>
                    <TableCell sx={HEAD_CELL_SX}>STATUS</TableCell>
                    <TableCell sx={HEAD_CELL_SX}>REVIEWED</TableCell>
                  </>
                )}
                {isPendingTab && <TableCell sx={HEAD_CELL_SX} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {refunds.map((refund) => (
                <TableRow
                  key={refund.id}
                  hover
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  <TableCell>
                    <Typography variant='subtitle2' fontWeight={600}>
                      {fullName(refund) || '—'}
                    </Typography>
                    <Typography variant='caption' sx={{ fontFamily: MONO }}>
                      {refund.email || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {fullName(refund.requested_by) ||
                      refund.requested_by?.email ||
                      'Unknown agent'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>
                    {formatDate(refund.refund_requested_at)}
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>
                    {refund.contact_grade ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>
                    {refund.activity_score ?? '—'}
                  </TableCell>
                  <TableCell>{yesNo(refund.name_match)}</TableCell>
                  {!isPendingTab && (
                    <>
                      <TableCell>
                        <Tooltip
                          title={
                            refund.refund_status === 'denied' &&
                            refund.refund_denial_reason
                              ? `Reason: ${refund.refund_denial_reason}`
                              : ''
                          }
                        >
                          <Chip
                            size='small'
                            label={refund.refund_status}
                            color={STATUS_CHIP_COLOR[refund.refund_status]}
                            variant='outlined'
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2'>
                          {formatDate(refund.refund_reviewed_at)}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {fullName(refund.reviewed_by) ||
                            refund.reviewed_by?.email ||
                            '—'}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                  {isPendingTab && (
                    <TableCell align='right'>
                      <Stack
                        direction='row'
                        spacing={1}
                        justifyContent='flex-end'
                      >
                        <Button
                          size='small'
                          variant='contained'
                          startIcon={<CheckCircleOutlinedIcon />}
                          disabled={pendingId === refund.id}
                          onClick={() =>
                            review({ leadId: refund.id, action: 'approve' })
                          }
                        >
                          Approve
                        </Button>
                        <Button
                          size='small'
                          color='error'
                          startIcon={<BlockOutlinedIcon />}
                          disabled={pendingId === refund.id}
                          onClick={() => handleDeny(refund)}
                        >
                          Deny
                        </Button>
                      </Stack>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default Refunds;
