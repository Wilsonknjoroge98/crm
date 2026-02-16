// NavBar.jsx
import React from 'react';
import { AppBar, Toolbar, Typography, Avatar, Box, Stack, Menu, Button } from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountDetails from './AccountDetails';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase'; // Ensure this path is correct
import { supabase } from '../utils/supabase';
import { getAgent, getAccount } from '../utils/query';
import { useQuery } from '@tanstack/react-query';

import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

import { stringToColor } from '../utils/helpers';
import {useSelector} from "react-redux";
import {useAgent} from "../hooks/useAgent.jsx";

const drawerWidth = 240;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const navigate = useNavigate();
  const { user, userToken, isAuthenticated } = useSelector((state) => state.user)

  const agentData = useAgent();
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
      await supabase.auth.signOut();
      await signOut(auth);
      // sign out of supabase

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
              width: 300,
              height: 'fit-content',
              borderRadius: 2,
              p: 0,
            },
          }}
        >
          <Stack
            direction='column'
            justifyContent='space-between'
            alignItems='center'
            p={2}
            spacing={2}
          >
            {accountData && <AccountDetails data={accountData} />}
            <Stack direction='row' spacing={1} maxHeight={30}>
              {/* <Button
                variant='contained'
                onClick={() =>
                  window.open(
                    `https://buy.stripe.com/00w5kDcWE7k38cG9qt6Ri03?prefilled_email=${user?.email}`,
                    '_blank',
                  )
                }
                sx={{
                  bgcolor: (theme) => theme.palette.action.main,
                  color: (theme) => theme.palette.action.contrastText,
                  fontSize: 10,
                }}
              >
                Purchase Leads
              </Button> */}

              <Button
                variant='outlined'
                endIcon={<LogoutIcon />}
                sx={{
                  fontSize: 10,
                  boxShadow: 'none',
                }}
                onClick={handleSignOut}
              >
                Logout
              </Button>
            </Stack>
          </Stack>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
