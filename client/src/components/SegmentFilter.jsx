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
import { SEGMENT_CHIPS } from '../utils/constants';

const SANS = '"Inter", sans-serif';
const BORDER = '#E5E7EB';
const INK = '#051118';
const SEGMENT_KEYS = Object.keys(SEGMENT_CHIPS);

// Multi-select Lead Age filter for the business toolbar. `value` and
// `onChange` carry gsq_segment keys (what the API whitelists); the trigger
// mirrors StateFilter and the menu shows each segment's card chip colors.
const SegmentFilter = ({ value = [], onChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const hasSelection = value.length > 0;

  // Labels in menu order, whatever order they were picked in.
  const selectedLabels = SEGMENT_KEYS.filter((key) => value.includes(key))
    .map((key) => SEGMENT_CHIPS[key].label)
    .join(', ');

  const handleClear = (event) => {
    event.stopPropagation();
    onChange([]);
  };

  const toggle = (key) => {
    onChange(
      value.includes(key)
        ? value.filter((selected) => selected !== key)
        : [...value, key],
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
          noWrap
          sx={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: '0.8125rem',
            color: hasSelection ? 'text.primary' : 'text.secondary',
            maxWidth: 220,
          }}
        >
          {hasSelection ? `Lead Age: ${selectedLabels}` : 'Lead Age'}
        </Typography>

        <Stack direction='row' alignItems='center' sx={{ ml: 'auto' }}>
          {hasSelection && (
            <IconButton
              component='span'
              size='small'
              aria-label='Clear lead age filter'
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
              borderRadius: 2,
              border: `1px solid ${BORDER}`,
              boxShadow: '0 8px 24px rgba(5, 17, 24, 0.08)',
              mt: 0.75,
            },
          },
        }}
      >
        {SEGMENT_KEYS.map((key) => {
          const { label, description, bgcolor, color } = SEGMENT_CHIPS[key];
          return (
            <MenuItem
              key={key}
              dense
              onClick={() => toggle(key)}
              sx={{ py: 0.5 }}
            >
              <Checkbox
                size='small'
                checked={value.includes(key)}
                tabIndex={-1}
                disableRipple
                sx={{ p: 0.5, mr: 1 }}
              />
              <ListItemText
                primary={
                  <Stack direction='row' spacing={1} alignItems='center'>
                    {/* Swatch in the card chip's tint, so the menu reads as
                        a key to the chips below. */}
                    <Box
                      component='span'
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor,
                        border: '1.5px solid',
                        borderColor: color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant='body2' sx={{ fontFamily: SANS }}>
                      {label}
                    </Typography>
                  </Stack>
                }
                slotProps={{
                  secondary: { sx: { fontFamily: SANS, ml: 2.25 } },
                }}
              />
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
};

export default SegmentFilter;
