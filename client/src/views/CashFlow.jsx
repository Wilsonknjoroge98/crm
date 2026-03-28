import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Divider,
  Stack,
  Container,
  TextField,
  Button,
  IconButton,
  Skeleton,
} from '@mui/material';

import { useState, useEffect } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCommissions,
  getStripeCharges,
  getAdSpend,
  getAllExpenses,
  postExpense,
  deleteExpense,
} from '../utils/query';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import { toTitleCase } from '../utils/helpers';

import { Add as AddIcon } from '@mui/icons-material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';

const CashFlowSummary = () => {
  const queryClient = useQueryClient();
  const [inflow, setInflow] = useState({
    totalCommissions: 5000,
    directCommissions: 3000,
    overridingCommissions: 0,
    leadPurchases: 2000,
  });
  const [expenses, setExpenses] = useState([
    { name: 'Meta Ads', amount: 1000 },
  ]);
  const [adSpend, setAdSpend] = useState(0);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [startDate, setStartDate] = useState(
    dayjs().add(-30, 'day').format('YYYY-MM-DD'),
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [expenseDate, setExpenseDate] = useState(dayjs().format('YYYY-MM-DD'));

  const handleStartChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setStartDate(formatted);
  };

  const handleEndChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setEndDate(formatted);
  };

  const { mutate: addExpense } = useMutation({
    mutationFn: postExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const { mutate: destroyExpense } = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  const {
    data: commissionsData = {},
    refetch: refetchCommissions,
    isLoading: isCommissionsLoading,
    isFetching: isCommissionsFetching,
  } = useQuery({
    queryKey: ['commissions'],
    staleTime: 1000 * 60 * 5,
    queryFn: () =>
      getCommissions({
        startDate,
        endDate,
      }),

    onError: (error) => {
      console.error('Error fetching commissions data:', error);
    },
  });

  console.log('Commissions data:', commissionsData);

  const {
    data: expensesData = [],
    isLoading: isExpensesLoading,
    isFetching: isExpensesFetching,
    refetch: refetchExpenses,
  } = useQuery({
    queryKey: ['expenses'],
    queryFn: () =>
      getAllExpenses({
        startDate,
        endDate,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: stripeData = [],
    isLoading: isStripeLoading,
    isFetching: isStripeFetching,
    refetch: refetchStripe,
  } = useQuery({
    queryKey: ['stripe'],
    queryFn: () =>
      getStripeCharges({
        startDate,
        endDate,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: adSpendData = [],
    isLoading: isAdSpendLoading,
    isFetching: isAdSpendFetching,
    refetch: refetchAdSpend,
  } = useQuery({
    queryKey: ['adSpend'],
    queryFn: () =>
      getAdSpend({
        startDate,
        endDate,
      }),
    staleTime: 1000 * 60 * 5,
  });

  const isLoading =
    isCommissionsLoading ||
    isExpensesLoading ||
    isStripeLoading ||
    isAdSpendLoading;

  useEffect(() => {
    if (commissionsData) {
      setInflow((prev) => ({
        ...prev,
        totalCommissions: commissionsData?.total || 0,
        directCommissions: commissionsData?.direct || 0,
        overridingCommissions: commissionsData?.overriding || 0,
      }));
    }
  }, [commissionsData]);

  useEffect(() => {
    if (stripeData) {
      const stripeCharges = stripeData.total || 0;
      console.log('Total stripe charges fetched:', stripeCharges);
      setInflow((prev) => ({
        ...prev,
        leadPurchases: stripeCharges,
      }));
    }
  }, [stripeData]);

  useEffect(() => {
    if (adSpendData) {
      const totalAdSpend = adSpendData.total || 0;
      setAdSpend(totalAdSpend);
    }
  }, [adSpendData]);

  useEffect(() => {
    console.log('Expenses data changed:', expensesData);
    if (expensesData && Array.isArray(expensesData)) {
      const sortedExpenses = [...expensesData].sort(
        (a, b) => b?.amount - a?.amount,
      );
      setExpenses(sortedExpenses);
    }
  }, [expensesData]);

  const handleAddExpense = () => {
    if (expenseName && expenseAmount && expenseDate) {
      addExpense({
        name: expenseName,
        amount: Number(expenseAmount),
        date: expenseDate,
      });
      setExpenseName('');
      setExpenseAmount('');
      setExpenseDate('');
    }
  };

  const handleDeleteExpense = (expenseId) => {
    destroyExpense({
      expenseId,
    });
  };

  const totalInflow =
    (inflow?.totalCommissions || 0) + (inflow?.leadPurchases || 0);
  const totalExpenses =
    expenses.reduce((sum, e) => sum + e.amount, 0) + adSpend;
  const netCashFlow = totalInflow - totalExpenses;

  return (
    <Container sx={{ mt: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'column' }}
        justifyContent='space-between'
        spacing={2}
        mb={2}
      >
        <Typography variant='h4'>Cash Flow</Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Box
            display='flex'
            justifyContent='space-between'
            alignItems='center'
          >
            <Stack direction={'row'} spacing={2} alignItems='center'>
              <DatePicker
                label='Start Date'
                value={startDate ? dayjs(startDate) : null}
                onChange={handleStartChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    variant: 'outlined',
                    sx: { minWidth: 150 },
                  },
                }}
              />
              <DatePicker
                label='End Date'
                value={endDate ? dayjs(endDate) : null}
                onChange={handleEndChange}
                slotProps={{
                  textField: {
                    size: 'small',
                    variant: 'outlined',
                    sx: { minWidth: 150 },
                  },
                }}
              />
            </Stack>
            <Button
              variant='contained'
              color='action'
              startIcon={<RefreshIcon />}
              onClick={() =>
                Promise.all([
                  refetchCommissions(),
                  refetchStripe(),
                  refetchAdSpend(),
                  refetchExpenses(),
                ])
              }
              sx={isLoading ? { opacity: 0.3 } : {}}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </Box>
        </LocalizationProvider>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Card
            elevation={0}
            sx={{
              maxWidth: 1200,
              alignSelf: 'center',
              justifySelf: 'center',
              width: '100%',
              boxShadow: 'none',
            }}
          >
            <CardContent>
              <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                Inflows
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Commissions</Typography>
                {isCommissionsLoading || isCommissionsFetching ? (
                  <Skeleton width={80} height={30} />
                ) : (
                  <Typography variant='subtitle1' fontWeight={600}>
                    $
                    {inflow?.totalCommissions?.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                )}
              </Box>
              {!isCommissionsLoading && !isCommissionsFetching && (
                <Box sx={{ pl: 2, mb: 0.5 }}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Typography variant='caption' color='text.secondary'>
                      Direct
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      $
                      {inflow?.directCommissions?.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between' }}
                  >
                    <Typography variant='caption' color='text.secondary'>
                      Override
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      $
                      {inflow?.overridingCommissions?.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Typography>
                  </Box>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Lead Purchases</Typography>
                {isStripeLoading || isStripeFetching ? (
                  <Skeleton width={80} height={30} />
                ) : (
                  <Typography variant='subtitle1' fontWeight={600}>
                    $
                    {inflow?.leadPurchases?.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 1 }} />

              <Typography variant='subtitle1' fontWeight='bold' gutterBottom>
                Outflows
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Meta Ads</Typography>
                {isAdSpendLoading || isAdSpendFetching ? (
                  <Skeleton width={80} height={30} />
                ) : (
                  <Typography variant='subtitle1' fontWeight={600}>
                    $
                    {adSpend.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                )}
              </Box>

              {expenses.map((e, idx) => (
                <Box
                  key={idx}
                  sx={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <Stack direction='row' alignItems='center' spacing={1}>
                    <Typography>{e.name}</Typography>
                    <Typography variant='caption'>
                      {dayjs(e.date).format('MMM D, YYYY')}
                    </Typography>
                    <IconButton
                      aria-label='delete'
                      size='small'
                      onClick={() => handleDeleteExpense(e.id)}
                    >
                      <DeleteIcon fontSize='small' />
                    </IconButton>
                  </Stack>

                  <Typography variant='subtitle1' fontWeight={600}>
                    $
                    {e.amount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Typography>
                </Box>
              ))}

              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                  label='Expense Name'
                  size='small'
                  value={expenseName}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(e) => setExpenseName(toTitleCase(e.target.value))}
                  fullWidth
                />
                <TextField
                  label='Date'
                  type='date'
                  size='small'
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  sx={{ width: 200 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label='Amount'
                  type='number'
                  size='small'
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  sx={{ width: 200 }}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Box>
              <Stack>
                <Button
                  variant='contained'
                  color='action'
                  onClick={handleAddExpense}
                  startIcon={<AddIcon />}
                  disabled={!expenseName || !expenseAmount}
                  sx={{ mt: 2, width: 'fit-content', alignSelf: 'flex-end' }}
                >
                  Add Expense
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Total Inflow:</Typography>
                <Typography variant='subtitle1' fontWeight={600}>
                  $
                  {totalInflow.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography>Total Outflow:</Typography>
                <Typography variant='subtitle1' fontWeight={600}>
                  $
                  {totalExpenses.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='h6'>Net Cash Flow:</Typography>
                <Typography
                  p={1}
                  borderRadius={1}
                  textAlign='right'
                  width={'fit-content'}
                  sx={{
                    backgroundColor: netCashFlow >= 0 ? '#E6F4EA' : '#F8D7DA',
                    color: netCashFlow >= 0 ? '#1E7E34' : '#B02A37',
                  }}
                  fontWeight={600}
                >
                  $
                  {netCashFlow.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
};

export default CashFlowSummary;
