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
  Button,
  Divider,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase'; // Ensure this path is correct

import { getAgent, getAccount } from '../utils/query';
import { useQuery } from '@tanstack/react-query';

import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

import { stringToColor } from '../utils/helpers';

const drawerWidth = 240;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const navigate = useNavigate();
  const { user, userToken, isAuthenticated } = useAuth();

  const { data: agentData } = useQuery({
    queryKey: ['agent', user?.uid, isAuthenticated],
    queryFn: () => getAgent({ token: userToken, data: { uid: user?.uid } }),
  });

  const { data: accountData } = useQuery({
    queryKey: ['account', user?.email, isAuthenticated],
    queryFn: () => getAccount({ email: user?.email, token: userToken }),
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
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
                sx={{
                  width: 36,
                  height: 36,
                  color: '#fff',
                  bgcolor: stringToColor(agentData?.name || ''),
                }}
              >
                <Typography variant='caption' textAlign='center'>
                  {getInitials(agentData?.name)}
                </Typography>
              </Avatar>
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
              width: 200, // custom width
              height: 200, // custom height
              borderRadius: 2,
              p: 2,
            },
          }}
        >
          <MenuItem onClick={handleSignOut}> Logout</MenuItem>
          <Divider />
          <MenuItem onClick={handleSignOut}>
            <Typography variant='body1'> Lead Count</Typography>
            <Typography variant='h6'>: {accountData?.leadCount || 0}</Typography>
          </MenuItem>
          <MenuItem onClick={handleSignOut}>
            <Button
              variant='contained'
              onClick={() =>
                window.open(
                  `https://buy.stripe.com/14AdR909SfQz0KedGJ6Ri00?prefilled_email=${user?.email}`,
                  '_blank',
                )
              }
              sx={{
                bgcolor: (theme) => theme.palette.action.main,
                color: (theme) => theme.palette.action.contrastText,
              }}
            >
              {' '}
              Buy Leads
            </Button>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
