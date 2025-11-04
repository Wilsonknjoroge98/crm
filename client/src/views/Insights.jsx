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
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getInsights } from '../utils/query';
import useAuth from '../hooks/useAuth';

const Insights = () => {
  const PLACEHOLDER_SOURCES = Array.from({ length: 5 });

  const { user, userToken } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['insights'],
    enabled: !!user?.uid,
    queryFn: () =>
      getInsights({
        token: userToken,
      }),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  if (isError) {
    return (
      <Alert severity='error' sx={{ mb: 2 }}>
        Failed to load attribution. {error?.message || 'Try again later.'}
      </Alert>
    );
  }

  const sources = data?.sources ?? [];
  const unknownClients = data?.unknownClients ?? 0;
  const total = data?.total ?? 0;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant='h4'>Creative Insights</Typography>

      <Card
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
      </Card>
    </Container>
  );
};

export default Insights;
