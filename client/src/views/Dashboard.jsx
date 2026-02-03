import { Box, Grid, Typography, Divider, Container, Stack, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPremiumLeaderboard } from '../utils/query';
import useAuth from '../hooks/useAuth';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useState } from 'react';
import { MoonLoader } from 'react-spinners';

const Dashboard = () => {
  const { userToken, agent } = useAuth();
  const [startDate, setStartDate] = useState(dayjs().add(-7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const {
    data: rows,
    isLoading,
    isPending,
    error,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ['premiumLeaderboard'],
    queryFn: () =>
      getPremiumLeaderboard({ token: userToken, agency: agent?.agency, startDate, endDate }),
  });

  console.log({ rows, isLoading, error, startDate, endDate });

  const handleStartChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setStartDate(formatted);
  };

  const handleEndChange = (newValue) => {
    const formatted = newValue ? dayjs(newValue).format('YYYY-MM-DD') : '';
    setEndDate(formatted);
  };

  return (
    <>
      <Container sx={{ mt: 4 }}>
        <Stack direction={'column'} justifyContent='space-between' spacing={2} mb={2}>
          <Typography variant='h4'>Leaderboard</Typography>
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
                onClick={() => refetchLeaderboard()}
                sx={isLoading ? { opacity: 0.3 } : {}}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </Box>
          </LocalizationProvider>
        </Stack>
        {(isLoading || isPending) && (
          <Stack
            sx={{
              width: '100%',
              height: '100%',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
            }}
          >
            <MoonLoader />
          </Stack>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Box sx={{ width: '100%', maxWidth: 900 }}>
            <Stack spacing={2}>
              {rows?.map((row, index) => {
                const isTopThree = index < 3;

                return (
                  <Box
                    key={row.name}
                    sx={{
                      position: 'relative',
                      borderRadius: 2,
                      px: 3,
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isTopThree
                        ? 'linear-gradient(135deg, rgba(33,150,243,0.12), rgba(156,39,176,0.12))'
                        : 'background.paper',
                      borderColor: isTopThree ? 'primary.light' : 'divider',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    {/* Rank */}
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: 16,
                        mr: 2,
                        background: isTopThree
                          ? 'linear-gradient(135deg, #1976d2, #9c27b0)'
                          : 'grey.200',
                        color: isTopThree ? '#fff' : 'text.primary',
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </Box>

                    {/* Agent Info */}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant='subtitle1' fontWeight={600}>
                        {row.name}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {row.count} Sales
                      </Typography>
                    </Box>

                    {/* Premium */}
                    <Stack alignItems='flex-end' spacing={0.5}>
                      <Typography
                        variant={isTopThree ? 'h6' : 'subtitle1'}
                        fontWeight={700}
                        sx={{
                          background: isTopThree
                            ? 'linear-gradient(135deg, #1976d2, #9c27b0)'
                            : 'none',
                          WebkitBackgroundClip: isTopThree ? 'text' : 'initial',
                          WebkitTextFillColor: isTopThree ? 'transparent' : 'initial',
                        }}
                      >
                        ${row.premiumAmount.toLocaleString()}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Total Premium
                      </Typography>
                    </Stack>

                    {/* Subtle accent bar */}
                    {isTopThree && (
                      <Box
                        sx={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          borderRadius: '4px 0 0 4px',
                          background:
                            index === 0
                              ? 'linear-gradient(#FFD700, #FFA000)'
                              : index === 1
                                ? 'linear-gradient(#C0C0C0, #9E9E9E)'
                                : 'linear-gradient(#CD7F32, #8D5524)',
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </Container>
    </>
  );
};

export default Dashboard;
