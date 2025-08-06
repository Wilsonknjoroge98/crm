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
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';

import { useQuery } from '@tanstack/react-query';
import { getPolicies } from '../utils/query';

import { useState } from 'react';
import { enqueueSnackbar } from 'notistack';

import UpdatePolicyDialog from '../components/UpdatePolicyDialog';

const statusConfig = {
  'Active': { label: 'Active', color: 'secondary' },
  'Pending Initial Draft': {
    label: 'Pending Initial Draft',
    color: 'action.main',
  },
};

export default function Policies() {
  const [createPolicyOpen, setCreatePolicyOpen] = useState(false);
  const [updatePolicyOpen, setUpdatePolicyOpen] = useState(false);
  const [policy, setPolicy] = useState(null);

  const { data: policies, refetch: refetchPolicies } = useQuery({
    queryKey: ['policies'],
    queryFn: getPolicies,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  console.log('Policies:', policies);

  const handleUpdatePolicy = (policyData) => {
    setPolicy(policyData);
    setOpenUpdateDialog(true);
  };

  if (!policies) {
    return null;
  }

  console.log(createPolicyOpen);

  return (
    <>
      <UpdatePolicyDialog
        open={updatePolicyOpen}
        setOpen={setUpdatePolicyOpen}
        policy={policy}
        refetchPolicies={refetchPolicies}
      />

      <Container sx={{ mt: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent='space-between'
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Policies</Typography>
          {/* <Button
            variant='contained'
            color='action'
            startIcon={<AddIcon />}
            onClick={() => setCreatePolicyOpen(true)}
          >
            New Policy
          </Button> */}
        </Stack>

        <Alert severity='warning' sx={{ mb: 3 }}>
          <strong>Policy Sync Notice:</strong> Some recently added policies may
          not appear due to a temporary sync issue. If you don’t see a policy
          you just created, please refresh the page or contact support.
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
    </>
  );
}
