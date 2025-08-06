// NavBar.jsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Box,
  Stack,
  Menu,
  MenuItem,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase'; // Ensure this path is correct

import { getAgent } from '../utils/query';
import { useQuery } from '@tanstack/react-query';

import useAuth from '../hooks/useAuth';

const drawerWidth = 240;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { user } = useAuth();

  const { data: agentData, isLoading } = useQuery({
    queryKey: ['agent'],
    queryFn: () => getAgent(user.uid),
  });

  console.log('Agent Data:', agentData);
  console.log('User:', user);

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  };

  return (
    <AppBar
      position='static'
      color='default'
      elevation={0}
      sx={{
        height: 64,
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
        boxShadow: 'none',
        bgcolor: 'transparent',
        borderBottom: '1px solid #E0E0E0',
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1 }} />

        <Stack
          direction='row'
          spacing={1}
          alignItems='center'
          sx={{ cursor: 'pointer' }}
          onClick={handleAvatarClick}
        >
          {user && agentData && (
            <>
              <Avatar
                alt={agentData?.name}
                src={agentData?.avatar}
                sx={{ width: 36, height: 36 }}
              />
              <Typography variant='body2'>{agentData.name}</Typography>
            </>
          )}

          <ArrowDropDownIcon />
        </Stack>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 150,
            },
          }}
        >
          <MenuItem onClick={handleSignOut}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
