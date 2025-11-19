import './App.css';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';

import SidePanel from './components/SidePanel';
import NavBar from './components/NavBar';

import Typography from '@mui/material/Typography';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import useAuth from './hooks/useAuth';
import { useEffect } from 'react';

// import Maintenance from './views/Maintenance';
const App = () => {
  // return <Maintenance />;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isMediumScreen = useMediaQuery((theme) => theme.breakpoints.down('xl'));

  useEffect(() => {
    if (pathname === '/signup') return;

    if (user) {
      navigate('/clients');
    } else {
      navigate('/login');
    }
  }, [user]);

  return (
    <>
      {user && <NavBar />}
      <Stack
        sx={{
          minHeight: '100vh',
          width: '100%',
          overflowX: 'hidden',
        }}
      >
        <SidePanel />
        <Box
          pt={user ? '64px' : 0}
          pb='48px'
          sx={{
            flex: 1,
            ml: '240px',
            mt: user ? 0 : isMediumScreen ? 3 : 20,
          }}
        >
          <Outlet />
        </Box>

        {/* Footer */}
        <Stack
          sx={{
            pb: 3,
            mt: 'auto',
            ml: '240px',
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
    </>
  );
};

export default App;
