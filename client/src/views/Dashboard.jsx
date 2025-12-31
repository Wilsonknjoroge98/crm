import { Box, Grid, Typography, Divider } from '@mui/material';
import PremiumChart from '../components/dashboard/PremiumGrowthChart';
import PolicyDistributionChart from '../components/dashboard/PolicyDistributionChart';
import AgentPerformanceTabs from '../components/dashboard/AgentPerfomanceTabs';

const Dashboard = () => {
  return (
    <Box sx={{ width: '90%', maxWidth: '1200px', mb: 4 }}>
      <Typography variant='h5' fontWeight={700} mb={3}>
        Agency Overview
      </Typography>

      {/* KPI Snapshot */}
      <Grid container spacing={2} mb={3}>
        <Grid size={6} md={3}>
          <PremiumChart />
        </Grid>

        <Grid size={6} md={3}>
          <PolicyDistributionChart />
        </Grid>

        <Grid size={12}>
          <Divider orientation='horizontal' flexItem sx={{ my: 2 }} />
        </Grid>
      </Grid>

      <AgentPerformanceTabs />
    </Box>
  );
};

export default Dashboard;
