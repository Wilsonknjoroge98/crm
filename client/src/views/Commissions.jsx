import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCommissions } from '../utils/query';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Box,
  List,
  ListItem,
  Stack,
  Avatar,
  Divider,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import useAuth from '../hooks/useAuth';
import { useEffect } from 'react';

const Commissions = () => {
  const [startDate, setStartDate] = useState(dayjs('2025-07-15').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [totalCommissions, setTotalCommissions] = useState(0);

  const { userToken } = useAuth();
  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['commissions'],
    queryFn: () =>
      getCommissions({
        token: userToken,
        startDate,
        endDate,
      }),
    onSuccess: (data) => {
      console.log('Commissions data fetched successfully:', data);
    },
    onError: (error) => {
      console.error('Error fetching commissions data:', error);
    },
  });

  const handleStartChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setStartDate(formatted);
    if (onChange) onChange({ startDate: formatted, endDate });
  };

  const handleEndChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setEndDate(formatted);
    if (onChange) onChange({ startDate, endDate: formatted });
  };

  useEffect(() => {
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    setTotalCommissions(total);
  }, [data]); // Refetch when dates change

  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);

  return (
    <Container sx={{ mt: 4 }}>
      <Stack justifyContent='space-between' spacing={2} mb={2}>
        <Typography variant='h4'> Commissions</Typography>
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
              disabled={isLoading}
            >
              Refresh
            </Button>
          </Box>
        </LocalizationProvider>
      </Stack>
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
          <Box>
            {isLoading ? (
              <Stack spacing={2}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Box key={i}>
                    <Skeleton variant='rectangular' height={40} />
                  </Box>
                ))}
              </Stack>
            ) : (
              <List disablePadding>
                {Object.entries(data).map(([key, value], index) => (
                  <Box key={key}>
                    <ListItem
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        px: 0,
                        py: 1,
                      }}
                    >
                      <Stack direction='row' spacing={2} alignItems='center'>
                        <Box>
                          <Typography variant='subtitle1' fontWeight={500}>
                            {key}
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                        $
                        {value.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Typography>
                    </ListItem>

                    {index < Object.keys(data).length - 1 && <Divider sx={{ my: 0.5 }} />}
                  </Box>
                ))}
              </List>
            )}
          </Box>
          <Stack direction={'row'} justifyContent='space-between' alignItems='center' mt={2}>
            <Typography mt={2} variant='subtitle1' fontWeight={600}>
              Total Commissions
            </Typography>
            <Typography
              p={1}
              mt={2}
              borderRadius={1}
              textAlign='right'
              width={'fit-content'}
              sx={{ backgroundColor: 'success.main' }}
              fontWeight={600}
            >
              $
              {totalCommissions.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Commissions;
