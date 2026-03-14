import { Box, CardContent, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPremiumPerLead } from '../../utils/query';
import { useAgent } from '../../hooks/useAgent';

const PremiumPerLeadTab = ({ rows }) => {
  const agent = useAgent();

  const { data, isLoading, error } = useQuery({
    queryKey: ['premiumPerLead'],
    queryFn: () => getPremiumPerLead({ agency: agent?.org_id }),
  });

  console.log('Premium Per Lead Data:', data, isLoading, error);

  if (data) {
    console.log('Premium Per Lead Data:', data);
    console.log('Premium Per Lead Entries:', Object.entries(data));
  }

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography>Error loading premium per lead data.</Typography>;
  }

  return (
    <Stack elevation={0} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1.5}>
          {data &&
            data.map(({ name, premiumPerLead, leadCount, totalPremium }, index) => (
              <Box key={name}>
                <Stack direction='row' justifyContent='space-between'>
                  <Stack>
                    <Typography fontWeight={500}>
                      {index + 1}. {name}
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {leadCount} leads
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      ${totalPremium.toLocaleString()} AP
                    </Typography>
                  </Stack>
                  <Typography fontWeight={600}>${premiumPerLead.toLocaleString()}</Typography>
                </Stack>
              </Box>
            ))}
        </Stack>
      </CardContent>
    </Stack>
  );
};

export default PremiumPerLeadTab;
