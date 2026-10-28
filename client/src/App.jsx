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
import { InboxProvider } from './hooks/useInbox';

// import Maintenance from './views/Maintenance';
const App = () => {
  // return <Maintenance />;
  const agent = useAgent();
  const { user, isAuthenticated, authInitialized } = useSelector(
    (state) => state.user,
  );
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const agency = agent?.org_id || 'ag_Hq92aLsK';

  const theme = useMemo(() => createAppTheme({ agency }), [agency]);

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/reset-password';
  // Also matches the old /purchase-leads/... legal URLs while they redirect.
  const isLegalRoute = /\/(terms-of-service|privacy-policy)$/.test(pathname);
  // Legal pages are open to everyone; logged-out visitors see them without
  // the app chrome, logged-in agents keep the nav and side panel.
  const isPublicRoute = isAuthRoute || (isLegalRoute && !isAuthenticated);
  // The Marketplace hub sits on a tinted canvas, applied here so it reaches
  // under the nav offset and through the footer.
  const pageBackground =
    pathname === '/purchase-leads'
      ? theme.palette.background.tinted
      : theme.palette.background.default;

  useEffect(() => {
    if (isPublicRoute) return;
    if (!authInitialized) return;

    // If a Supabase password recovery hash is present, redirect to reset-password
    // regardless of auth state — this must take priority
    const hash = window.location.hash;
    console.log('Current hash:', hash);
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

  console.log('Agent status:', agent);

  useEffect(() => {
    if (!authInitialized || isLegalRoute) return;

    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [agent]);

  if (agent && agent?.active === false) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: 2,
            px: 3,
            textAlign: 'center',
            backgroundColor: theme.palette.background.default,
          }}
        >
          <Typography variant='h5' fontWeight={700}>
            Account Deactivated
          </Typography>
          <Typography variant='body1' color='text.secondary' maxWidth={400}>
            Your account has been deactivated. Please contact your upline for
            assistance.
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  const showNavBar = Boolean(user) && !isPublicRoute;

  return (
    <ThemeProvider theme={theme}>
      <InboxProvider>
        {showNavBar && <NavBar />}
        <Stack
          sx={{
            // the NavBar sits in flow above this, so fill what's left of the
            // viewport, a full 100vh would always scroll by the NavBar's height
            minHeight: showNavBar ? 'calc(100vh - 64px)' : '100vh',
            width: '100%',
            overflowX: 'hidden',
            backgroundColor: pageBackground,
          }}
        >
          {!isPublicRoute && <SidePanel />}

          <Box
            pb='48px'
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              backgroundColor: pageBackground,
              ml: !isPublicRoute ? '220px' : 0,
              // mt: user ? 0 : isMediumScreen ? 3 : 20,
            }}
          >
            <Outlet />
          </Box>

          {/* Footer — auth pages only; legal pages carry their own footer and
              in-app branding lives in the SidePanel */}
          {isAuthRoute && (
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
              <Typography
                variant='caption'
                fontWeight={500}
                color='text.primary'
              >
                Powered by
              </Typography>
              <Box
                component='img'
                src='/fexdigital.png'
                sx={{ maxHeight: '30px', py: 1 }}
              />
            </Stack>
          )}
        </Stack>
      </InboxProvider>
    </ThemeProvider>
  );
};

export default App;
