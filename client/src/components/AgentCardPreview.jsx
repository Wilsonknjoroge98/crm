import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckIcon from '@mui/icons-material/Check';

import { stringToColor } from '../utils/helpers';

const dividerColor = '#d8dce3';

const getInitials = (name) => {
  if (!name) return '?';
  const words = name.trim().split(' ');
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

export default function AgentCardPreview({
  accountData,
  agentData,
  onClose,
  open,
}) {
  const name =
    accountData?.name ||
    agentData?.name ||
    [agentData?.first_name, agentData?.last_name].filter(Boolean).join(' ');
  const imageUrl = accountData?.imageUrl || agentData?.avatar;
  const specialties = accountData?.specialties || [];

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle>Agent Card Preview</DialogTitle>
      <DialogContent>
        <Paper
          variant='outlined'
          sx={{
            width: '100%',
            px: { xs: 2, sm: 3 },
            pt: { xs: 3, sm: 4 },
            pb: { xs: 4, sm: 5 },
            borderRadius: 1,
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          }}
        >
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
            <Box sx={{ flex: 1 }}>
              <Typography variant='h6' fontWeight={400} sx={{ mb: 2.5 }}>
                You've been matched with:
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                alignItems={{ sm: 'flex-start' }}
              >
                <Avatar
                  src={imageUrl}
                  alt={name}
                  sx={{
                    width: 168,
                    height: 168,
                    bgcolor: stringToColor(name || ''),
                    fontSize: 48,
                  }}
                >
                  {getInitials(name)}
                </Avatar>
                <Box>
                  <Typography variant='h5' fontWeight={750}>
                    {name || 'Your Name'}
                  </Typography>
                  {!!specialties.length && (
                    <Typography sx={{ mt: 1 }}>
                      {specialties.join(' - ')}
                    </Typography>
                  )}
                  {!!accountData?.npn && (
                    <Typography>
                      National Producer Number: {accountData.npn}
                    </Typography>
                  )}
                  {!!accountData?.bio && (
                    <Typography sx={{ mt: 2, fontStyle: 'italic', maxWidth: 640 }}>
                      "{accountData.bio}"
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>

            <Stack
              spacing={2.5}
              sx={{
                borderLeft: { md: `1px solid ${dividerColor}` },
                minWidth: { md: 280 },
                pt: { md: 5 },
                pb: { md: 2 },
                pl: { md: 4 },
              }}
            >
              <Stack
                direction='row'
                spacing={1.5}
                alignItems='center'
                color='success.main'
              >
                <Box
                  sx={{
                    bgcolor: '#e8f5e9',
                    borderRadius: '50%',
                    display: 'flex',
                    p: 0.75,
                  }}
                >
                  <CheckIcon />
                </Box>
                <Typography color='success.main'>
                  Verified and Licensed
                </Typography>
              </Stack>

              <Box sx={{ borderTop: `1px solid ${dividerColor}` }} />

              <Stack direction='row' spacing={1.5} alignItems='flex-start'>
                <AccessTimeIcon
                  sx={{ color: '#2f80d1', fontSize: 34, mt: 0.1 }}
                />
                <Box>
                  <Typography fontWeight={600}>Will reach out shortly</Typography>
                  <Typography>
                    Most agents connect
                    <br />
                    within the hour.
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
