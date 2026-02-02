// Attribution.jsx
import {
  Card,
  CardContent,
  Stack,
  Typography,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Alert,
  Box,
  Divider,
  Container,
  Button,
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import { getInsights } from '../utils/query';
import useAuth from '../hooks/useAuth';

import RefreshIcon from '@mui/icons-material/Refresh';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import { useState } from 'react';

const Insights = () => {
  const [startDate, setStartDate] = useState(dayjs('2025-05-11').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const { user, userToken } = useAuth();

  const { data, isLoading, isError, error, refetch, isFetching, isPending } = useQuery({
    queryKey: ['insights'],
    enabled: !!user?.uid,
    queryFn: () =>
      getInsights({
        token: userToken,
        startDate,
        endDate,
      }),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  console.log('Insights data:', data);

  const handleStartChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setStartDate(formatted);
  };

  const handleEndChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setEndDate(formatted);
  };

  if (isError) {
    return (
      <Alert severity='error' sx={{ mb: 2 }}>
        Failed to load attribution. {error?.message || 'Try again later.'}
      </Alert>
    );
  }

  const columns = [
    { field: 'creative', headerName: 'Creative', flex: 1, minWidth: 300 },
    { field: 'sales', headerName: 'Sales', flex: 1, width: 100 },
    { field: 'leads', headerName: 'Leads', flex: 1, width: 100 },
    {
      field: 'spend',
      headerName: 'Spend',
      flex: 1,
      minWidth: 100,
      sortable: true,
      align: 'left',
      renderCell: (params) => {
        const row = params.row;
        if (row.creative === 'google' || row.creative === 'facebook-organic') {
          return '—';
        }

        const value = params.value;
        return `$${Number(value).toLocaleString()}`;
      },
    },
    {
      field: 'averagePremium',
      headerName: 'Avg. Premium',
      align: 'left',
      flex: 1,
      minWidth: 120,
      sortable: true,
      renderCell: (params) => {
        const value = params.value;
        if (isNaN(value) || value === '0' || value === 0) {
          return '—';
        }
        return `$${Number(value).toLocaleString()}`;
      },
    },
    {
      field: 'cpl',
      headerName: 'Cost Per Lead',
      align: 'left',
      flex: 1,
      minWidth: 100,
      sortable: true,
      renderCell: (params) => {
        const row = params.row;
        if (row.creative === 'google' || row.creative === 'facebook-organic') {
          return '—';
        }

        const value = params.value;
        return `$${Number(value).toLocaleString()}`;
      },
    },
    {
      field: 'cps',
      headerName: 'Cost Per Sale',
      align: 'left',
      flex: 1,
      minWidth: 100,
      sortable: true,
      renderCell: (params) => {
        const row = params.row;
        if (row.creative === 'google' || row.creative === 'facebook-organic') {
          return '—';
        }

        const value = params.value;
        return `$${Number(value).toLocaleString()}`;
      },
    },
  ];

  return (
    <Container sx={{ mt: 4 }}>
      <Container sx={{ mt: 4 }}>
        <Stack justifyContent='space-between' spacing={2} mb={2}>
          <Typography variant='h4'>Creative Insights</Typography>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box display='flex' justifyContent='space-between' alignItems='center'>
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
                onClick={() => refetch()}
                sx={isLoading ? { opacity: 0.3 } : {}}
                disabled={isLoading || isFetching || isPending}
              >
                Refresh
              </Button>
            </Box>
          </LocalizationProvider>
        </Stack>

        <Stack sx={{ minHeight: 600, maxHeight: 800, maxWidth: 1200 }}>
          <DataGrid
            sx={{ border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}
            rows={data?.sources || []}
            rowHeight={60}
            loading={isLoading || isFetching || isPending}
            getRowId={(row) => row.id}
            columns={columns}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              sorting: { sortModel: [{ field: 'spend', sort: 'desc' }] },
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
          />
        </Stack>
      </Container>
      {/* <Cards
        sx={{
          maxWidth: '100%',
          alignSelf: 'center',
          justifySelf: 'center',
          width: '100%',
          boxShadow: 0,
        }}
      >
        <Alert severity='info'>
          Excludes clients with no source specified ({unknownClients} client
          {unknownClients === 1 ? '' : 's'})
        </Alert>
        <CardContent>
          {isLoading && (
            <Stack spacing={2}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i}>
                  <Skeleton variant='rectangular' height={40} />
                </Box>
              ))}
            </Stack>
          )}

          {!isLoading && sources.length === 0 && (
            <Typography variant='body2' color='text.secondary'>
              No clients yet—once clients are created with a <em>source</em>, the leaderboard will
              populate.
            </Typography>
          )}

          {!isLoading && sources.length > 0 && (
            <List disablePadding>
              {sources.map(({ name, count, pct }, idx) => (
                <Box key={name}>
                  <ListItem disableGutters>
                    <ListItemText
                      primary={
                        <Stack direction='row' alignItems='center' spacing={1}>
                          <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            {idx + 1}. {name}
                          </Typography>
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                          <Stack direction='row' justifyContent='space-between'>
                            <Typography variant='caption' color='text.secondary'>
                              {count} client{count === 1 ? '' : 's'}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {pct}%
                            </Typography>
                          </Stack>
                        </Stack>
                      }
                    />
                  </ListItem>
                  {idx !== sources.length - 1 && <Divider component='li' />}
                </Box>
              ))}
            </List>
          )}
        </CardContent>
      </Cards> */}
    </Container>
  );
};

export default Insights;
