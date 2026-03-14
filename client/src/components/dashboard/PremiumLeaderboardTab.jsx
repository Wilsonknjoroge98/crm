import { Box, CardContent, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPremiumLeaderboard } from '../../utils/query';
import { useAgent } from '../../hooks/useAgent';

const PremiumLeaderboardTab = () => {
  const agent = useAgent();

  const {
    data: rows,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['premiumLeaderboard'],
    queryFn: () => getPremiumLeaderboard({ agency: agent?.org_id }),
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
