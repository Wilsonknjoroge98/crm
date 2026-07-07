import React from 'react';
import {
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';

import { stringToColor } from '../utils/helpers';

export default function ProfilePopover({
  anchorEl,
  agentData,
  onClose,
  onNavigate,
  onSignOut,
  user,
}) {
  const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 260,
          height: 'fit-content',
          borderRadius: 2,
          p: 0,
        },
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Stack alignItems='center' spacing={1}>
          <Typography variant='caption' color='text.secondary'>
            {user?.email}
          </Typography>
          <Avatar
            src={agentData?.avatar}
            sx={{
              width: 72,
              height: 72,
              bgcolor: stringToColor(agentData?.name || ''),
              fontSize: 24,
            }}
          >
            {getInitials(agentData?.name)}
          </Avatar>
          <Typography variant='subtitle1' fontWeight={600}>
            {agentData?.first_name} {agentData?.last_name}
          </Typography>
        </Stack>
      </Box>
      <Divider sx={{ borderColor: 'grey.300' }} />
      <MenuItem onClick={() => onNavigate('/profile')}>
        <ListItemIcon>
          <AccountCircleOutlinedIcon fontSize='small' />
        </ListItemIcon>
        Profile
      </MenuItem>
      <MenuItem onClick={() => onNavigate('/reset-password')}>
        <ListItemIcon>
          <LockOpenOutlinedIcon fontSize='small' />
        </ListItemIcon>
        Reset Password
      </MenuItem>
      <Divider sx={{ borderColor: 'grey.300' }} />
      <MenuItem onClick={onSignOut} sx={{ color: 'error.main' }}>
        <ListItemIcon>
          <LogoutOutlinedIcon fontSize='small' color='error' />
        </ListItemIcon>
        Sign Out
      </MenuItem>
    </Menu>
  );
}
