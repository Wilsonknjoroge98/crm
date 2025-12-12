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
  { text: 'Leads', icon: <StorageIcon sx={{ color: '#f9d077' }} />, path: '/leads' },
  { text: 'Clients', icon: <PeopleIcon sx={{ color: '#f9d077' }} />, path: '/clients' },
  {
    text: 'Policies',
    icon: <DescriptionIcon sx={{ color: '#f9d077' }} />,
    path: '/policies',
  },
  {
    text: 'Premiums',
    icon: <LeaderboardIcon sx={{ color: '#f9d077' }} />,
    path: '/premiums',
  },
  {
    text: 'Commissions',
    icon: <AttachMoneyIcon sx={{ color: '#f9d077' }} />,
    path: '/commissions',
  },
  {
    text: 'Insights',
    icon: <InsightsIcon sx={{ color: '#f9d077' }} />,
    path: '/insights',
    role: 'admin',
  },
  {
    text: 'Cash Flow',
    icon: <BusinessIcon sx={{ color: '#f9d077' }} />,
    path: '/cashflow',
    role: 'admin',
  },
  {
    text: 'Purchase Leads',
    icon: <ShoppingCartIcon sx={{ color: '#f9d077' }} />,
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

  // ag_tY71LfQm
  const agency = agent?.agency;

  console.log('Agency in SidePanel:', agent);
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
          backgroundColor: agency === 'ag_tY71LfQm' ? '#1A1A1A' : '#160501',
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
                    fontFamily: '"Libre Baskerville", serif',
                    backgroundColor: isActive ? '#2C2C2C' : 'transparent',
                    '&:hover': {
                      backgroundColor: '#2C2C2C',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? '#EFBF04' : '#FFFFFF',
                      minWidth: 30,
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
        {agency && (
          <Box component='img' src={`${agency}_logo.png`} alt='Logo' sx={{ maxWidth: '235px' }} />
        )}
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
