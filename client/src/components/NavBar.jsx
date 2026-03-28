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
  Button,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import AccountDetails from './AccountDetails';
import InviteAgentDialog from './InviteAgentDialog';
import { getAccount } from '../utils/query';
import { useQuery } from '@tanstack/react-query';

import { useNavigate } from 'react-router-dom';

import { stringToColor } from '../utils/helpers';
import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent.jsx';

const drawerWidth = 220;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const { user, userToken, isAuthenticated } = useSelector(
    (state) => state.user,
  );

  const agentData = useAgent();
  const { data: accountData } = useQuery({
    queryKey: ['account', user?.email, isAuthenticated],
    queryFn: () => getAccount({ email: user?.email, token: userToken }),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    enabled: !!user?.email && isAuthenticated,
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
          <Stack
            direction='column'
            justifyContent='space-between'
            alignItems='center'
            p={2}
            spacing={2}
          >
            <AccountDetails data={accountData} />
          </Stack>
        </Menu>
      </Toolbar>
    </AppBar>
    </>
  );
}
