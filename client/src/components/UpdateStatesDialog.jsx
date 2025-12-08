import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Box,
  Stack,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
} from '@mui/material';
import { useState } from 'react';
import useAuth from '../hooks/useAuth';

const ALL_STATES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
];

export default function UpdateStatesDialog({ open, onClose, states = [], mutate }) {
  const [currentStates, setCurrentStates] = useState(states);
  const { userToken, agent } = useAuth();

  const handleAdd = (val) => {
    if (!val) return;
    if (currentStates.includes(val)) return;

    setCurrentStates((prev) => [...prev, val]);
  };

  const handleDelete = (state) => {
    setCurrentStates((prev) => prev.filter((s) => s !== state));
  };

  const handleSave = () => {
    mutate({
      token: userToken,
      data: {
        email: agent?.email,
        states: currentStates,
      },
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Update Licensed States</DialogTitle>

      <DialogContent>
        {/* Current States Display */}
        <Stack spacing={2} mt={1}>
          <Typography variant='body2' color='text.secondary'>
            Current States:
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {currentStates.length === 0 && (
              <Typography variant='body2' color='text.secondary'>
                No states added
              </Typography>
            )}

            {currentStates.map((st) => (
              <Chip key={st} label={st} onDelete={() => handleDelete(st)} />
            ))}
          </Box>

          {/* Add State */}
          <FormControl size='small' fullWidth>
            <InputLabel>Add State</InputLabel>
            <Select label='Add State' value='' onChange={(e) => handleAdd(e.target.value)}>
              {ALL_STATES.map((st) => (
                <MenuItem key={st} value={st} disabled={currentStates.includes(st)}>
                  {st}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant='contained' color='action' onClick={handleSave}>
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
