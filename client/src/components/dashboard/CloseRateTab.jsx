import { Box, CardContent, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getCloseRates } from '../../utils/query';
import useAuth from '../../hooks/useAuth';
const CloseRateTab = () => {
  const { userToken, agent } = useAuth();
  const {
    data: rows,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['closeRates'],
    queryFn: () => getCloseRates({ token: userToken, agency: agent?.agency }),
  });
  console.log('Close Rate Data:', rows, isLoading, error);

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography>Error loading close rates.</Typography>;
  }

  return (
    <Stack elevation={0} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          {rows.map((row, index) => (
            <Box key={row.name}>
              <Stack direction='row' justifyContent='space-between'>
                <Stack>
                  <Typography fontWeight={500}>
                    {index + 1}. {row?.name}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Lead Count: {row?.leadCount}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Total Clients: {row?.totalClients}
                  </Typography>
                </Stack>
                <Typography fontWeight={600}>{row.closeRate.toLocaleString()}%</Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Stack>
  );
};

export default CloseRateTab;
