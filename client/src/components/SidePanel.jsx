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
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import InsightsIcon from '@mui/icons-material/Insights';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
// import AssignmentIcon from '@mui/icons-material/Assignment';
// import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
// import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
// import PrintIcon from '@mui/icons-material/Print';
// import BarChartIcon from '@mui/icons-material/BarChart';
import BuildIcon from '@mui/icons-material/Build';

import { useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

const drawerWidth = 240;

const navItems = [
  { text: 'Clients', icon: <PeopleIcon />, path: '/clients' },
  {
    text: 'Policies',
    icon: <DescriptionIcon />,
    path: '/policies',
  },
  {
    text: 'Leaderboard',
    icon: <LeaderboardIcon />,
    path: '/leaderboard',
  },
  {
    text: 'Insights',
    icon: <InsightsIcon />,
    path: '/insights',
  },
  {
    text: 'Documents',
    icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
    path: '/documents',
  },
  {
    text: 'Lead Vendors',
    icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
    path: '/lead-vendors',
  },
  {
    text: 'Expenses',
    icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
    path: '/expenses',
  },
  {
    text: 'Agent Hierarchy',
    icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
    path: '/agent-hierarchy',
  },
  {
    text: 'Printing Services',
    icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
    path: '/printing',
  },
  {
    text: 'Reports',
    icon: <BuildIcon sx={{ color: '#4A4A4A' }} />,
    path: '/reports',
  },
];

const SidePanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const handleItemClick = (path) => {
    if (
      location.pathname !== path &&
      (path === '/clients' ||
        path === '/policies' ||
        path === '/insights' ||
        path === '/leaderboard')
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
        {isAuthenticated && (
          <List>
            {navItems.map(({ text, icon, path }, index) => {
              const isActive = location.pathname === path;

              return (
                <ListItem
                  key={text}
                  onClick={() => handleItemClick(path)}
                  sx={{
                    backgroundColor: isActive && index < 4 ? '#2C2C2C' : 'transparent',
                    '&:hover': {
                      backgroundColor: index < 4 ? '#2C2C2C' : 'transparent',
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
      <Stack direction='row' justifyContent='center' alignContent='center' m={1}>
        <Box component='img' src='logo.png' alt='Logo' sx={{ maxWidth: '235px' }} />
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
