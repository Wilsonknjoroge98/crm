import { Box, CardContent, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPersistencyRates } from '../../utils/query';
import useAuth from '../../hooks/useAuth';
const PersistencyRateTab = () => {
  const { userToken, agent } = useAuth();
  const {
    data: rows,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['persistencyRate'],
    queryFn: () => getPersistencyRates({ token: userToken, agency: agent?.agency }),
  });
  console.log('Persistency Rate Data:', rows, isLoading, error);

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography>Error loading persistency rates.</Typography>;
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
                    {index + 1}. {row.name}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Active/Pending Policies: {row.activeOrPendingPolicies}
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    Total Policies: {row.totalPolicies}
                  </Typography>
                </Stack>
                <Typography fontWeight={600}>{row.persistencyRate.toLocaleString()}%</Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Stack>
  );
};

export default PersistencyRateTab;
