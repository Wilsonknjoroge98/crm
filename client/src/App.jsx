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

import useAuth from './hooks/useAuth';
import { useEffect, useMemo } from 'react';

// import Maintenance from './views/Maintenance';
const App = () => {
  // return <Maintenance />;
  const { user, agent } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // const agency = agent?.agency || 'ag_tY71LfQm';

  const agency = agent?.agency || 'ag_Hq92aLsK';

  const theme = useMemo(() => createAppTheme({ agency }), [agency]);

  // const isMediumScreen = useMediaQuery((themex) => themex.breakpoints.down('xl'));

  useEffect(() => {
    if (pathname === '/signup') return;

    if (user) {
      navigate('/clients');
    } else {
      navigate('/login');
    }
  }, [user]);

  return (
    <ThemeProvider theme={theme}>
      {user && <NavBar />}
      <Stack
        sx={{
          minHeight: '100vh',
          width: '100%',
          overflowX: 'hidden',
        }}
      >
        {pathname !== '/login' && pathname !== '/signup' && <SidePanel />}

        <Box
          pt={user ? '64px' : 0}
          pb='48px'
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',

            // ml: '240px',
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
            // ml: '240px',
          }}
          direction='row'
          alignItems='center'
          justifyContent='center'
          spacing={1}
        >
          <Typography variant='caption' color='text.secondary'>
            Powered by
          </Typography>
          <Box component='img' src='fexdigital.png' sx={{ maxHeight: '30px', p: 1 }} />
        </Stack>
      </Stack>
    </ThemeProvider>
  );
};

export default App;
