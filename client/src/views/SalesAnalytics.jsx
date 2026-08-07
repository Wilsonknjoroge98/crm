import { useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getSalesAnalytics } from '../utils/query';

const MONO = '"JetBrains Mono", monospace';
const SANS = '"Inter", sans-serif';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value) => currency.format(Number(value) || 0);
const formatPercent = (value) => `${(Number(value) || 0).toFixed(1)}%`;

// [label, start, end] relative to today.
const PRESETS = [
  ['Today', () => [dayjs(), dayjs()]],
  ['Last 7 Days', () => [dayjs().subtract(6, 'day'), dayjs()]],
  ['This Month', () => [dayjs().startOf('month'), dayjs()]],
  [
    'Last Month',
    () => [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ],
  ],
];

const MetricCard = ({ label, value, valueColor, isLoading }) => (
  <Paper
    variant='outlined'
    sx={{ flex: 1, p: 2, borderRadius: 2, borderColor: 'divider' }}
  >
    <Typography
      variant='caption'
      sx={{
        fontFamily: SANS,
        fontWeight: 700,
        color: 'text.secondary',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'block',
      }}
    >
      {label}
    </Typography>
    {isLoading ? (
      <Skeleton variant='text' width='60%' height={34} sx={{ mt: 0.5 }} />
    ) : (
      <Typography
        variant='h5'
        sx={{ fontFamily: MONO, fontWeight: 700, mt: 0.5, color: valueColor }}
      >
        {value}
      </Typography>
    )}
  </Paper>
);

const monoCell = (formatter) => (params) => (
  <Box component='span' sx={{ fontFamily: MONO }}>
    {formatter(params.value)}
  </Box>
);

const SalesAnalytics = () => {
  const [range, setRange] = useState(() => [
    dayjs().startOf('month'),
    dayjs(),
  ]);
  // Tracked rather than derived: presets can resolve to identical ranges
  // (early in a month "This Month" and "Last 7 Days" are the same window).
  const [activePreset, setActivePreset] = useState('This Month');
  const [startDate, endDate] = range;

  const applyPreset = (label, getRange) => {
    setRange(getRange());
    setActivePreset(label);
  };

  const applyDate = (next) => {
    setRange(next);
    setActivePreset(null);
  };

  const params = {
    startDate: startDate?.isValid() ? startDate.format('YYYY-MM-DD') : null,
    endDate: endDate?.isValid() ? endDate.format('YYYY-MM-DD') : null,
  };

  // isFetching so skeletons show on every load, including refetches after a
  // date or preset change, rather than lingering on the previous numbers. It
  // is false while the query is disabled, so a mid-edit date won't stick.
  const { data, isFetching, error } = useQuery({
    queryKey: ['salesAnalytics', params.startDate, params.endDate],
    queryFn: () => getSalesAnalytics(params),
    enabled: Boolean(params.startDate && params.endDate),
  });

  const columns = [
    { field: 'name', headerName: 'Product Name', minWidth: 220, flex: 1 },
    {
      field: 'baseUnitPrice',
      headerName: 'Base Unit Price',
      minWidth: 140,
      renderCell: monoCell(formatCurrency),
    },
    {
      field: 'volume',
      headerName: 'Volume Sold',
      minWidth: 130,
      renderCell: monoCell((value) => Number(value || 0).toLocaleString()),
    },
    {
      field: 'revenue',
      headerName: 'Gross Revenue',
      minWidth: 150,
      renderCell: monoCell(formatCurrency),
    },
    {
      field: 'avgUnitPrice',
      headerName: 'Avg Unit Price',
      minWidth: 140,
      renderCell: monoCell(formatCurrency),
    },
    {
      field: 'revenueShare',
      headerName: '% of Revenue',
      minWidth: 130,
      renderCell: monoCell(formatPercent),
    },
  ];

  const totals = data?.totals;

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant='h4'>Sales Analytics</Typography>
          <Typography color='text.secondary'>
            Lead sales by product, straight from Stripe.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ md: 'center' }}
        >
          <Stack direction='row' spacing={1} flexWrap='wrap'>
            {PRESETS.map(([label, getRange]) => (
              <Chip
                key={label}
                label={label}
                size='small'
                onClick={() => applyPreset(label, getRange)}
                color={activePreset === label ? 'primary' : 'default'}
                sx={{ fontFamily: SANS, fontWeight: 700 }}
              />
            ))}
          </Stack>
          <Stack direction='row' spacing={1.5}>
            <DatePicker
              label='Start'
              value={startDate}
              maxDate={endDate}
              onChange={(value) => applyDate([value, endDate])}
              slotProps={{ textField: { size: 'small' } }}
            />
            <DatePicker
              label='End'
              value={endDate}
              minDate={startDate}
              onChange={(value) => applyDate([startDate, value])}
              slotProps={{ textField: { size: 'small' } }}
            />
          </Stack>
        </Stack>

        {error && (
          <Alert severity='error'>Failed to load sales analytics.</Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <MetricCard
            label='Total Gross Revenue'
            value={formatCurrency(totals?.grossRevenue)}
            valueColor='success.main'
            isLoading={isFetching}
          />
          <MetricCard
            label='Average Order Value'
            value={formatCurrency(totals?.averageOrderValue)}
            valueColor='primary.main'
            isLoading={isFetching}
          />
          <MetricCard
            label='Unique Customers'
            value={Number(totals?.uniqueCustomers || 0).toLocaleString()}
            valueColor='primary.main'
            isLoading={isFetching}
          />
          <MetricCard
            label='Repeat Buyer Rate'
            value={formatPercent(totals?.repeatBuyerRate)}
            valueColor='action.main'
            isLoading={isFetching}
          />
        </Stack>

        <Paper variant='outlined' sx={{ borderRadius: 2, borderColor: 'divider' }}>
          <DataGrid
            rows={data?.products || []}
            columns={columns}
            getRowId={(row) => row.key}
            loading={isFetching}
            hideFooter
            disableRowSelectionOnClick
            autoHeight
          />
        </Paper>
      </Stack>
    </Container>
  );
};

export default SalesAnalytics;
