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
  Skeleton,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

import { useQuery } from "@tanstack/react-query";
import { getPolicies, getAgents } from "../utils/query";

import { CSVLink } from "react-csv";

import { useState } from "react";

import useAuth from "../hooks/useAuth";

import UpdatePolicyDialog from "../components/UpdatePolicyDialog";
import DeletePolicyDialog from "../components/DeletePolicyDialog";

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
    isLoading,
  } = useQuery({
    queryKey: ["policies", user?.uid, agent?.role],
    queryFn: () => getPolicies({ agentId: user.uid, agentRole: agent.role }),
    enabled: !!agent,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  const { data: agents } = useQuery({
    queryKey: ["agents"],
    queryFn: getAgents,
  });

  const headers = [
    { label: "Policy Number", key: "policyNumber" },
    { label: "Client Name", key: "clientName" },
    { label: "Carrier", key: "carrier" },
    { label: "Policy Type", key: "policyType" },
    { label: "Premium Amount", key: "premiumAmount" },
    { label: "Status", key: "policyStatus" },
    { label: "Effective Date", key: "effectiveDate" },
    { label: "Split Policy", key: "splitPolicy" },
    { label: "Split Policy Agent", key: "splitPolicyAgent" },
    { label: "Split Policy Percentage", key: "splitPolicyShare" },
  ];

  const getAgentEmail = (agents, id) => {
    return agents.filter((a) => a.uid === id)[0]["email"] || "";
  };

  const exportData = (policies || []).map((policy) => ({
    ...policy,
    splitPolicyAgent: getAgentEmail(agents, policy?.splitPolicyAgent), // replace key with email
  }));

  const handleUpdatePolicy = (policyData) => {
    setPolicy(policyData);
    setUpdatePolicyOpen(true);
  };

  const statusConfig = {
    Active: { label: "Active", bgcolor: "secondary" },
    Pending: { label: "Pending", bgcolor: "info.main", color: "#fff" },
    Lapsed: { label: "Lapsed", bgcolor: "action.main" },
    Cancelled: { label: "Cancelled", bgcolor: "error.main", color: "#fff" },
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
          direction={{ xs: "column", sm: "row" }}
          justifyContent='space-between'
          alignItems={{ xs: "stretch", sm: "center" }}
          spacing={2}
          mb={2}
        >
          <Typography variant='h4'>Policies</Typography>
          <Stack width={"fit-content"} direction='row' alignItems='center' spacing={2}>
            <CSVLink
              data={exportData || []}
              headers={headers}
              filename={`policies_${new Date().toISOString().slice(0, 10)}.csv`}
              style={{ textDecoration: "none" }}
            >
              <Button variant='outlined' color='info'>
                Export CSV
              </Button>
            </CSVLink>
          </Stack>
        </Stack>

        <Alert severity='warning' sx={{ mb: 3 }}>
          <strong>Policy Sync Notice:</strong> Some recently added policies may not appear due to a
          temporary sync issue. If you don’t see a policy you just created, please refresh the page.
        </Alert>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {agent && agent["role"] === "admin" && <TableCell>Agent</TableCell>}
                <TableCell>Policy #</TableCell>
                <TableCell>Client</TableCell>
                <TableCell>Carrier</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Effective Date</TableCell>
                <TableCell>Status</TableCell>
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
                : policies.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((p) => {
                    console.log("Policy:", p);
                    return (
                      <TableRow key={p.id} hover>
                        {agent && agent["role"] === "admin" && (
                          <TableCell>
                            {p.agentIds
                              .map((id) => agents.find((a) => a.uid === id)?.name)
                              .join(", ")}
                          </TableCell>
                        )}
                        <TableCell>{p.policyNumber}</TableCell>
                        <TableCell>{p.clientName}</TableCell>
                        <TableCell>{p.carrier}</TableCell>

                        <TableCell>{`$${
                          parseFloat(p.premiumAmount).toLocaleString() || 0
                        }`}</TableCell>
                        <TableCell>{p.effectiveDate}</TableCell>
                        <TableCell>
                          <Chip
                            label={p.policyStatus}
                            sx={{
                              color: statusConfig[p.policyStatus]?.color,
                              backgroundColor: statusConfig[p.policyStatus]?.bgcolor,
                            }}
                          />
                        </TableCell>
                        <TableCell align='right'>
                          <IconButton
                            size='small'
                            title='Edit / View Policy'
                            onClick={() => handleUpdatePolicy(p)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size='small'
                            title='Delete Policy'
                            onClick={() => {
                              setPolicy(p);
                              setDeletePolicyOpen(true);
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
