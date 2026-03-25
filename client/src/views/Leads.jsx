import { Container, Typography, Stack, Button, Alert } from '@mui/material';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads, getAgents } from '../utils/query';
import { CSVLink } from 'react-csv';

import LeadsGrid from '../components/LeadsGrid';
import DateRangeFilter from '../components/DateRangeFilter';

import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent';
import CreateClientDialog from '../components/CreateClientDialog';

const CSV_HEADERS = [
  { label: 'First Name', key: 'first_name' },
  { label: 'Last Name', key: 'last_name' },
  { label: 'Email', key: 'email' },
  { label: 'Phone', key: 'phone' },
  { label: 'Date of Birth', key: 'date_of_birth' },
  { label: 'Age', key: 'age' },
  { label: 'State', key: 'state' },
  { label: 'Smoker', key: 'smoker' },
  { label: 'Coverage Amount', key: 'face_amount' },
  { label: 'Monthly Premium', key: 'premium' },
  { label: 'Selected Carrier', key: 'selected_carrier' },
  { label: 'Selected Plan', key: 'selected_plan' },
  { label: 'Beneficiary', key: 'beneficiary' },
  { label: 'Priority', key: 'priority' },
  { label: 'Reason', key: 'why' },
  { label: 'BMI', key: 'bmi' },
  { label: 'Cholesterol Medication', key: 'cholesterol_medication' },
  { label: 'Blood Pressure Medication', key: 'blood_pressure_medication' },
  { label: 'Verified', key: 'verified' },
  { label: 'Lead Vendor', key: 'lead_vendor_name' },
  { label: 'Sold', key: 'sold' },
];

const Leads = () => {
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [lead, setLead] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { user } = useSelector((state) => state.user);
  const agent = useAgent();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  const {
    data: leads = [],
    isLoading: leadsLoading,
    isError,
  } = useQuery({
    queryKey: ['leads', user?.id, agent?.role],
    queryFn: () =>
      getLeads({
        data: {
          agentId: user?.id,
          agentRole: agent?.role,
          agency: agent?.org_id,
        },
      }),
    enabled: !!agent,
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

  console.log('leads', leads);

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
        <CreateClientDialog
          open={createClientOpen}
          setOpen={setCreateClientOpen}
          lead={lead}
        />
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
          <Stack
            direction='row'
            alignItems='center'
            spacing={1.5}
            flexWrap='wrap'
          >
            <DateRangeFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <CSVLink
              data={csvData}
              headers={CSV_HEADERS}
              filename={csvFilename}
            >
              <Button variant='outlined'>
                Export CSV
                {csvData.length !== leads.length ? ` (${csvData.length})` : ''}
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
