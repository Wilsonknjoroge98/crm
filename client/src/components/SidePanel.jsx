import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
  Stack,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
import PrintIcon from '@mui/icons-material/Print';
import BarChartIcon from '@mui/icons-material/BarChart';

import { useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

const drawerWidth = 240;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Clients', icon: <PeopleIcon />, path: '/clients' },
  { text: 'Policies', icon: <DescriptionIcon />, path: '/policies' },
  { text: 'Documents', icon: <AssignmentIcon />, path: '/documents' },
  { text: 'Lead Vendors', icon: <AttachMoneyIcon />, path: '/lead-vendors' },
  { text: 'Expenses', icon: <AttachMoneyIcon />, path: '/expenses' },
  {
    text: 'Agent Hierarchy',
    icon: <SupervisedUserCircleIcon />,
    path: '/agent-hierarchy',
  },
  { text: 'Printing Services', icon: <PrintIcon />, path: '/printing' },
  { text: 'Reports', icon: <BarChartIcon />, path: '/reports' },
];

const SidePanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleItemClick = (path) => {
    if (
      location.pathname !== path &&
      (path === '/clients' || path === '/policies')
    ) {
      navigate(path);
    }
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
        {user && (
          <List>
            {navItems.map(({ text, icon, path }) => {
              const isActive = location.pathname === path;

              return (
                <ListItem
                  button
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
                      color: isActive ? '#EFBF04' : '#CA9837',
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
      <Stack
        direction='row'
        justifyContent='center'
        alignContent='center'
        m={1}
      >
        <Box
          component='img'
          src='logo.png'
          alt='Logo'
          sx={{ maxWidth: '235px' }}
        />
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
