import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Stack,
  Divider,
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
import { useTheme } from '@mui/material/styles';

import { useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

const drawerWidth = 250;

const SidePanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, agent } = useAuth();
  const theme = useTheme();

  const agency = agent?.agency;

  const handleItemClick = (path) => {
    if (!path) return;
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
    // {
    //   text: 'Team Production',
    //   icon: <QueryStatsOutlinedIcon />,
    //   path: null,
    // },
    {
      text: 'Purchase Leads',
      icon: <ShoppingCartOutlinedIcon />,
      path: '/purchase-leads',
    },
    {
      text: 'Mange Subscription',
      icon: <SettingsOutlinedIcon />,
      path: 'https://billing.stripe.com/p/login/14AdR909SfQz0KedGJ6Ri00',
    },
  ];

  const adminItems = [
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
        'width': drawerWidth,
        'flexShrink': 0,
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
          <Stack spacing={3}>
            <List disablePadding>
              <ListItem
                onClick={() => handleItemClick('/dashboard')}
                sx={{
                  'px': 3,
                  'py': 0.5,
                  'borderRadius': 1.5,
                  'cursor': 'pointer',
                  'position': 'relative',
                  'backgroundColor':
                    location.pathname === '/dashboard' ? 'rgba(255,255,255,0.06)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.08)',
                  },
                  '&::before':
                    location.pathname === '/dashboard'
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
                      location.pathname === '/dashboard' ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
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
                          location.pathname === '/dashboard' ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
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
                      'px': 3,
                      'py': 0.5,
                      'borderRadius': 1.5,
                      'cursor': 'pointer',
                      'position': 'relative',
                      'backgroundColor': isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
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
                            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
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
                      'px': 3,
                      'py': 0.5,
                      'borderRadius': 1.5,
                      'position': 'relative',
                      'cursor': path && 'pointer',
                      'backgroundColor': isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
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
                            color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
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
                        'px': 3,
                        'py': 0.5,

                        'borderRadius': 1.5,
                        'cursor': 'pointer',
                        'position': 'relative',
                        'backgroundColor': isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
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
                              color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.85)',
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
        <Box
          component='img'
          src={`${agency}_logo.png`}
          alt='Logo'
          sx={{
            maxWidth: 240,
          }}
        />
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
