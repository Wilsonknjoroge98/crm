import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const BORDER = '#E5E7EB';
const INK = '#051118';
const VISIBLE_CODES = 2;

// Multi-select state filter for the business toolbar. `value` and `onChange`
// carry full state names (what the API whitelists); the trigger and menu show
// the two-letter code next to each name.
const StateFilter = ({ value = [], onChange, options = [] }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const hasSelection = value.length > 0;

  const codeByName = new Map(options.map(({ name, code }) => [name, code]));
  const selectedCodes = value.map((name) => codeByName.get(name) ?? name);
  const visibleCodes = selectedCodes.slice(0, VISIBLE_CODES).join(', ');
  const overflowCount = selectedCodes.length - VISIBLE_CODES;

  const handleClear = (event) => {
    event.stopPropagation();
    onChange([]);
  };

  const toggle = (name) => {
    onChange(
      value.includes(name)
        ? value.filter((selected) => selected !== name)
        : [...value, name],
    );
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
          sx={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: hasSelection ? 'text.primary' : 'text.secondary',
          }}
        >
          {hasSelection ? 'States:' : 'All States'}
        </Typography>

        {hasSelection && (
          <Stack direction='row' spacing={0.5} alignItems='center'>
            <Typography
              component='span'
              sx={{
                fontFamily: MONO,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {visibleCodes}
            </Typography>
            {overflowCount > 0 && (
              <Box
                component='span'
                sx={{
                  fontFamily: MONO,
                  fontSize: '0.675rem',
                  fontWeight: 700,
                  bgcolor: '#F3F4F6',
                  color: 'text.secondary',
                  px: 0.6,
                  py: 0.1,
                  borderRadius: 1,
                  border: `1px solid ${BORDER}`,
                }}
              >
                +{overflowCount}
              </Box>
            )}
          </Stack>
        )}

        <Stack direction='row' alignItems='center' sx={{ ml: 'auto' }}>
          {hasSelection && (
            <IconButton
              component='span'
              size='small'
              aria-label='Clear state filter'
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
              width: 240,
              maxHeight: 320,
              borderRadius: 2,
              border: `1px solid ${BORDER}`,
              boxShadow: '0 8px 24px rgba(5, 17, 24, 0.08)',
              mt: 0.75,
            },
          },
        }}
      >
        {options.map(({ name, code }) => {
          const checked = value.includes(name);
          return (
            <MenuItem
              key={name}
              dense
              onClick={() => toggle(name)}
              sx={{ py: 0.5 }}
            >
              <Checkbox
                size='small'
                checked={checked}
                tabIndex={-1}
                disableRipple
                sx={{ p: 0.5, mr: 1 }}
              />
              <ListItemText
                primary={
                  <Typography variant='body2' sx={{ fontFamily: SANS }}>
                    <Box
                      component='span'
                      sx={{ fontFamily: MONO, fontWeight: 700, mr: 1 }}
                    >
                      {code}
                    </Box>
                    {name}
                  </Typography>
                }
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default StateFilter;
