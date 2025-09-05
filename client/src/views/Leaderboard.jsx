// SalesLeaderboard.jsx
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  LinearProgress,
  Stack,
  Typography,
  Divider,
  Tooltip,
  Container,
  Alert,
  Skeleton,
  Box,
  Chip,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import { useTheme } from '@mui/material/styles';

import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../utils/query';

import useAuth from '../hooks/useAuth';

const Leaderboard = () => {
  const { userToken } = useAuth();
  const theme = useTheme();

  const {
    data = [],
    isError,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['data'],
    queryFn: () =>
      getLeaderboard({
        token: userToken,
      }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant='h4'>Leaderboard</Typography>
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
          {isError && (
            <Alert severity='error' sx={{ mb: 2 }}>
              Failed to load data. {error?.message || 'Please try again later.'}
            </Alert>
          )}

          {isLoading ? (
            <Stack spacing={2}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i}>
                  <Skeleton variant='rectangular' height={40} />
                </Box>
              ))}
            </Stack>
          ) : data.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No qualifying sales yet.
            </Typography>
          ) : (
            <List disablePadding>
              {data.map((row, idx) => {
                const top = idx === 0;

                return (
                  <Box key={row.name}>
                    <ListItem
                      disableGutters
                      sx={{
                        py: 1.25,
                        px: 1.5,
                        borderRadius: 1.5,
                        ...(top && {
                          backgroundColor: alpha(theme.palette.action.main, 0.35),
                          boxShadow: theme.shadows[1],
                        }),
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction='row' alignItems='baseline' spacing={1} flexWrap='wrap'>
                            <Typography
                              variant={'subtitle1'}
                              sx={{ fontWeight: top ? 700 : 400, opacity: top ? 1 : 0.9 }}
                            >
                              {idx + 1}.
                            </Typography>
                            <Typography
                              variant={'subtitle1'}
                              sx={{ fontWeight: top ? 700 : 400, opacity: top ? 1 : 0.9 }}
                            >
                              {row.name || 'Unknown'}
                            </Typography>
                            {top && (
                              <Chip
                                label='Top'
                                size='small'
                                sx={{
                                  ml: 0.5,
                                  px: 0.75,
                                  py: 0.2,
                                  borderRadius: 1,
                                  fontWeight: 700,
                                  bgcolor: alpha(theme.palette.action.main, 0.4),
                                  color: theme.palette.text.secondary,
                                }}
                                variant='caption'
                              />
                            )}
                            <Typography
                              variant={'subtitle1'}
                              sx={{
                                ml: 'auto',
                                opacity: top ? 1 : 0.9,
                              }}
                            >
                              $
                              {row.premiumAmount.toLocaleString('en-US', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })}{' '}
                              • {row.count} policies
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                    {idx !== data.length - 1 && (
                      <Divider
                        sx={{ my: 1.25, borderColor: alpha(theme.palette.text.primary, 0.06) }}
                      />
                    )}
                  </Box>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Leaderboard;
