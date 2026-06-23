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
  ListItemIcon,
  Divider,
  Button,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import InviteAgentDialog from './InviteAgentDialog';

import { useNavigate } from 'react-router-dom';

import { stringToColor } from '../utils/helpers';
import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent.jsx';
import { supabase } from '../utils/supabase';

const drawerWidth = 220;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const { user } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const agentData = useAgent();

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
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant='caption' color='text.secondary'>
              {user?.email}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => handleNavigate('/profile')}>
            <ListItemIcon>
              <AccountCircleOutlinedIcon fontSize='small' />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={() => handleNavigate('/reset-password')}>
            <ListItemIcon>
              <LockOpenOutlinedIcon fontSize='small' />
            </ListItemIcon>
            Reset Password
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <LogoutOutlinedIcon fontSize='small' color='error' />
            </ListItemIcon>
            Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
    </>
  );
}
