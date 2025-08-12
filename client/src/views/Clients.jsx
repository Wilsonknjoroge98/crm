// Clients.jsx
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Stack,
  Button,
  Skeleton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import AddCircleIcon from '@mui/icons-material/AddCircle';

import CreateClientDialog from '../components/CreateClientDialog';
import UpdateClientDialog from '../components/UpdateClientDialog';
import CreatePolicyDialog from '../components/CreatePolicyDialog';
import DeleteClientDialog from '../components/DeleteClientDialog';

import TablePagination from '@mui/material/TablePagination';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClients } from '../utils/query';
import { CSVLink } from 'react-csv';

import useAuth from '../hooks/useAuth';

const Clients = () => {
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [updateClientOpen, setUpdateClientOpen] = useState(false);
  const [createPoliciesOpen, setCreatePoliciesOpen] = useState(false);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [client, setClient] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { user, agent } = useAuth();

  const {
    data: clients = [],
    refetch: refetchClients,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['clients', user?.uid, agent?.role],
    queryFn: () => getClients({ agentId: user.uid, agentRole: agent.role }),
    enabled: !!agent,
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

  console.log('clients', clients);

  if (isError) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
        <Alert severity='error' sx={{ my: 2 }}>
          Failed to load clients. Please refresh or try again later.
        </Alert>
      </Stack>
    );
  }

  if (!clients && !isLoading) {
    return null;
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
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Clients</Typography>
          <Stack
            width={'fit-content'}
            direction='row'
            alignItems='center'
            spacing={2}
          >
            <CSVLink
              data={clients || []}
              headers={headers}
              filename={`clients_${new Date().toISOString().slice(0, 10)}.csv`}
            >
              <Button variant='outlined' color='info'>
                Export CSV
              </Button>
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

        {/* <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
          <TextField
            fullWidth
            placeholder='Search by name or email…'
            variant='outlined'
            size='small'
          />
          <TextField
            label='From'
            type='date'
            InputLabelProps={{ shrink: true }}
            size='small'
          />
          <TextField
            label='To'
            type='date'
            InputLabelProps={{ shrink: true }}
            size='small'
          />
        </Stack> */}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Address</TableCell>
                <TableCell>Policies</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading
                ? Array.from({ length: rowsPerPage }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton />
                      </TableCell>
                      <TableCell>
                        <Skeleton />
                      </TableCell>
                      <TableCell>
                        <Skeleton />
                      </TableCell>
                      <TableCell>
                        <Skeleton />
                      </TableCell>
                      <TableCell align='right'>
                        <Skeleton variant='circular' width={32} height={32} />
                      </TableCell>
                    </TableRow>
                  ))
                : clients
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((c) => (
                      <TableRow key={c.id} hover>
                        <TableCell>{c.firstName + ' ' + c.lastName}</TableCell>
                        <TableCell>
                          <Stack
                            direction='row'
                            spacing={1}
                            alignItems='center'
                          >
                            <EmailIcon fontSize='small' />
                            <Typography variant='body2'>{c.email}</Typography>
                          </Stack>
                          <Stack
                            direction='row'
                            spacing={1}
                            alignItems='center'
                          >
                            <PhoneIcon fontSize='small' />
                            <Typography variant='body2'>{c.phone}</Typography>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Typography variant='body2'>{c.address}</Typography>
                          <Typography variant='body2'>
                            {c.city + ', ' + c.state + ' ' + c.zip}
                          </Typography>
                          <Typography variant='body2' color='text.secondary'>
                            {c.cityStateZip}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {c?.policyData?.length > 0 ? (
                            <Stack direction='column' spacing={1}>
                              {c.policyData.map((policy) => (
                                <Chip
                                  key={policy.id}
                                  label={`${
                                    carrierMap[policy.carrier] || policy.carrier
                                  } | #${policy.policyNumber} `}
                                  size='small'
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Chip color='error' label='Missing Policies' />
                          )}
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            title='Add Policy'
                            onClick={() => handleAddPolicies(c)}
                          >
                            <AddCircleIcon sx={{ color: 'action.main' }} />
                          </IconButton>
                          <IconButton
                            size='small'
                            title='Update Client'
                            onClick={() => handleUpdateClient(c)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size='small'
                            title='Delete Client'
                            onClick={() => handleDeleteClient(c)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
            </TableBody>
          </Table>
        </TableContainer>
        {clients && (
          <TablePagination
            component='div'
            count={clients.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0); // reset to first page
            }}
          />
        )}
      </Container>
    </>
  );
};

export default Clients;
