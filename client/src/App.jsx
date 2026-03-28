import './App.css';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';

import SidePanel from './components/SidePanel';
import NavBar from './components/NavBar';

import Typography from '@mui/material/Typography';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from './utils/theme';

import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAgent } from './hooks/useAgent';

// import Maintenance from './views/Maintenance';
const App = () => {
  // return <Maintenance />;
  const agent = useAgent();
  const { user, isAuthenticated, authInitialized } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const agency = agent?.org_id || 'ag_Hq92aLsK';

  const theme = useMemo(() => createAppTheme({ agency }), [agency]);

  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/reset-password';

  useEffect(() => {
    if (isPublicRoute) return;
    if (!authInitialized) return;

    // If a Supabase password recovery hash is present, redirect to reset-password
    // regardless of auth state — this must take priority
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      navigate('/reset-password');
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
    } else if (pathname === '/login') {
      navigate('/leads');
    }
  }, [authInitialized, isAuthenticated]);

  return (
    <ThemeProvider theme={theme}>
      {user && !isPublicRoute && <NavBar />}
      <Stack
        sx={{
          minHeight: '100vh',
          width: '100%',
          overflowX: 'hidden',
          backgroundColor: theme.palette.background.default,
        }}
      >
        {!isPublicRoute && <SidePanel />}

        <Box
          pt={user ? '64px' : 0}
          pb='48px'
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            backgroundColor: theme.palette.background.default,
            ml: !isPublicRoute ? '220px' : 0,
            // mt: user ? 0 : isMediumScreen ? 3 : 20,
          }}
        >
          <Outlet />
        </Box>

        {/* Footer */}
        <Stack
          sx={{
            pb: 3,
            mt: 'auto',
            width: '100%',
          }}
          direction='row'
          alignItems='center'
          justifyContent='center'
          spacing={1}
        >
          <Typography variant='caption' fontWeight={500} color='text.primary'>
            Powered by
          </Typography>
          <Box
            component='img'
            src='fexdigital.png'
            sx={{ maxHeight: '30px', py: 1 }}
          />
        </Stack>
      </Stack>
    </ThemeProvider>
  );
};

export default App;
