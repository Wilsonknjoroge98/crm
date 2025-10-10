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
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getPremiums } from '../utils/query';

import useAuth from '../hooks/useAuth';

const Premiums = () => {
  const [totalPremium, setTotalPremium] = useState(0);
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
      getPremiums({
        token: userToken,
      }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    const total = data.reduce((sum, row) => sum + row.premiumAmount, 0);
    setTotalPremium(total);
  }, [data]);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant='h4'>Premium Leaderboard</Typography>
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
        {isError && (
          <Alert
            severity='error'
            sx={{
              mb: 2,
              color: theme.palette.warning.alertTextColor,
              backgroundColor: theme.palette.warning.alertBackground,
              '& .MuiAlert-icon': { color: theme.palette.warning.alertIconColor },
            }}
          >
            Failed to load data. {error?.message || 'Please try again later.'}
          </Alert>
        )}

        <Alert severity='info'>
          Dollar amounts represent <strong>annualized</strong> premium all time.
        </Alert>
        <CardContent>
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
                        px: 0,
                        py: 1,
                        borderRadius: 0.5,
                        ...(top && {
                          py: 1,
                          px: 1,
                          backgroundColor: alpha(theme.palette.action.main, 0.3),
                        }),
                      }}
                    >
                      <ListItemText
                        primary={
                          <Stack direction='row' alignItems='center'>
                            <Typography variant={'subtitle1'} fontWeight={500}>
                              {row.name || 'Unknown'}
                            </Typography>
                            {top && (
                              <MilitaryTechIcon
                                sx={{
                                  ml: 1,
                                  fontSize: '2rem',
                                  color: alpha(theme.palette.action.main, 0.9),
                                }}
                              />
                            )}
                            <Typography
                              variant='subtitle1'
                              sx={{
                                fontWeight: 600,
                                ml: 'auto',
                              }}
                            >
                              $
                              {row.premiumAmount.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                            </Typography>
                          </Stack>
                        }
                      />
                    </ListItem>
                    {idx !== data.length - 1 && (
                      <Divider
                        sx={{ my: 0.5, borderColor: alpha(theme.palette.text.primary, 0.06) }}
                      />
                    )}
                  </Box>
                );
              })}
            </List>
          )}
          <Stack direction={'row'} justifyContent='space-between' alignItems='center' mt={2}>
            <Typography mt={2} variant='subtitle1' fontWeight={600}>
              Total Premium
            </Typography>
            <Typography
              p={1}
              mt={2}
              borderRadius={1}
              textAlign='right'
              width={'fit-content'}
              sx={{ backgroundColor: 'success.main' }}
              fontWeight={600}
            >
              $
              {totalPremium.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default Premiums;
