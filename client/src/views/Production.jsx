import { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Stack,
  Container,
  Tab,
  Tabs,
} from '@mui/material';

import DateSelector from '../components/DateSelector';
import dayjs from 'dayjs';
import PoliciesDrawer from '../components/PoliciesDrawer';
import OrgChart from '../components/OrgChart';
import TeamLeaderboard from '../components/TeamLeaderboard';
import TeamSummary from '../components/TeamSummary';
import PersonalSummary from '../components/PersonalSummary';
import Events from '../components/Events';

const Production = () => {
  const [startDate, setStartDate] = useState(
    dayjs().add(-7, 'day').format('YYYY-MM-DD'),
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const isLoading = false;

  const [value, setValue] = useState(0);
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Container sx={{ borderRadius: 2, p: 3 }}>
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
      />

      <Tabs value={value} onChange={handleChange}>
        <Tab
          label='Team Summary'
          sx={{ letterSpacing: 1, fontSize: '.875rem' }}
        />
        <Tab
          label='Personal Summary'
          sx={{ letterSpacing: 1, fontSize: '.875rem' }}
        />
        <Tab label='Org Chart' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
      </Tabs>

      <Grid container spacing={3} my={4}>
        <Grid container size={9}>
          {value === 0 && (
            <>
              <TeamSummary startDate={startDate} endDate={endDate} />
            </>
          )}

          {value === 1 && (
            <PersonalSummary startDate={startDate} endDate={endDate} />
          )}

          {value === 2 && (
            <Box sx={{ width: '100%', height: 300 }}>
              <OrgChart />
            </Box>
          )}
        </Grid>

        <Grid size={3}>
          <Events />
        </Grid>
      </Grid>
      {(value === 0 || value === 1) && (
        <TeamLeaderboard
          startDate={startDate}
          endDate={endDate}
          setSelectedAgent={setSelectedAgent}
          setDrawerOpen={setDrawerOpen}
        />
      )}
    </Container>
  );
};

export default Production;
