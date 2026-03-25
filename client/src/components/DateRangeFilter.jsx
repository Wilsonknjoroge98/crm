import { Stack, TextField } from '@mui/material';

const DateRangeFilter = ({ dateFrom, dateTo, onDateFromChange, onDateToChange }) => {
  return (
    <Stack direction='row' alignItems='center' spacing={1.5}>
      <TextField
        type='date'
        size='small'
        label='From'
        value={dateFrom}
        onChange={(e) => onDateFromChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 148 }}
      />
      <TextField
        type='date'
        size='small'
        label='To'
        value={dateTo}
        onChange={(e) => onDateToChange(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        sx={{ width: 148 }}
      />
    </Stack>
  );
};

export default DateRangeFilter;
