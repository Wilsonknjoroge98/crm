// Policies.jsx
import {
  Container,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Stack,
  Chip,
  TablePagination,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import { useQuery } from '@tanstack/react-query';
import { getPolicies } from '../utils/query';

import { CSVLink } from 'react-csv';

import { useState } from 'react';

import useAuth from '../hooks/useAuth';

import UpdatePolicyDialog from '../components/UpdatePolicyDialog';

const statusConfig = {
  'Active': { label: 'Active', color: 'secondary' },
  'Pending Initial Draft': {
    label: 'Pending Initial Draft',
    color: 'action.main',
  },
};

const Policies = () => {
  const [updatePolicyOpen, setUpdatePolicyOpen] = useState(false);
  const [policy, setPolicy] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { user, agent } = useAuth();

  const { data: policies, refetch: refetchPolicies } = useQuery({
    queryKey: ['policies', user?.uid, agent?.role],
    queryFn: () => getPolicies({ agentId: user.uid, agentRole: agent.role }),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  const headers = [
    { label: 'Policy Number', key: 'policyNumber' },
    { label: 'Client Name', key: 'clientName' },
    { label: 'Carrier', key: 'carrier' },
    { label: 'Premium Amount', key: 'premiumAmount' },
    { label: 'Status', key: 'policyStatus' },
  ];

  const handleUpdatePolicy = (policyData) => {
    setPolicy(policyData);
    setUpdatePolicyOpen(true);
  };

  if (!policies || !user) {
    return null;
  }

  return (
    <>
      {updatePolicyOpen && (
        <UpdatePolicyDialog
          open={updatePolicyOpen}
          setOpen={setUpdatePolicyOpen}
          policy={policy}
          refetchPolicies={refetchPolicies}
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
          <Typography variant='h4'>Policies</Typography>
          <Stack
            width={'fit-content'}
            direction='row'
            alignItems='center'
            spacing={2}
          >
            <CSVLink
              data={policies || []}
              headers={headers}
              filename={`policies_${new Date().toISOString().slice(0, 10)}.csv`}
              style={{ textDecoration: 'none' }}
            >
              <Button variant='outlined' color='info'>
                Export CSV
              </Button>
            </CSVLink>
            {/* <Button
              variant='contained'
              color='action'
              startIcon={<AddIcon />}
              onClick={() => setCreatePolicyOpen(true)}
            >
              New Policy
            </Button> */}
          </Stack>
        </Stack>

        <Alert severity='warning' sx={{ mb: 3 }}>
          <strong>Policy Sync Notice:</strong> Some recently added policies may
          not appear due to a temporary sync issue. If you don’t see a policy
          you just created, please refresh the page.
        </Alert>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Policy #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Carrier</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align='right'>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {policies.map((p) => {
                const cfg = statusConfig['Active'] || {};
                console.log('Policy:', p);
                return (
                  <TableRow key={p.id} hover>
                    <TableCell>{p.policyNumber}</TableCell>
                    <TableCell>{p.clientName}</TableCell>
                    <TableCell>{p.carrier}</TableCell>
                    <TableCell>{p.premiumAmount}</TableCell>
                    <TableCell>
                      <Chip
                        label={cfg.label}
                        sx={{ backgroundColor: cfg.color }}
                        size='small'
                      />
                    </TableCell>
                    <TableCell align='right'>
                      <IconButton
                        size='small'
                        onClick={() => handleUpdatePolicy(p)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size='small'
                        onClick={() => {
                          // Open delete dialog here
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {policies && (
          <TablePagination
            component='div'
            count={policies.length}
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

export default Policies;
