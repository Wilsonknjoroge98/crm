import { Container, Typography, Stack, Button, Alert } from '@mui/material';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getLeads, getAgents } from '../utils/query';
import { CSVLink } from 'react-csv';

import LeadsGrid from '../components/LeadsGrid';

import useAuth from '../hooks/useAuth';
import CreateClientDialog from '../components/CreateClientDialog';

const Leads = () => {
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [lead, setLead] = useState(null);

  const { user, agent, userToken } = useAuth();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents({ token: userToken }),
  });

  const {
    data: leads = [],
    refetch: refetchLeads,
    isLoading: leadsLoading,
    isError,
  } = useQuery({
    queryKey: ['leads', user?.uid, agent?.role],
    queryFn: () =>
      getLeads({
        token: userToken,
        data: { agentId: user.uid, agentRole: agent.role },
      }),
    enabled: !!agent && !!userToken,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  const headers = [
    { label: 'First Name', key: 'firstName' },
    { label: 'Last Name', key: 'lastName' },
    { label: 'Email', key: 'email' },
    { label: 'Phone', key: 'phone' },
    { label: 'Date of Birth', key: 'dob' },
    { label: 'Address', key: 'address' },
    { label: 'City', key: 'city' },
    { label: 'State', key: 'state' },
    { label: 'Zip Code', key: 'zip' },
    { label: 'Occupation', key: 'occupation' },
    { label: 'Income', key: 'income' },
  ];

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
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Leads</Typography>
          <Stack width={'fit-content'} direction='row' alignItems='center' spacing={2}>
            <CSVLink
              data={leads || []}
              headers={headers}
              filename={`leads_${new Date().toISOString().slice(0, 10)}.csv`}
            >
              <Button variant='outlined'>Export CSV</Button>
            </CSVLink>

            {/* <Button
              variant='contained'
              color='action'
              startIcon={<AddIcon />}
              onClick={() => setCreateClientOpen(true)}
            >
              New Client
            </Button> */}
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
