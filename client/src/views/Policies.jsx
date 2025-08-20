import { Container, Typography, Alert, Button, Stack } from '@mui/material';

import { useQuery } from '@tanstack/react-query';
import { getPolicies, getAgents } from '../utils/query';

import { CSVLink } from 'react-csv';

import { useState } from 'react';

import useAuth from '../hooks/useAuth';

import UpdatePolicyDialog from '../components/UpdatePolicyDialog';
import DeletePolicyDialog from '../components/DeletePolicyDialog';
import PoliciesGrid from '../components/PoliciesGrid';

const Policies = () => {
  const [updatePolicyOpen, setUpdatePolicyOpen] = useState(false);
  const [deletePolicyOpen, setDeletePolicyOpen] = useState(false);
  const [policy, setPolicy] = useState(null);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { user, agent } = useAuth();

  const {
    data: policies = [],
    refetch: refetchPolicies,
    isError,
    isLoading: policiesLoading,
  } = useQuery({
    queryKey: ['policies', user?.uid, agent?.role],
    queryFn: () => getPolicies({ agentId: user.uid, agentRole: agent.role }),
    enabled: !!agent,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const headers = [
    { label: 'Policy Number', key: 'policyNumber' },
    { label: 'Client Name', key: 'clientName' },
    { label: 'Carrier', key: 'carrier' },
    { label: 'Policy Type', key: 'policyType' },
    { label: 'Premium Amount', key: 'premiumAmount' },
    { label: 'Status', key: 'policyStatus' },
    { label: 'Effective Date', key: 'effectiveDate' },
    { label: 'Split Policy', key: 'splitPolicy' },
    { label: 'Split Policy Agent', key: 'splitPolicyAgent' },
    { label: 'Selling Agent', key: 'sellingAgent' },
    { label: 'Split Policy Percentage', key: 'splitPolicyShare' },
  ];

  const getAgentEmail = (agents, id) => {
    if (!agents || !id) return '';
    return agents.find((a) => a.uid === id)?.email || '';
  };

  const exportData = (policies || []).map((policy) => ({
    ...policy,
    splitPolicyShare: policy.splitPolicy ? policy?.splitPolicyShare : 'N/A', // replace key with email
    splitPolicyAgent: policy.splitPolicy
      ? getAgentEmail(agents, policy?.splitPolicyAgent)
      : 'N/A',
    sellingAgent: policy.splitPolicy
      ? getAgentEmail(
          agents,
          policy?.agentIds?.find((a) => a != policy.splitPolicyAgent),
        )
      : getAgentEmail(agents, policy?.agentIds[0]),
  }));

  const handleUpdatePolicy = (policyData) => {
    setPolicy(policyData);
    setUpdatePolicyOpen(true);
  };

  const statusConfig = {
    Active: { label: 'Active', bgcolor: 'secondary' },
    Pending: { label: 'Pending', bgcolor: 'info.main', color: '#fff' },
    Lapsed: { label: 'Lapsed', bgcolor: 'action.main' },
    Cancelled: { label: 'Cancelled', bgcolor: 'error.main', color: '#fff' },
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

  if (!policies) {
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
          agents={agents}
        />
      )}

      {deletePolicyOpen && (
        <DeletePolicyDialog
          open={deletePolicyOpen}
          setOpen={setDeletePolicyOpen}
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
              data={exportData || []}
              headers={headers}
              filename={`policies_${new Date().toISOString().slice(0, 10)}.csv`}
              style={{ textDecoration: 'none' }}
            >
              <Button variant='outlined' color='info'>
                Export CSV
              </Button>
            </CSVLink>
          </Stack>
        </Stack>
        {/* 
        <Alert severity='warning' sx={{ mb: 3 }}>
          <strong>Policy Sync Notice:</strong> Some recently added policies may
          not appear due to a temporary sync issue. If you don’t see a policy
          you just created, please refresh the page.
        </Alert> */}

        <PoliciesGrid
          agent={agent}
          agents={agents}
          policies={policies}
          policiesLoading={policiesLoading}
          agentsLoading={agentsLoading}
          statusConfig={statusConfig}
          handleUpdatePolicy={handleUpdatePolicy}
          setPolicy={setPolicy}
          setDeletePolicyOpen={setDeletePolicyOpen}
        />
      </Container>
    </>
  );
};

export default Policies;
