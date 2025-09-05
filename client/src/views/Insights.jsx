// Attribution.jsx
import {
  Card,
  CardHeader,
  CardContent,
  Stack,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Skeleton,
  Alert,
  Box,
  Divider,
  Tooltip,
  Grid,
} from '@mui/material';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClients } from '../utils/query';
import useAuth from '../hooks/useAuth';

const Insights = () => {
  const PLACEHOLDER_SOURCES = Array.from({ length: 5 });

  const { user, agent, userToken } = useAuth();

  const {
    data: clients = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['clients', user?.uid, agent?.role],
    enabled: !!user?.uid && !!agent?.role,
    queryFn: () =>
      getClients({
        token: userToken,
        data: { agentId: user.uid, agentRole: agent.role },
      }),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const { allSources, knownSources } = useMemo(() => {
    if (!clients?.length) return { allSources: [], knownSources: [] };

    // Single pass to build both maps
    const maps = clients.reduce(
      (acc, c) => {
        const key = (c.source || 'unknown').trim();
        acc.all[key] = (acc.all[key] || 0) + 1;
        if (key !== 'unknown') acc.known[key] = (acc.known[key] || 0) + 1;
        return acc;
      },
      { all: {}, known: {} },
    );

    const total = clients.length;
    const totalKnown = Object.values(maps.known).reduce((s, n) => s + n, 0) || 1;

    const allSources = Object.entries(maps.all)
      .map(([source, count]) => ({ source, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);

    const knownSources = Object.entries(maps.known)
      .map(([source, count]) => ({ source, count, pct: Math.round((count / totalKnown) * 100) }))
      .sort((a, b) => b.count - a.count);

    return { allSources, knownSources };
  }, [clients]);

  if (isError) {
    return (
      <Alert severity='error' sx={{ my: 3 }}>
        Failed to load attribution. {error?.message || 'Try again later.'}
      </Alert>
    );
  }

  console.log('allSources', allSources);

  return (
    <Grid spacing={5} container sx={{ width: '100%', justifyContent: 'center' }}>
      <Grid size={5} maxWidth={500}>
        <Card
          sx={{
            alignSelf: 'center',
            justifySelf: 'center',
            width: '100%',
            boxShadow: 0,
          }}
        >
          <CardHeader
            title='Client Source *Total'
            subheader={
              clients?.length
                ? `${clients.length} client${clients.length === 1 ? '' : 's'} total`
                : undefined
            }
          />
          <CardContent>
            {isLoading && (
              <Stack spacing={2}>
                {PLACEHOLDER_SOURCES.map((_, i) => (
                  <Box key={i}>
                    <Stack direction='row' justifyContent='space-between' mb={0.5}>
                      <Skeleton width={160} />
                      <Skeleton width={60} />
                    </Stack>
                    <Skeleton variant='rectangular' height={8} />
                  </Box>
                ))}
              </Stack>
            )}

            {!isLoading && allSources.length === 0 && (
              <Typography variant='body2' color='text.secondary'>
                No clients yet—once clients are created with a <em>source</em>, the leaderboard will
                populate.
              </Typography>
            )}

            {!isLoading && allSources.length > 0 && (
              <List disablePadding>
                {allSources.map(({ source, count, pct }, idx) => (
                  <Box key={source}>
                    <ListItem disableGutters>
                      <ListItemText
                        primary={
                          <Stack direction='row' alignItems='center' spacing={1}>
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                              {idx + 1}. {source}
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
                            <Tooltip title={`${pct}% of total`} placement='top' arrow>
                              <LinearProgress
                                variant='determinate'
                                value={pct}
                                sx={{
                                  height: 8,
                                  borderRadius: 1,
                                  // Uses your theme colors (dark bg, gold accents)
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                    backgroundColor: (theme) => theme.palette.secondary.main,
                                  },
                                }}
                              />
                            </Tooltip>
                          </Stack>
                        }
                      />
                    </ListItem>
                    {idx !== allSources.length - 1 && <Divider component='li' />}
                  </Box>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={5} maxWidth={500}>
        <Card
          sx={{
            maxWidth: '100%',
            alignSelf: 'center',
            justifySelf: 'center',
            width: '100%',
            boxShadow: 0,
          }}
        >
          <CardHeader
            title='Client Source *Known'
            subheader={
              clients?.length
                ? `${
                    clients.filter((c) => c.source && c.source.trim() !== 'unknown').length
                  } client${
                    clients.filter((c) => c.source && c.source.trim() !== 'unknown').length === 1
                      ? ''
                      : 's'
                  } total`
                : undefined
            }
          />
          <CardContent>
            {isLoading && (
              <Stack spacing={2}>
                {PLACEHOLDER_SOURCES.map((_, i) => (
                  <Box key={i}>
                    <Stack direction='row' justifyContent='space-between' mb={0.5}>
                      <Skeleton width={160} />
                      <Skeleton width={60} />
                    </Stack>
                    <Skeleton variant='rectangular' height={8} />
                  </Box>
                ))}
              </Stack>
            )}

            {!isLoading && knownSources.length === 0 && (
              <Typography variant='body2' color='text.secondary'>
                No clients yet—once clients are created with a <em>source</em>, the leaderboard will
                populate.
              </Typography>
            )}

            {!isLoading && knownSources.length > 0 && (
              <List disablePadding>
                {knownSources.map(({ source, count, pct }, idx) => (
                  <Box key={source}>
                    <ListItem disableGutters>
                      <ListItemText
                        primary={
                          <Stack direction='row' alignItems='center' spacing={1}>
                            <Typography variant='body2' sx={{ fontWeight: 600 }}>
                              {idx + 1}. {source}
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
                            <Tooltip title={`${pct}% of total`} placement='top' arrow>
                              <LinearProgress
                                variant='determinate'
                                value={pct}
                                sx={{
                                  height: 8,
                                  borderRadius: 1,
                                  // Uses your theme colors (dark bg, gold accents)
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 1,
                                    backgroundColor: (theme) => theme.palette.secondary.main,
                                  },
                                }}
                              />
                            </Tooltip>
                          </Stack>
                        }
                      />
                    </ListItem>
                    {idx !== knownSources.length - 1 && <Divider component='li' />}
                  </Box>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Insights;
