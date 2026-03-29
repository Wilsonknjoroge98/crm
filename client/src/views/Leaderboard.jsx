import {
  Box,
  Typography,
  Stack,
  Container,
  Avatar,
  Skeleton,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPremiumLeaderboard } from '../utils/query';
import { useAgent } from '../hooks/useAgent';
import DateSelector from '../components/DateSelector';
import { stringToColor } from '../utils/helpers';
import dayjs from 'dayjs';
import { useState } from 'react';

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const Leaderboard = () => {
  const agent = useAgent();
  const [startDate, setStartDate] = useState(
    dayjs().add(-7, 'day').format('YYYY-MM-DD'),
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['premiumLeaderboard', startDate, endDate, agent?.org_id],
    queryFn: () =>
      getPremiumLeaderboard({ agency: agent?.org_id, startDate, endDate }),
    enabled: !!agent?.org_id,
  });

  const handleStartChange = (val) =>
    setStartDate(val ? dayjs(val).format('YYYY-MM-DD') : '');
  const handleEndChange = (val) =>
    setEndDate(val ? dayjs(val).format('YYYY-MM-DD') : '');

  return (
    <>
      <Container sx={{ mt: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ sm: 'center' }}
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Leaderboard</Typography>
          <DateSelector
            startDate={startDate}
            endDate={endDate}
            handleStartChange={handleStartChange}
            handleEndChange={handleEndChange}
            refetchFunction={refetch}
            isLoading={isLoading}
          />
        </Stack>

        {isLoading && (
          <Stack spacing={2} mt={4}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant='rounded' height={64} />
            ))}
          </Stack>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Box sx={{ width: '100%', maxWidth: 900 }}>
            <Stack spacing={2}>
              {rows.map((row, index) => {
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
                    <Stack
                      direction='row'
                      alignItems='center'
                      spacing={1.5}
                      sx={{ flexGrow: 1 }}
                    >
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          bgcolor: stringToColor(row.name),
                        }}
                      >
                        {getInitials(row.name)}
                      </Avatar>
                      <Box>
                        <Typography variant='subtitle1' fontWeight={600}>
                          {row.name}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {row.count} Sales
                        </Typography>
                      </Box>
                    </Stack>

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
                          WebkitTextFillColor: isTopThree
                            ? 'transparent'
                            : 'initial',
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

export default Leaderboard;
