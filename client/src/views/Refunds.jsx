import {
  Alert,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';

import { getRefunds, reviewRefund } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

const MONO = '"JetBrains Mono", monospace';
const COLUMNS = [
  'LEAD',
  'REQUESTED BY',
  'CONTACT GRADE',
  'ACTIVITY SCORE',
  'NAME MATCH',
  '',
];
const HEAD_CELL_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  fontSize: '.75rem',
  letterSpacing: 1,
};

const fullName = (person) =>
  [person?.first_name, person?.last_name].filter(Boolean).join(' ');
// null means trestle was not reachable when the agent asked
const yesNo = (value) =>
  value === true ? 'Yes' : value === false ? 'No' : '—';

const Refunds = () => {
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState(null);

  const {
    data: refunds = [],
    isLoading,
    isError,
  } = useQuery({ queryKey: ['refunds'], queryFn: getRefunds });

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
        mb={3}
      >
        <Typography variant='h4'>Refunds</Typography>
        <Typography variant='body2' color='text.secondary'>
          {refunds.length} pending request{refunds.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      {refunds.length === 0 ? (
        <Alert severity='success'>No refund requests to review.</Alert>
      ) : (
        <TableContainer
          component={Paper}
          variant='outlined'
          sx={{ boxShadow: 0, border: 'none', backgroundColor: 'transparent' }}
        >
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                {COLUMNS.map((col, index) => (
                  <TableCell key={col || index} sx={HEAD_CELL_SX}>
                    {col}
                  </TableCell>
                ))}
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
                    {refund.contact_grade ?? '—'}
                  </TableCell>
                  <TableCell sx={{ fontFamily: MONO }}>
                    {refund.activity_score ?? '—'}
                  </TableCell>
                  <TableCell>{yesNo(refund.name_match)}</TableCell>
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
                        onClick={() =>
                          review({ leadId: refund.id, action: 'deny' })
                        }
                      >
                        Deny
                      </Button>
                    </Stack>
                  </TableCell>
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
