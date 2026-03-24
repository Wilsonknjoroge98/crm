import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Stack,
} from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import InsightsIcon from '@mui/icons-material/Insights';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import StorageOutlinedIcon from '@mui/icons-material/StorageOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

import { useTheme } from '@mui/material/styles';

import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent';
import { supabase } from '../utils/supabase';

const drawerWidth = 250;

const SidePanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useSelector((state) => state.user);
  const agent = useAgent();
  const theme = useTheme();

  const agency = agent?.org_id;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();

      navigate('/login');
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  const handleItemClick = (path) => {
    if (!path) return;
    if (path == 'sign_out') {
      handleSignOut();
      return;
    }
    if (path.includes('https')) {
      window.open(path, '_blank');
      return;
    }
    navigate(path);
  };

  const salesItems = [
    {
      text: 'Leads',
      icon: <StorageOutlinedIcon />,
      path: '/leads',
    },
    {
      text: 'Clients',
      icon: <PeopleAltOutlinedIcon />,
      path: '/clients',
    },
    {
      text: 'Policies',
      icon: <ArticleOutlinedIcon />,
      path: '/policies',
    },
  ];

  const managementItems = [
    {
      text: 'Production',
      icon: <QueryStatsOutlinedIcon />,
      path: '/team-production',
    },

    {
      text: 'Marketplace',
      icon: <ShoppingCartOutlinedIcon />,
      path: '/purchase-leads',
    },
    {
      text: 'Billing',
      icon: <SettingsOutlinedIcon />,
      path: 'https://billing.stripe.com/p/login/14AdR909SfQz0KedGJ6Ri00',
    },
    {
      text: 'Sign Out',
      icon: <LogoutOutlinedIcon />,
      path: 'sign_out',
    },
  ];

  const adminItems = [
    {
      text: 'Agents',
      icon: <BadgeOutlinedIcon />,
      path: '/agents',
    },
    {
      text: 'Insights',
      icon: <InsightsIcon />,
      path: '/insights',
    },
    {
      text: 'Cash Flow',
      icon: <BusinessOutlinedIcon />,
      path: '/cashflow',
    },
  ];

  return (
    <Drawer
      variant='permanent'
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.text.primary,
          borderRight: '1px solid rgba(255,255,255,0.06)',
        },
      }}
    >
      <Box height={64} />

      <Box sx={{ px: 1.5 }}>
        {isAuthenticated && (
          <Stack spacing={1}>
            <List disablePadding>
              <ListItem
                onClick={() => handleItemClick('/leaderboard')}
                sx={{
                  px: 3,
                  py: 0.5,
                  borderRadius: 1.5,
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor:
                    location.pathname === '/leaderboard'
                      ? 'rgba(255,255,255,0.06)'
                      : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                  '&::before':
                    location.pathname === '/leaderboard'
                      ? {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          height: '60%',
                          width: '3px',
                          borderRadius: '2px',
                          backgroundColor: theme.palette.action.main,
                        }
                      : {},
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 30,
                    color:
                      location.pathname === '/leaderboard'
                        ? '#FFFFFF'
                        : 'rgba(255,255,255,0.85)',
                  }}
                >
                  <LeaderboardOutlinedIcon />
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Typography
                      variant='body2'
                      sx={{
                        color:
                          location.pathname === '/leaderboard'
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      Leaderboard
                    </Typography>
                  }
                />
              </ListItem>
            </List>

            {/* SALES SECTION */}
            <List disablePadding>
              <Stack>
                <Typography
                  variant='caption'
                  fontWeight={600}
                  letterSpacing={2}
                  sx={{
                    mb: 1,
                    px: 1.5,
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  SALES
                </Typography>
              </Stack>
              {salesItems.map(({ text, icon, path }) => {
                const isActive = location.pathname === path;

                return (
                  <ListItem
                    key={text}
                    onClick={() => handleItemClick(path)}
                    sx={{
                      px: 3,
                      py: 0.5,
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      position: 'relative',
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      },
                      '&::before': isActive
                        ? {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: '20%',
                            height: '60%',
                            width: '3px',
                            borderRadius: '2px',
                            backgroundColor: theme.palette.action.main,
                          }
                        : {},
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 30,
                        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      {icon}
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          sx={{
                            color: isActive
                              ? '#FFFFFF'
                              : 'rgba(255,255,255,0.85)',
                          }}
                        >
                          {text}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>

            {/* MANAGEMENT SECTION */}
            <List disablePadding>
              <Stack>
                <Typography
                  variant='caption'
                  fontWeight={600}
                  letterSpacing={2}
                  sx={{
                    mb: 1,
                    px: 1.5,

                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  MANAGEMENT
                </Typography>
              </Stack>
              {managementItems.map(({ text, icon, path }) => {
                const isActive = location.pathname === path;

                return (
                  <ListItem
                    key={text}
                    onClick={() => handleItemClick(path)}
                    sx={{
                      px: 3,
                      py: 0.5,
                      borderRadius: 1.5,
                      position: 'relative',
                      cursor: path && 'pointer',
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.06)'
                        : 'transparent',
                      '&:hover': {
                        // if no path, the route isn't ready yet
                        backgroundColor: path && 'rgba(255,255,255,0.08)',
                      },
                      '&::before': isActive
                        ? {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: '20%',
                            height: '60%',
                            width: '3px',
                            borderRadius: '2px',
                            backgroundColor: theme.palette.action.main,
                          }
                        : {},
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 30,
                        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      {icon}
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Typography
                          variant='body2'
                          sx={{
                            color: isActive
                              ? '#FFFFFF'
                              : 'rgba(255,255,255,0.85)',
                          }}
                        >
                          {text}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>

            {/* ADMIN SECTION */}
            {agent?.role === 'admin' && (
              <List disablePadding>
                <Stack>
                  <Typography
                    variant='caption'
                    fontWeight={600}
                    letterSpacing={2}
                    sx={{
                      mb: 1,
                      px: 1.5,
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    ADMIN
                  </Typography>
                </Stack>
                {adminItems.map(({ text, icon, path, role }) => {
                  const isActive = location.pathname === path;

                  return (
                    <ListItem
                      key={text}
                      onClick={() => handleItemClick(path)}
                      sx={{
                        px: 3,
                        py: 0.5,

                        borderRadius: 1.5,
                        cursor: 'pointer',
                        position: 'relative',
                        backgroundColor: isActive
                          ? 'rgba(255,255,255,0.06)'
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.08)',
                        },
                        '&::before': isActive
                          ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: '20%',
                              height: '60%',
                              width: '3px',
                              borderRadius: '2px',
                              backgroundColor: theme.palette.action.main,
                            }
                          : {},
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 30,
                          color: isActive
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.85)',
                        }}
                      >
                        {icon}
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Typography
                            variant='body2'
                            sx={{
                              color: isActive
                                ? '#FFFFFF'
                                : 'rgba(255,255,255,0.85)',
                            }}
                          >
                            {text}
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Stack>
        )}
      </Box>

      {/* Footer / Branding */}
      <Stack
        direction='row'
        justifyContent='center'
        alignItems='center'
        sx={{
          mt: 'auto',
          py: 2,
          // borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {agency && (
          <Box
            component='img'
            src={`${agency}_logo.png`}
            alt='Logo'
            sx={{
              maxWidth: 200,
            }}
          />
        )}
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
