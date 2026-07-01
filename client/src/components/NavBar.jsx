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

import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent.jsx';
import { supabase } from '../utils/supabase';
import { useQuery } from '@tanstack/react-query';
import { getAccount } from '../utils/query';

const drawerWidth = 220;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const agentData = useAgent();
  const { data: accountData } = useQuery({
    queryKey: ['account', user?.email],
    queryFn: () => getAccount({ email: user?.email }),
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 5,
  });

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
            {user && agentData && (
              <>
                <Avatar
                  alt={agentData?.name}
                  src={accountData?.imageUrl || agentData?.avatar}
                  sx={{
                    width: 36,
                    height: 36,
                    color: '#fff',
                    bgcolor: 'transparent',
                  }}
                />
                <Typography variant='body2'>
                  {agentData?.first_name} {agentData?.last_name}
                </Typography>
              </>
            )}

            <ArrowDropDownIcon />
          </Stack>

          <ProfilePopover
            anchorEl={anchorEl}
            accountData={accountData}
            agentData={agentData}
            onClose={handleMenuClose}
            onNavigate={handleNavigate}
            onSignOut={handleSignOut}
            user={user}
          />
        </Toolbar>
      </AppBar>
    </>
  );
}
