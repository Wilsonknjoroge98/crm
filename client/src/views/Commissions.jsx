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
} from '@mui/material';

import useAuth from '../hooks/useAuth';

const Commissions = () => {
  const { userToken } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ['commissions'],
    queryFn: () =>
      getCommissions({
        token: userToken,
      }),
    onSuccess: (data) => {
      console.log('Commissions data fetched successfully:', data);
    },
    onError: (error) => {
      console.error('Error fetching commissions data:', error);
    },
  });

  console.log('Commissions data:', data);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant='h4'> Commission Breakdown</Typography>
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
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'primary.main',
                            fontSize: 14,
                          }}
                        >
                          {key[0].toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant='subtitle1' fontWeight={500}>
                            {key}
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'success' }}>
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
        </CardContent>
      </Card>
    </Container>
  );
};

export default Commissions;
