import './App.css';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

import SidePanel from './components/SidePanel';
import NavBar from './components/NavBar';

import Typography from '@mui/material/Typography';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import useAuth from './hooks/useAuth';
import { useEffect } from 'react';

const App = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

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
        <Box sx={{ flex: 1, ml: '240px', pt: '64px' }}>
          {' '}
          <Outlet />
          <Stack
            sx={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              width: '100%',
              p: 2,
            }}
            direction='row'
            alignItems='center'
            alignSelf='center'
            spacing={1}
          >
            <Typography
              sx={{ fontFamily: 'Space Grotesk', fontStyle: 'serif' }}
              variant='body2'
              color='text.secondary'
              align='center'
            >
              Powered by <strong>Final Expense Digital</strong>
            </Typography>
            <Box
              component='img'
              src='fedigital.png'
              sx={{ maxHeight: '30px' }}
            />
          </Stack>
        </Box>
      </Stack>
    </>
  );
};

export default App;
