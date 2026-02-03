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
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import InsightsIcon from '@mui/icons-material/Insights';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import BusinessIcon from '@mui/icons-material/Business';
import StorageIcon from '@mui/icons-material/Storage';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useTheme } from '@mui/material/styles';

import { useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

const drawerWidth = 240;

const SidePanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, agent } = useAuth();
  const theme = useTheme();

  const agency = agent?.agency;

  const handleItemClick = (path) => {
    navigate(path);
  };

  const navItems = [
    {
      text: 'Leaderboard',
      icon: <LeaderboardIcon sx={{ color: '#f9d076' }} />,
      path: '/dashboard',
    },
    {
      text: 'Leads',
      icon: <StorageIcon sx={{ color: '#f9d076' }} />,
      path: '/leads',
    },
    {
      text: 'Clients',
      icon: <PeopleIcon sx={{ color: '#f9d076' }} />,
      path: '/clients',
    },
    {
      text: 'Policies',
      icon: <DescriptionIcon sx={{ color: '#f9d076' }} />,
      path: '/policies',
    },

    {
      text: 'Insights',
      icon: <InsightsIcon sx={{ color: '#f9d076' }} />,
      path: '/insights',
      role: 'admin',
    },
    {
      text: 'Cash Flow',
      icon: <BusinessIcon sx={{ color: '#f9d076' }} />,
      path: '/cashflow',
      role: 'admin',
    },
    {
      text: 'Purchase Leads',
      icon: <ShoppingCartIcon sx={{ color: '#f9d076' }} />,
      path: '/purchase-leads',
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
          <List disablePadding>
            {navItems.map(({ text, icon, path, role }) => {
              if (role === 'admin' && agent?.role !== 'admin') return null;

              const isActive = location.pathname === path;

              return (
                <ListItem
                  key={text}
                  onClick={() => handleItemClick(path)}
                  sx={{
                    'mb': 0.5,
                    'px': 1.5,
                    'py': 1,
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
                          backgroundColor: '#EFBF04',
                        }
                      : {},
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 32,
                      color: isActive ? '#EFBF04' : 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {icon}
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          fontSize: '0.9rem',
                          fontWeight: isActive ? 600 : 500,
                          letterSpacing: '0.2px',
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
      </Box>

      {/* Footer / Branding */}
      <Stack
        direction='row'
        justifyContent='center'
        alignItems='center'
        sx={{
          mt: 'auto',
          py: 2,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {agency && (
          <Box
            component='img'
            src={`${agency}_logo.png`}
            alt='Logo'
            sx={{
              maxWidth: 180,
              opacity: 0.85,
            }}
          />
        )}
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
