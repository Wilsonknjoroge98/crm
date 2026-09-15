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
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import InviteAgentDialog from './InviteAgentDialog';
import ProfilePopover from './ProfilePopover';
import OffersPopover, { FREE_LEAD_OFFERS } from './OffersPopover';
import Pill from './Pill';

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { stringToColor } from '../utils/helpers';
import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent.jsx';
import { supabase } from '../utils/supabase';
import { apiClient, getOffers } from '../utils/query';

const drawerWidth = 220;
const MONO = '"JetBrains Mono", monospace';

const navPillSx = { px: 2.5, py: 1 };

const pillLabelSx = {
  fontFamily: MONO,
  fontWeight: 600,
  fontSize: '0.72rem',
  letterSpacing: '0.04em',
  color: 'inherit',
};

export default function NavBar() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [offersAnchorEl, setOffersAnchorEl] = React.useState(null);

  const { user, isAuthenticated } = useSelector((state) => state.user);
  const navigate = useNavigate();

  const agentData = useAgent();

  const { data: offers = [] } = useQuery({
    queryKey: ['offers'],
    queryFn: getOffers,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
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
          url: '/gsq',
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
        <Toolbar sx={{ minHeight: 64, px: 3 }}>
          <Box sx={{ flexGrow: 1 }} />

          {/* 1. Offers Trigger Button */}
          <Button
            size='small'
            variant='outlined'
            onClick={(event) => setOffersAnchorEl(event.currentTarget)}
            startIcon={
              <LocalOfferOutlinedIcon
                sx={{
                  fontSize: '0.95rem !important',
                  color: Boolean(offersAnchorEl)
                    ? 'action.main'
                    : 'text.secondary',
                  transition: 'color 0.15s ease',
                }}
              />
            }
            sx={{
              mr: 1.5,
              py: 0.5,
              px: 1.25,
              borderRadius: 1.5,
              textTransform: 'none',
              bgcolor: '#FFFFFF',
              borderColor: Boolean(offersAnchorEl) ? 'action.main' : '#E5E7EB',
              color: 'text.primary',
              boxShadow: Boolean(offersAnchorEl)
                ? '0 0 0 1px #D4AF37, 0 1px 3px rgba(0, 0, 0, 0.05)'
                : '0 1px 2px rgba(0, 0, 0, 0.03)',
              '&:hover': {
                borderColor: 'action.main',
                bgcolor: '#FFFFFF',
              },
            }}
          >
            <Stack direction='row' spacing={0.75} alignItems='center'>
              <Box
                component='span'
                sx={{
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 1,
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  fontFamily: MONO,
                  bgcolor: 'rgba(212, 175, 55, 0.15)',
                  color: '#7A5400',
                }}
              >
                {offers.length + FREE_LEAD_OFFERS.length}
              </Box>
              <Typography
                component='span'
                sx={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'text.primary',
                }}
              >
                {`Offer${offers.length + FREE_LEAD_OFFERS.length !== 1 ? 's' : ''}`}
              </Typography>
            </Stack>
          </Button>

          {/* 2. Invite Agent Button */}
          <Button
            size='small'
            variant='outlined'
            onClick={() => setInviteOpen(true)}
            startIcon={
              <PersonAddOutlinedIcon
                sx={{
                  fontSize: '0.95rem !important',
                  color: 'text.secondary',
                }}
              />
            }
            sx={{
              mr: 2.5,
              py: 0.5,
              px: 1.5,
              borderRadius: 1.5,
              textTransform: 'none',
              fontSize: '0.8125rem',
              fontWeight: 600,
              fontFamily: '"Inter", sans-serif',
              color: 'text.primary',
              bgcolor: '#FFFFFF',
              borderColor: '#E5E7EB',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
              '&:hover': {
                borderColor: '#051118',
                bgcolor: '#F9FAFB',
              },
            }}
          >
            Invite Agent
          </Button>

          {/* 3. User Profile Trigger */}
          <Stack
            direction='row'
            spacing={1.25}
            alignItems='center'
            sx={{
              cursor: 'pointer',
              p: 0.5,
              pr: 1,
              borderRadius: 2,
              transition: 'background-color 0.15s ease',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.03)' },
            }}
            onClick={handleAvatarClick}
          >
            {user && agentData && accountResolved && (
              <>
                <Avatar
                  alt={agentData?.name}
                  src={avatarSrc || undefined}
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#fff',
                    bgcolor: stringToColor(agentData?.name || ''),
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography variant='caption' sx={{ fontWeight: 700 }}>
                    {getInitials(
                      agentData?.first_name + ' ' + agentData?.last_name,
                    )}
                  </Typography>
                </Avatar>
                <Typography
                  variant='body2'
                  sx={{
                    fontWeight: 600,
                    color: 'text.primary',
                    fontFamily: 'Libre Baskerville, serif',
                  }}
                >
                  {agentData?.first_name} {agentData?.last_name}
                </Typography>
              </>
            )}
            <ArrowDropDownIcon
              sx={{ color: 'text.secondary', fontSize: '1.25rem' }}
            />
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

          <OffersPopover
            anchorEl={offersAnchorEl}
            offers={offers}
            onClose={() => setOffersAnchorEl(null)}
          />
        </Toolbar>
      </AppBar>
    </>
  );
}
