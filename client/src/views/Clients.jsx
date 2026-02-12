import { Container, Typography, Stack, Button, Alert } from '@mui/material';

import { Add as AddIcon } from '@mui/icons-material';

import CreateClientDialog from '../components/CreateClientDialog';
import UpdateClientDialog from '../components/UpdateClientDialog';
import CreatePolicyDialog from '../components/CreatePolicyDialog';
import DeleteClientDialog from '../components/DeleteClientDialog';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClients, getAgents } from '../utils/query';
import { CSVLink } from 'react-csv';
import ClientsGrid from '../components/ClientsGrid';

import useAuth from '../hooks/useAuth';

const Clients = () => {
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [updateClientOpen, setUpdateClientOpen] = useState(false);
  const [createPoliciesOpen, setCreatePoliciesOpen] = useState(false);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [client, setClient] = useState(null);




  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents({  }),
  });

  const {
    data: clients = [],
    refetch: refetchClients,
    isLoading: clientsLoading,
    isError,
  } = useQuery({
    queryKey: ['clients', user?.uid, agent?.role],
    queryFn: () =>
      getClients({

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

  const carrierMap = {
    'Liberty Bankers Insurance Group': 'Liberty Bankers',
    'Royal Neighbors of America': 'RNA',
    'Mutual of Omaha': 'MOO',
    'American Amicable': 'AmAm',
    'Combined by Chubb': 'Chubb',
  };

  const handleUpdateClient = (clientData) => {
    setClient(clientData);
    setUpdateClientOpen(true);
  };

  const handleAddPolicies = (clientData) => {
    setClient(clientData);
    setCreatePoliciesOpen(true);
  };

  const handleDeleteClient = (clientData) => {
    setClient(clientData);
    setDeleteClientOpen(true);
  };

  if (isError) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
        <Alert severity='error' sx={{ my: 2 }}>
          Failed to load clients. Please refresh or try again later.
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
          refetchClients={refetchClients}
        />
      )}

      {deleteClientOpen && (
        <DeleteClientDialog
          open={deleteClientOpen}
          setOpen={setDeleteClientOpen}
          client={client}
          refetchClients={refetchClients}
        />
      )}

      <UpdateClientDialog
        open={updateClientOpen}
        setOpen={setUpdateClientOpen}
        client={client}
        refetchClients={refetchClients}
      />

      {createPoliciesOpen && (
        <CreatePolicyDialog
          open={createPoliciesOpen}
          setOpen={setCreatePoliciesOpen}
          client={client}
          refetchClients={refetchClients}
        />
      )}

      <Container sx={{ mt: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Clients</Typography>
          <Stack width={'fit-content'} direction='row' alignItems='center' spacing={2}>
            <CSVLink
              data={clients || []}
              headers={headers}
              filename={`clients_${new Date().toISOString().slice(0, 10)}.csv`}
            >
              <Button variant='outlined'>Export CSV</Button>
            </CSVLink>

            <Button
              variant='contained'
              color='action'
              startIcon={<AddIcon />}
              onClick={() => setCreateClientOpen(true)}
            >
              New Client
            </Button>
          </Stack>
        </Stack>
        <ClientsGrid
          agent={agent}
          clients={clients}
          clientsLoading={clientsLoading}
          agents={agents}
          carrierMap={carrierMap}
          handleAddPolicies={handleAddPolicies}
          handleUpdateClient={handleUpdateClient}
          handleDeleteClient={handleDeleteClient}
          showToolbar={true}
        />
      </Container>
    </>
  );
};

export default Clients;
