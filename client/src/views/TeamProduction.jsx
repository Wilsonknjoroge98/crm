import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  Typography,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  useTheme,
  Container,
  Chip,
  Tab,
  Tabs,
  Divider,
  IconButton,
  Skeleton,
  Button,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from '@mui/material';
import { stringToColor } from '../utils/helpers';

import {
  CheckCircle as PolicyIcon,
  PersonAdd as LeadIcon,
  MonetizationOn as PremiumIcon,
} from '@mui/icons-material';

import DateSelector from '../components/DateSelector';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import dayjs from 'dayjs';
import PoliciesDrawer from '../components/PoliciesDrawer';
import OrgChart from '../components/OrgChart';
import TeamLeaderboard from '../components/TeamLeaderboard';

const TeamProduction = () => {
  const [startDate, setStartDate] = useState(dayjs().add(-7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const KPIItem = ({ title, value, icon }) => (
    <Grid>
      <Card
        variant='outlined'
        sx={{ p: 2, borderRadius: 2, bgcolor: 'background.default', boxShadow: 1 }}
      >
        <Stack direction='row' spacing={2} alignItems='center'>
          <Avatar sx={{ bgcolor: 'primary.light', borderRadius: 2 }}>{icon}</Avatar>
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ fontWeight: 600, textTransform: 'uppercase' }}
            >
              {title}
            </Typography>
            <Typography variant='h6' sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
          </Box>
        </Stack>
      </Card>
    </Grid>
  );

  const CompactActivityItem = ({ agent, action, time, amount }) => {
    return (
      <Box
        sx={{
          'py': 1,
          'display': 'flex',
          'alignItems': 'flex-start',
          'justifyContent': 'space-between',
          'borderBottom': '1px solid',
          'borderColor': 'divider',
          '&:last-child': { border: 0, pb: 0 },
          '&:first-of-type': { pt: 0 },
        }}
      >
        <Box sx={{ pr: 1 }}>
          <Typography variant='caption' sx={{ display: 'block', lineHeight: 1.2 }}>
            <Box component='span' sx={{ fontWeight: 700, color: 'text.primary' }}>
              {agent}
            </Box>{' '}
            <Box component='span' sx={{ color: 'text.secondary' }}>
              {action}
            </Box>
          </Typography>

          <Typography variant='caption' sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
            {time}
          </Typography>
        </Box>

        {amount && (
          <Typography
            variant='caption'
            sx={{
              fontWeight: 800,
              color: 'success.main',
              bgcolor: 'success.lighter', // If your theme supports it, or use alpha(theme.palette.success.main, 0.1)
              px: 0.75,
              py: 0.25,
              borderRadius: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {amount}
          </Typography>
        )}
      </Box>
    );
  };

  const isLoading = false; // Replace with actual loading state

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
          refetchFunction={() => console.log('Refetch with', { startDate, endDate })}
          isLoading={isLoading}
        />
      </Stack>
      <PoliciesDrawer
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        selectedAgent={selectedAgent}
      />

      <Tabs value={value} onChange={handleChange}>
        <Tab label='Team Summary' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
        <Tab label='Personal Summary' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
        <Tab label='Org Chart' sx={{ letterSpacing: 1, fontSize: '.875rem' }} />
      </Tabs>

      <Grid container spacing={3} my={4}>
        <Grid container size={9}>
          {value === 0 && (
            <>
              <KPIItem title='Clients' value='42' icon={<PeopleAltOutlinedIcon />} />
              <KPIItem title='Policies' value='41' icon={<ArticleOutlinedIcon />} />
              <KPIItem
                title='Total Premium'
                value='$158,000'
                icon={<MonetizationOnOutlinedIcon />}
              />
              <KPIItem title='Avg Premium/Policy' value='$3,853' icon={<TrendingUpIcon />} />
              {/* <KPIItem title='Avg Premium/Agent' value='$3,853' icon={<TrendingUpIcon />} /> */}
            </>
          )}

          {value === 1 && (
            <>
              <KPIItem title='Clients' value='4' icon={<PeopleAltOutlinedIcon />} />
              <KPIItem title='Policies' value='3' icon={<ArticleOutlinedIcon />} />
              <KPIItem title='Total Premium' value='$4,411' icon={<MonetizationOnOutlinedIcon />} />
              <KPIItem title='Avg Premium/Policy' value='$1,470' icon={<TrendingUpIcon />} />
            </>
          )}

          {value === 2 && (
            <Box sx={{ width: '100%', height: 300 }}>
              <OrgChart />
            </Box>
          )}
        </Grid>

        <Grid size={3}>
          <Typography
            variant='caption'
            color='text.secondary'
            fontWeight='bold'
            sx={{ mb: 1, display: 'block' }}
          >
            LATEST UPDATES
          </Typography>
          <Box sx={{ overflowY: 'auto', height: '100%' }}>
            <CompactActivityItem
              agent='Linda W.'
              action='New Policy Uploaded'
              time='45m ago'
              amount='$5,230'
              icon={<PolicyIcon sx={{ color: 'success.main' }} />}
            />
            <CompactActivityItem
              agent='Alex T.'
              action='New Policy Uploaded'
              time='7h ago'
              amount='$1,523'
              icon={<PolicyIcon sx={{ color: 'success.main' }} />}
            />
            <CompactActivityItem
              agent='Mike R.'
              action='Policy Effective'
              time='2d ago'
              amount='$9,523'
              icon={<PolicyIcon sx={{ color: 'success.main' }} />}
            />
          </Box>
        </Grid>
      </Grid>
      {value === 0 && (
        <TeamLeaderboard setSelectedAgent={setSelectedAgent} setDrawerOpen={setDrawerOpen} />
      )}
    </Container>
  );
};

export default TeamProduction;
