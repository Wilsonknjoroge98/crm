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
  Alert,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import AccountDetails from './AccountDetails';
import { getAccount, createInvite } from '../utils/query';
import { useQuery, useMutation } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';

import { useNavigate } from 'react-router-dom';

import { stringToColor } from '../utils/helpers';
import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent.jsx';

const drawerWidth = 240;

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const { mutate: generateInvite, isPending: inviteLoading } = useMutation({
    mutationFn: createInvite,
    onSuccess: (data) => {
      const link = `${window.location.origin}/signup?token=${data.token}`;
      navigator.clipboard.writeText(link);
      enqueueSnackbar(
        'Invite link copied to clipboard',
        SNACKBAR_SUCCESS_OPTIONS,
      );
    },
    onError: () =>
      enqueueSnackbar('Failed to generate invite link', SNACKBAR_ERROR_OPTIONS),
  });

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
        // borderBottom: '1px solid #E0E0E0',
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant='outlined'
          size='small'
          startIcon={<PersonAddOutlinedIcon />}
          onClick={() => generateInvite()}
          disabled={inviteLoading}
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
            {accountData ? (
              <AccountDetails data={accountData} />
            ) : (
              <Stack>
                <Alert severity='error'>Unable to find account</Alert>
              </Stack>
            )}
          </Stack>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
