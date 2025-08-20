// PoliciesGrid.jsx
import * as React from 'react';
import PropTypes from 'prop-types';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Stack, Typography, Chip, Box, Paper } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function PoliciesGrid({
  agent,
  agents,
  policies,
  policiesLoading,
  agentsLoading,
  statusConfig,
  handleUpdatePolicy,
  setPolicy,
  setDeletePolicyOpen,
}) {
  const agentNameById = React.useMemo(() => {
    const map = {};
    (agents || []).forEach((a) => {
      map[a?.uid] = a?.name;
    });
    return map;
  }, [agents]);

  console.log('Agent name by id', agentNameById);

  const isAdmin = agent && agent['role'] === 'admin';

  const columns = React.useMemo(() => {
    const cols = [];

    if (isAdmin) {
      cols.push({
        field: 'agentIds',
        headerName: 'Agent',
        flex: 1,
        minWidth: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack sx={{ width: '100%' }}>
            {(params.value || []).map((id) => (
              <Typography variant='caption' key={id}>
                {agentNameById[id] || id}
              </Typography>
            ))}
          </Stack>
        ),
      });
    }

    cols.push(
      {
        field: 'policyNumber',
        headerName: 'Policy #',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      },
      {
        field: 'clientName',
        headerName: 'Client',
        flex: 1,
        minWidth: 160,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      },
      {
        field: 'carrier',
        headerName: 'Carrier',
        flex: 1,
        minWidth: 140,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      },
      {
        field: 'premiumAmount',
        headerName: 'Premium',
        flex: 1,
        minWidth: 120,
        renderCell: (params) => {
          const val = parseFloat(params.value);
          return (
            <Typography variant='caption'>
              {isNaN(val) ? '$0' : `$${val.toLocaleString()}`}
            </Typography>
          );
        },
      },
      {
        field: 'effectiveDate',
        headerName: 'Effective Date',
        flex: 1,
        minWidth: 140,
      },
      {
        field: 'policyStatus',
        headerName: 'Status',
        flex: 1,
        minWidth: 140,
        renderCell: (params) => {
          const status = params.value;
          const cfg = statusConfig?.[status] || {};
          return (
            <Chip
              label={status}
              sx={{
                color: cfg.color || 'inherit',
                backgroundColor: cfg.bgcolor || 'transparent',
              }}
              size='small'
            />
          );
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        align: 'right',
        headerAlign: 'right',
        getActions: (params) => {
          const p = params.row;
          return [
            <GridActionsCellItem
              key='edit'
              icon={<EditIcon />}
              label='Edit / View Policy'
              onClick={() => handleUpdatePolicy && handleUpdatePolicy(p)}
              showInMenu={false}
            />,
            <GridActionsCellItem
              key='delete'
              icon={<DeleteIcon />}
              label='Delete Policy'
              onClick={() => {
                setPolicy && setPolicy(p);
                setDeletePolicyOpen && setDeletePolicyOpen(true);
              }}
              showInMenu={false}
            />,
          ];
        },
      },
    );

    return cols;
  }, [
    isAdmin,
    agentNameById,
    handleUpdatePolicy,
    setPolicy,
    setDeletePolicyOpen,
    statusConfig,
  ]);

  return (
    <Paper elevation={1} sx={{ minHeight: 300, maxHeight: 600 }}>
      <DataGrid
        rows={policies || []}
        loading={!!policiesLoading || !!agentsLoading}
        getRowId={(row) => row.id}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
        sx={{
          '& .MuiDataGrid-cell': { py: 1 },
        }}
      />
    </Paper>
  );
}

PoliciesGrid.propTypes = {
  agent: PropTypes.object,
  agents: PropTypes.array,
  policies: PropTypes.array,
  policiesLoading: PropTypes.bool,
  agentsLoading: PropTypes.bool,
  statusConfig: PropTypes.object,
  handleUpdatePolicy: PropTypes.func,
  setPolicy: PropTypes.func,
  setDeletePolicyOpen: PropTypes.func,
};
