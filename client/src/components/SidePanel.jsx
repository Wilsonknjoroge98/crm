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
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BusinessIcon from '@mui/icons-material/Business';
import StorageIcon from '@mui/icons-material/Storage';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

import { useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

const drawerWidth = 240;

const navItems = [
  { text: 'Leads', icon: <StorageIcon />, path: '/leads' },
  { text: 'Clients', icon: <PeopleIcon />, path: '/clients' },
  {
    text: 'Policies',
    icon: <DescriptionIcon />,
    path: '/policies',
  },
  {
    text: 'Premiums',
    icon: <LeaderboardIcon />,
    path: '/premiums',
  },
  {
    text: 'Commissions',
    icon: <AttachMoneyIcon />,
    path: '/commissions',
  },
  {
    text: 'Insights',
    icon: <InsightsIcon />,
    path: '/insights',
    role: 'admin',
  },
  {
    text: 'Cash Flow',
    icon: <BusinessIcon />,
    path: '/cashflow',
    role: 'admin',
  },
  {
    text: 'Purchase Leads',
    icon: <ShoppingCartIcon />,
    path: '/purchase-leads',
  },
  // {
  //   text: 'Lead Vendors',
  //   icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
  //   path: '/lead-vendors',
  // },
  // {
  //   text: 'Expenses',
  //   icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
  //   path: '/expenses',
  // },
  // {
  //   text: 'Agent Hierarchy',
  //   icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
  //   path: '/agent-hierarchy',
  // },
  // {
  //   text: 'Printing Services',
  //   icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
  //   path: '/printing',
  // },
  // {
  //   text: 'Reports',
  //   icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
  //   path: '/reports',
  // },
];

const SidePanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, agent } = useAuth();

  const handleItemClick = (path) => {
    navigate(path);
  };

  return (
    <Drawer
      variant='permanent'
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: 'border-box',
          backgroundColor: '#1A1A1A',
          color: '#F2F2F2',
        },
      }}
    >
      <Box height={64} />
      <Box sx={{ height: '100%' }}>
        {isAuthenticated && (
          <List>
            {navItems.map(({ text, icon, path, role }, index) => {
              const isActive = location.pathname === path;

              if (role === 'admin' && agent?.role !== 'admin') {
                return null;
              }

              return (
                <ListItem
                  key={text}
                  onClick={() => handleItemClick(path)}
                  sx={{
                    backgroundColor: isActive ? '#2C2C2C' : 'transparent',
                    '&:hover': {
                      backgroundColor: '#2C2C2C',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? '#EFBF04' : '#FFFFFF',
                      minWidth: 40,
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant='caption'
                        sx={{
                          fontWeight: 500,
                          color: '#F2F2F2',
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
      <Stack direction='row' justifyContent='center' alignContent='center' m={1}>
        <Box component='img' src='logo.png' alt='Logo' sx={{ maxWidth: '235px' }} />
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
