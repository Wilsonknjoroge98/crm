import { useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Grid,
  Typography,
  Stack,
  Container,
  Tab,
  Tabs,
  Switch,
  FormControlLabel,
} from '@mui/material';

import DateSelector from '../components/DateSelector';
import dayjs from 'dayjs';
import PoliciesDrawer from '../components/PoliciesDrawer';
import OrgChart from '../components/OrgChart';
import TeamLeaderboard from '../components/TeamLeaderboard';
import TeamSummary from '../components/TeamSummary';
import PersonalSummary from '../components/PersonalSummary';
import Events from '../components/Events';
import ProductionIntroDialog, {
  STORAGE_KEY,
} from '../components/ProductionIntroDialog';
import { useSelector } from 'react-redux';

const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';

const Production = () => {
  const { user } = useSelector((state) => state.user);
  const isSuperuser = user?.id === SUPERUSER_ID;

  const [startDate, setStartDate] = useState(
    dayjs().add(-180, 'day').format('YYYY-MM-DD'),
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [gsqOnly, setGsqOnly] = useState(false);
  const [introOpen, setIntroOpen] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== 'true',
  );

  const isLoading = false;

  const [value, setValue] = useState(0);
  const [nameFilter, setNameFilter] = useState('');
  const handleChange = (event, newValue) => {
    setValue(newValue);
    setNameFilter('');
  };

  return (
    <Container sx={{ borderRadius: 2, p: 3 }}>
      <ProductionIntroDialog open={introOpen} setOpen={setIntroOpen} />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        spacing={2}
        mb={2}
      >
        <Typography variant='h4'>Production</Typography>
        <DateSelector
          startDate={startDate}
          endDate={endDate}
          handleStartChange={setStartDate}
          handleEndChange={setEndDate}
          refetchFunction={() =>
            console.log('Refetch with', { startDate, endDate })
          }
          isLoading={isLoading}
        />
      </Stack>
      <PoliciesDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        selectedAgent={selectedAgent}
        startDate={startDate}
        endDate={endDate}
      />

      <Tabs value={value} onChange={handleChange}>
        <Tab label='Team' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
        <Tab label='Personal' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
        <Tab label='Hierarchy' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
      </Tabs>

      <Grid container spacing={3} my={4}>
        {/* Summary stats — full-width top row */}
        {value === 0 && (
          <Grid size={12}>
            <TeamSummary startDate={startDate} endDate={endDate} />
          </Grid>
        )}
        {value === 1 && (
          <Grid size={12}>
            <PersonalSummary startDate={startDate} endDate={endDate} />
          </Grid>
        )}

        {/* Search field + GSQ toggle — above leaderboard column */}
        {(value === 0 || value === 1) && (
          <Grid size={8}>
            <Stack direction='row' alignItems='center' spacing={2}>
              <TextField
                size='small'
                placeholder='Agent name'
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                sx={{ maxWidth: 280 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon fontSize='small' />
                    </InputAdornment>
                  ),
                }}
              />
              {isSuperuser && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={gsqOnly}
                      onChange={(e) => setGsqOnly(e.target.checked)}
                      size='small'
                    />
                  }
                  label={
                    <Typography variant='body2' fontWeight={gsqOnly ? 600 : 400}>
                      GSQ
                    </Typography>
                  }
                />
              )}
            </Stack>
          </Grid>
        )}

        {/* Leaderboard + Events — same row, tops naturally flush */}
        {(value === 0 || value === 1) && (
          <>
            <Grid size={8}>
              <TeamLeaderboard
                nameFilter={nameFilter}
                startDate={startDate}
                endDate={endDate}
                setSelectedAgent={setSelectedAgent}
                setDrawerOpen={setDrawerOpen}
                gsqOnly={gsqOnly}
              />
            </Grid>
            <Grid size={4}>
              <Events />
            </Grid>
          </>
        )}

        {value === 2 && (
          <Grid size={12}>
            <Box sx={{ width: '100%', height: 300 }}>
              <OrgChart startDate={startDate} endDate={endDate} />
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default Production;
