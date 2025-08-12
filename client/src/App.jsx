import './App.css';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';

import SidePanel from './components/SidePanel';
import NavBar from './components/NavBar';

import Typography from '@mui/material/Typography';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import Maintenance from './views/Maintenance';

import useAuth from './hooks/useAuth';
import { useEffect } from 'react';

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
  }, [user, navigate]);

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
            p: 2,
            mt: 'auto',
            ml: '240px',
          }}
          direction='row'
          alignItems='center'
          justifyContent='center'
          spacing={1}
        >
          <Typography variant='body2' color='text.secondary'>
            Powered by <strong>Final Expense Digital</strong>
          </Typography>
          <Box component='img' src='fedigital.png' sx={{ maxHeight: '35px' }} />
        </Stack>
      </Stack>
    </>
  );
};

export default App;
