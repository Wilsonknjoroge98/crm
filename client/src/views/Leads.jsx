import { Container, Typography, Stack, Button, Alert, TextField } from '@mui/material';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads, getAgents } from '../utils/query';
import { CSVLink } from 'react-csv';

import LeadsGrid from '../components/LeadsGrid';

import useAuth from '../hooks/useAuth';
import CreateClientDialog from '../components/CreateClientDialog';

const CSV_HEADERS = [
  { label: 'First Name', key: 'firstName' },
  { label: 'Last Name', key: 'lastName' },
  { label: 'Email', key: 'email' },
  { label: 'Phone', key: 'phone' },
  { label: 'Date of Birth', key: 'dob' },
  { label: 'Age', key: 'age' },
  { label: 'State', key: 'state' },
  { label: 'Smoker', key: 'smoker' },
  { label: 'Coverage Amount', key: 'faceAmount' },
  { label: 'Monthly Premium', key: 'premium' },
  { label: 'Selected Carrier', key: 'selectedCarrier' },
  { label: 'Selected Plan', key: 'selectedPlan' },
  { label: 'Beneficiary', key: 'beneficiary' },
  { label: 'Priority', key: 'priority' },
  { label: 'Reason', key: 'why' },
  { label: 'BMI', key: 'bmi' },
  { label: 'Cholesterol Medication', key: 'cholesterol' },
  { label: 'Blood Pressure Medication', key: 'bloodPressure' },
  { label: 'Verified', key: 'verified' },
  { label: 'Sold', key: 'sold' },
];

const Leads = () => {
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [lead, setLead] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { user, agent, userToken } = useAuth();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents({ token: userToken }),
  });

  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError,
  } = useQuery({
    queryKey: ['leads', user?.uid, agent?.role],
    queryFn: () =>
      getLeads({
        token: userToken,
        data: { agentId: user.uid, agentRole: agent.role, agency: agent?.agency },
      }),
    enabled: !!agent && !!userToken,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
  });

  const csvData = useMemo(() => {
    return leads.filter((lead) => {
      if (!lead.createdAtMs) return true;
      const fromMs = dateFrom ? new Date(dateFrom).getTime() : null;
      const toMs = dateTo ? new Date(dateTo).getTime() + 86399999 : null; // inclusive end of day
      if (fromMs && lead.createdAtMs < fromMs) return false;
      if (toMs && lead.createdAtMs > toMs) return false;
      return true;
    });
  }, [leads, dateFrom, dateTo]);

  const csvFilename = `leads${dateFrom ? `_from_${dateFrom}` : ''}${dateTo ? `_to_${dateTo}` : `_${new Date().toISOString().slice(0, 10)}`}.csv`;

  if (isError) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
        <Alert severity='error' sx={{ my: 2 }}>
          Failed to load leads. Please refresh or try again later.
        </Alert>
      </Stack>
    );
  }

  return (
    <>
      {createClientOpen && (
        <CreateClientDialog open={createClientOpen} setOpen={setCreateClientOpen} lead={lead} />
      )}
      <Container sx={{ mt: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ sm: 'center' }}
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Leads</Typography>
          <Stack direction='row' alignItems='center' spacing={1.5} flexWrap='wrap'>
            <TextField
              type='date'
              size='small'
              label='From'
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 148 }}
            />
            <TextField
              type='date'
              size='small'
              label='To'
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 148 }}
            />
            <CSVLink data={csvData} headers={CSV_HEADERS} filename={csvFilename}>
              <Button variant='outlined'>
                Export CSV{csvData.length !== leads.length ? ` (${csvData.length})` : ''}
              </Button>
            </CSVLink>
          </Stack>
        </Stack>
        <LeadsGrid
          setCreateClientOpen={setCreateClientOpen}
          setLead={setLead}
          agent={agent}
          leads={leads}
          leadsLoading={leadsLoading}
          agents={agents}
          showToolbar={true}
        />
      </Container>
    </>
  );
};

export default Leads;
