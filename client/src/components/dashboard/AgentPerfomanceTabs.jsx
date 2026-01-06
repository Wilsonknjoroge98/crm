import { useState } from 'react';
import { Tabs, Tab, Stack, Typography, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PremiumLeaderboardTab from './PremiumLeaderboardTab';
import PremiumPerLeadTab from './PremiumPerLeadTab';
import PersistencyRateTab from './PersistencyRateTab';
import CloseRateTab from './CloseRateTab';

const TabPanel = ({ value, index, children }) => {
  if (value !== index) return null;
  return <Box mt={2}>{children}</Box>;
};

const AgentPerformanceTabs = () => {
  const [tab, setTab] = useState(0);
  const theme = useTheme();

  return (
    <Stack
      elevation={0}
      sx={{
        borderRadius: 3,
      }}
    >
      <Typography variant='h5' fontWeight={700} mb={3}>
        Agent Performance
      </Typography>
      <Typography variant='caption' color='text.secondary' mb={2}></Typography>
      <Stack>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 36,
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: 2,
              backgroundColor: theme.palette.accent.main,
            },
          }}
        >
          <Tab
            label='Premium Total'
            sx={{
              fontWeight: 600,
              minHeight: 36,
            }}
          />

          <Tab
            label='Close Rate*'
            sx={{
              fontWeight: 600,
              minHeight: 36,
            }}
          />

          <Tab
            label='Persistency Rate'
            sx={{
              fontWeight: 600,
              minHeight: 36,
            }}
          />
          <Tab
            label='Premium / Lead*'
            sx={{
              fontWeight: 600,
              minHeight: 36,
            }}
          />
        </Tabs>

        {/* Content */}

        <TabPanel value={tab} index={0}>
          <PremiumLeaderboardTab />
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <CloseRateTab />
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <PersistencyRateTab />
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <PremiumPerLeadTab />
        </TabPanel>
      </Stack>
    </Stack>
  );
};

export default AgentPerformanceTabs;
