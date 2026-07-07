// NavBar.jsx
import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  Box,
  Stack,
  Button,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import InviteAgentDialog from './InviteAgentDialog';
import ProfilePopover from './ProfilePopover';

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { stringToColor } from '../utils/helpers';
import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent.jsx';
import { supabase } from '../utils/supabase';
import { apiClient } from '../utils/query';

const drawerWidth = 220;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const { user, isAuthenticated } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const agentData = useAgent();
  const {
    data: accountData,
    isLoading: accountLoading,
    isError: accountError,
  } = useQuery({
    queryKey: ['account', user?.email, isAuthenticated],
    enabled: !!user?.email && isAuthenticated,
    retry: false,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      try {
        const response = await apiClient.request({
          method: 'GET',
          url: '/gsq-account',
          params: { email: user.email, mode: import.meta.env.MODE },
        });
        return response.data;
      } catch (error) {
        if (error?.response?.status === 404) return null;
        throw error;
      }
    },
  });

  const accountResolved = !user?.email || !accountLoading || accountError;
  const avatarSrc = accountResolved ? accountData?.imageUrl : undefined;

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

  const handleNavigate = (path) => {
    handleMenuClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    handleMenuClose();
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <>
      <InviteAgentDialog open={inviteOpen} setOpen={setInviteOpen} />
      <AppBar
        position='static'
        color='default'
        elevation={0}
        sx={{
          height: 64,
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          boxShadow: 5,
          bgcolor: 'transparent',
          borderBottom: '1px solid #E0E0E0',
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1 }} />

          <Button
            variant='outlined'
            size='small'
            startIcon={<PersonAddOutlinedIcon />}
            onClick={() => setInviteOpen(true)}
            sx={{ mr: 2, fontSize: 12 }}
          >
            Invite Agent
          </Button>

          <Stack
            direction='row'
            spacing={1}
            alignItems='center'
            sx={{ cursor: 'pointer' }}
            onClick={handleAvatarClick}
          >
            {user && agentData && accountResolved && (
              <>
                <Avatar
                  alt={agentData?.name}
                  src={avatarSrc || undefined}
                  sx={{
                    width: 36,
                    height: 36,
                    color: '#fff',
                    bgcolor: stringToColor(agentData?.name || ''),
                  }}
                >
                  <Typography variant='caption' textAlign='center'>
                    {getInitials(
                      agentData?.first_name + ' ' + agentData?.last_name,
                    )}
                  </Typography>
                </Avatar>
                <Typography variant='body2'>
                  {agentData?.first_name} {agentData?.last_name}
                </Typography>
              </>
            )}

            <ArrowDropDownIcon />
          </Stack>

          <ProfilePopover
            anchorEl={anchorEl}
            agentData={agentData}
            onClose={handleMenuClose}
            onNavigate={handleNavigate}
            onSignOut={handleSignOut}
            user={user}
            avatarSrc={avatarSrc}
          />
        </Toolbar>
      </AppBar>
    </>
  );
}
