import { Box, Grid, Typography, Divider, Container, Stack, Button } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPremiumLeaderboard } from '../utils/query';
import useAuth from '../hooks/useAuth';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useState } from 'react';
import { MoonLoader } from 'react-spinners';

const DateSelector = ({
  startDate,
  endDate,
  handleStartChange,
  handleEndChange,
  refetchFunction,
  isLoading,
}) => {
  return (
    <>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Stack direction={'row'} spacing={1} alignItems='center'>
            <DatePicker
              label='Start Date'
              value={startDate ? dayjs(startDate) : null}
              onChange={handleStartChange}
              slotProps={{
                textField: {
                  size: 'small',
                  variant: 'outlined',
                  sx: { maxWidth: 175 },
                },
              }}
            />
            <DatePicker
              label='End Date'
              value={endDate ? dayjs(endDate) : null}
              onChange={handleEndChange}
              slotProps={{
                textField: {
                  size: 'small',
                  variant: 'outlined',
                  sx: { maxWidth: 175 },
                },
              }}
            />
          </Stack>
          <Button
            variant='contained'
            color='action'
            startIcon={<RefreshIcon />}
            onClick={() => refetchFunction()}
            sx={{ ml: 2, ...(isLoading ? { opacity: 0.1 } : {}) }}
            disabled={isLoading}
          >
            Apply
          </Button>
        </Box>
      </LocalizationProvider>
    </>
  );
};

export default DateSelector;
