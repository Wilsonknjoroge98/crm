import { Box, CardContent, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPremiumLeaderboard } from '../../utils/query';
import useAuth from '../../hooks/useAuth';

const PremiumLeaderboardTab = () => {
  const { userToken, agent } = useAuth();

  const {
    data: rows,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['premiumLeaderboard'],
    queryFn: () => getPremiumLeaderboard({ token: userToken, agency: agent?.agency }),
  });

  console.log('Premium Leaderboard Data:', rows, isLoading, error);

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography>Error loading premium leaderboard.</Typography>;
  }

  return (
    <Stack elevation={0} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          {rows.map((row, index) => (
            <Box key={row.name}>
              <Stack direction='row' justifyContent='space-between'>
                <Typography fontWeight={500}>
                  {index + 1}. {row.name}
                </Typography>
                <Typography fontWeight={600}>${row.premiumAmount.toLocaleString()}</Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Stack>
  );
};

export default PremiumLeaderboardTab;
