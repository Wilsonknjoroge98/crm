import { useState } from 'react';
import {
  Button,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

const SANS = '"Inter", sans-serif';
const BORDER = '#E5E7EB';
const INK = '#051118';

const agentName = (agent) =>
  [agent.first_name, agent.last_name].filter(Boolean).join(' ') ||
  agent.email ||
  'Unnamed agent';

// Single-select agent filter for the business toolbar, styled to match the
// StateFilter trigger. `value` is an agent id, or null for every agent.
const AgentFilter = ({ value = null, onChange, agents = [] }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const sortedAgents = [...agents].sort((a, b) =>
    agentName(a).localeCompare(agentName(b)),
  );
  const selected = agents.find((agent) => agent.id === value);
  const hasSelection = Boolean(selected);

  const handleClear = (event) => {
    event.stopPropagation();
    onChange(null);
  };

  const select = (id) => {
    onChange(id);
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        size='small'
        onClick={(event) => setAnchorEl(event.currentTarget)}
        disableRipple
        aria-haspopup='listbox'
        aria-expanded={open}
        sx={{
          height: 38,
          px: 1.5,
          borderRadius: 1.5,
          border: `1px solid ${hasSelection ? INK : BORDER}`,
          bgcolor: '#FFFFFF',
          textTransform: 'none',
          color: 'text.primary',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          '&:hover': { bgcolor: '#FFFFFF', borderColor: INK },
        }}
      >
        <Typography
          variant='body2'
          noWrap
          sx={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: hasSelection ? 'text.primary' : 'text.secondary',
            maxWidth: 180,
          }}
        >
          {hasSelection ? `Agent: ${agentName(selected)}` : 'All Agents'}
        </Typography>

        <Stack direction='row' alignItems='center' sx={{ ml: 'auto' }}>
          {hasSelection && (
            <IconButton
              component='span'
              size='small'
              aria-label='Clear agent filter'
              onClick={handleClear}
              sx={{
                p: 0.25,
                mr: 0.25,
                color: 'text.disabled',
                '&:hover': { color: 'text.primary' },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          )}
          <KeyboardArrowDownRoundedIcon
            sx={{
              fontSize: '1.1rem',
              color: 'text.secondary',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </Stack>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          paper: {
            sx: {
              width: 260,
              maxHeight: 320,
              borderRadius: 2,
              border: `1px solid ${BORDER}`,
              boxShadow: '0 8px 24px rgba(5, 17, 24, 0.08)',
              mt: 0.75,
            },
          },
        }}
      >
        {[{ id: null, label: 'All Agents' }]
          .concat(
            sortedAgents.map((agent) => ({
              id: agent.id,
              label: agentName(agent),
            })),
          )
          .map(({ id, label }) => (
            <MenuItem
              key={id ?? 'all'}
              dense
              selected={id === value}
              onClick={() => select(id)}
              sx={{ py: 0.75, gap: 1 }}
            >
              <CheckRoundedIcon
                sx={{
                  fontSize: '1rem',
                  visibility: id === value ? 'visible' : 'hidden',
                }}
              />
              <Typography variant='body2' noWrap sx={{ fontFamily: SANS }}>
                {label}
              </Typography>
            </MenuItem>
          ))}
      </Menu>
    </>
  );
};

export default AgentFilter;
