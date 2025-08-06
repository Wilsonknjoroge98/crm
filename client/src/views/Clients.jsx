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
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';

import AddCircleIcon from '@mui/icons-material/AddCircle';

import CreateClientDialog from '../components/CreateClientDialog';
import UpdateClientDialog from '../components/UpdateClientDialog';
import CreatePolicyDialog from '../components/CreatePolicyDialog';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getClients } from '../utils/query';

const Clients = () => {
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [updateClientOpen, setUpdateClientOpen] = useState(false);
  const [createPoliciesOpen, setCreatePoliciesOpen] = useState(false);
  const [client, setClient] = useState(null);

  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ['clients'],
    queryFn: getClients,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  console.log('Clients:', clients);

  const handleUpdateClient = (clientData) => {
    setClient(clientData);
    setUpdateClientOpen(true);
  };

  const handleAddPolicies = (clientData) => {
    setClient(clientData);
    setCreatePoliciesOpen(true);
  };

  console.log('Client:', client);

  if (!clients) {
    return null;
  }

  return (
    <>
      <CreateClientDialog
        open={createClientOpen}
        setOpen={setCreateClientOpen}
        refetchClients={refetchClients}
      />

      <UpdateClientDialog
        open={updateClientOpen}
        setOpen={setUpdateClientOpen}
        client={client}
      />

      <CreatePolicyDialog
        open={createPoliciesOpen}
        setOpen={setCreatePoliciesOpen}
        client={client}
      />

      <Container sx={{ mt: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Clients</Typography>
          <Button
            variant='contained'
            color='action'
            startIcon={<AddIcon />}
            onClick={() => setCreateClientOpen(true)}
          >
            New Client
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
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
        </Stack>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Date of Birth</TableCell>
                <TableCell>Address</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.firstName + ' ' + c.lastName}</TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <EmailIcon fontSize='small' />
                      <Typography variant='body2'>{c.email}</Typography>
                    </Stack>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <PhoneIcon fontSize='small' />
                      <Typography variant='body2'>{c.phone}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{c.dob}</TableCell>
                  <TableCell>
                    <Typography variant='body2'>{c.address}</Typography>
                    <Typography variant='body2'>
                      {c.city + ',' + ' ' + c.state + ' ' + c.zip}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {c.cityStateZip}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <IconButton
                      size='small'
                      onClick={() => handleAddPolicies(c)}
                    >
                      <AddCircleIcon sx={{ color: 'action.main' }} />
                    </IconButton>
                    <IconButton
                      size='small'
                      onClick={() => handleUpdateClient(c)}
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
};

export default Clients;
