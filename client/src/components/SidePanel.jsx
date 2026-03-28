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

import { useTheme } from '@mui/material/styles';

import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent';

const drawerWidth = 220;

const ICON_SX = { '& .MuiSvgIcon-root': { fontSize: '1rem' } };

const SidePanel = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { isAuthenticated } = useSelector((state) => state.user);
  const agent = useAgent();
  const theme = useTheme();

  const agency = agent?.org_id;

  const handleItemClick = (path) => {
    if (!path) return;
    if (path.includes('https')) {
      window.open(path, '_blank');
      return;
    }
    navigate(path);
  };

  const salesItems = [
    { text: 'Leads', icon: <StorageOutlinedIcon />, path: '/leads' },
    { text: 'Clients', icon: <PeopleAltOutlinedIcon />, path: '/clients' },
    { text: 'Policies', icon: <ArticleOutlinedIcon />, path: '/policies' },
  ];

  const managementItems = [
    { text: 'Production', icon: <QueryStatsOutlinedIcon />, path: '/team-production' },
    { text: 'Marketplace', icon: <ShoppingCartOutlinedIcon />, path: '/purchase-leads' },
    { text: 'Billing', icon: <SettingsOutlinedIcon />, path: 'https://billing.stripe.com/p/login/14AdR909SfQz0KedGJ6Ri00' },
  ];

  const adminItems = [
    { text: 'Agents', icon: <BadgeOutlinedIcon />, path: '/agents' },
    { text: 'Insights', icon: <InsightsIcon />, path: '/insights' },
    { text: 'Cash Flow', icon: <BusinessOutlinedIcon />, path: '/cashflow' },
  ];

  const navItemSx = (isActive, hasPath = true) => ({
    px: 2,
    py: 0.4,
    borderRadius: 1,
    cursor: hasPath ? 'pointer' : 'default',
    position: 'relative',
    backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
    '&:hover': {
      backgroundColor: hasPath ? 'rgba(255,255,255,0.07)' : 'transparent',
    },
    '&::before': isActive
      ? {
          content: '""',
          position: 'absolute',
          left: 0,
          top: '22%',
          height: '56%',
          width: '2px',
          borderRadius: '2px',
          backgroundColor: theme.palette.action.main,
        }
      : {},
  });

  const navIconSx = (isActive) => ({
    ...ICON_SX,
    minWidth: 28,
    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
  });

  const NavLabel = ({ isActive, children }) => (
    <Typography
      sx={{
        fontSize: '0.78rem',
        fontWeight: isActive ? 500 : 400,
        letterSpacing: '0.01em',
        color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
      }}
    >
      {children}
    </Typography>
  );

  const SectionLabel = ({ children }) => (
    <Typography
      sx={{
        fontSize: '0.6rem',
        fontWeight: 600,
        letterSpacing: '0.12em',
        mb: 0.5,
        px: 1.5,
        color: 'rgba(255,255,255,0.35)',
      }}
    >
      {children}
    </Typography>
  );

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
          borderRight: '1px solid rgba(255,255,255,0.05)',
        },
      }}
    >
      <Box height={64} />

      <Box sx={{ px: 1.5 }}>
        {isAuthenticated && (
          <Stack spacing={0.5}>
            <List disablePadding>
              <ListItem
                onClick={() => handleItemClick('/leaderboard')}
                sx={navItemSx(location.pathname === '/leaderboard')}
              >
                <ListItemIcon sx={navIconSx(location.pathname === '/leaderboard')}>
                  <LeaderboardOutlinedIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <NavLabel isActive={location.pathname === '/leaderboard'}>
                      Leaderboard
                    </NavLabel>
                  }
                />
              </ListItem>
            </List>

            {/* SALES SECTION */}
            <List disablePadding>
              <SectionLabel>SALES</SectionLabel>
              {salesItems.map(({ text, icon, path }) => {
                const isActive = location.pathname === path;
                return (
                  <ListItem key={text} onClick={() => handleItemClick(path)} sx={navItemSx(isActive)}>
                    <ListItemIcon sx={navIconSx(isActive)}>{icon}</ListItemIcon>
                    <ListItemText primary={<NavLabel isActive={isActive}>{text}</NavLabel>} />
                  </ListItem>
                );
              })}
            </List>

            {/* MANAGEMENT SECTION */}
            <List disablePadding>
              <SectionLabel>MANAGEMENT</SectionLabel>
              {managementItems.map(({ text, icon, path }) => {
                const isActive = location.pathname === path;
                return (
                  <ListItem key={text} onClick={() => handleItemClick(path)} sx={navItemSx(isActive, !!path)}>
                    <ListItemIcon sx={navIconSx(isActive)}>{icon}</ListItemIcon>
                    <ListItemText primary={<NavLabel isActive={isActive}>{text}</NavLabel>} />
                  </ListItem>
                );
              })}
            </List>

            {/* ADMIN SECTION */}
            {agent?.role === 'admin' && (
              <List disablePadding>
                <SectionLabel>ADMIN</SectionLabel>
                {adminItems.map(({ text, icon, path }) => {
                  const isActive = location.pathname === path;
                  return (
                    <ListItem key={text} onClick={() => handleItemClick(path)} sx={navItemSx(isActive)}>
                      <ListItemIcon sx={navIconSx(isActive)}>{icon}</ListItemIcon>
                      <ListItemText primary={<NavLabel isActive={isActive}>{text}</NavLabel>} />
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
        sx={{ mt: 'auto', py: 2 }}
      >
        {agency && (
          <Box
            component='img'
            src={`${agency}_logo.png`}
            alt='Logo'
            sx={{ maxWidth: 200 }}
          />
        )}
      </Stack>
    </Drawer>
  );
};

export default SidePanel;
