import { Container, Typography, Alert, Button, Stack } from '@mui/material';

import { useQuery } from '@tanstack/react-query';
import { getPolicies, getAgents } from '../utils/query';

import { CSVLink } from 'react-csv';

import { useState } from 'react';

import { useSelector } from 'react-redux';
import { useAgent } from '../hooks/useAgent';

import UpdatePolicyDialog from '../components/UpdatePolicyDialog';
import DeletePolicyDialog from '../components/DeletePolicyDialog';
import PoliciesGrid from '../components/PoliciesGrid';

const Policies = () => {
  const [updatePolicyOpen, setUpdatePolicyOpen] = useState(false);
  const [deletePolicyOpen, setDeletePolicyOpen] = useState(false);
  const [policy, setPolicy] = useState(null);

  const { user } = useSelector((state) => state.user);
  const agent = useAgent();

  const {
    data: policies = [],
    refetch: refetchPolicies,
    isError,
    isLoading: policiesLoading,
  } = useQuery({
    queryKey: ['policies', user?.id, agent?.role],
    queryFn: getPolicies,
    enabled: !!agent,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  console.log('Fetched policies:', policies);

  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  const headers = [
    { label: 'Policy Number', key: 'policy_number' },
    { label: 'Client Name', key: 'client_name' },
    { label: 'Carrier', key: 'carrier_name' },
    { label: 'Writing Agent', key: 'writing_agent_name' },
    { label: 'Premium Amount', key: 'premium_amount' },
    { label: 'Coverage Amount', key: 'coverage_amount' },
    { label: 'Status', key: 'policy_status' },
    { label: 'Effective Date', key: 'effective_date' },
    { label: 'Sold Date', key: 'sold_date' },
    { label: 'Draft Day', key: 'draft_day' },
    { label: 'Premium Frequency', key: 'premium_frequency' },
  ];

  const handleUpdatePolicy = (data) => {
    setPolicy(data);
    setUpdatePolicyOpen(true);
  };

  if (isError) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
        <Alert severity='error' sx={{ my: 2 }}>
          Failed to load policies. Please refresh or try again later.
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
              data={policies || []}
              headers={headers}
              filename={`policies_${new Date().toISOString().slice(0, 10)}.csv`}
              style={{ textDecoration: 'none' }}
            >
              <Button variant='outlined'>Export CSV</Button>
            </CSVLink>
          </Stack>
        </Stack>

        <PoliciesGrid
          agent={agent}
          policies={policies}
          policiesLoading={policiesLoading}
          handleUpdatePolicy={handleUpdatePolicy}
          setPolicy={setPolicy}
          setDeletePolicyOpen={setDeletePolicyOpen}
        />
      </Container>
    </>
  );
};

export default Policies;
