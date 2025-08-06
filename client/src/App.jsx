import './App.css';

import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

import SidePanel from './components/SidePanel';
import NavBar from './components/NavBar';

import { Outlet } from 'react-router-dom';

const App = () => {
  return (
    <>
      <NavBar />
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
          {/* Adjust for fixed NavBar + Drawer */}
          <Outlet />
        </Box>
      </Stack>
    </>
  );
};

export default App;
