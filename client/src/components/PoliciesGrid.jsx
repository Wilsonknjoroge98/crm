import * as React from 'react';
import PropTypes from 'prop-types';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CancelIcon from '@mui/icons-material/Cancel';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function PoliciesGrid({
  agent,
  policies,
  policiesLoading,
  handleUpdatePolicy,
  setPolicy,
  setDeletePolicyOpen,
}) {
  const { pathname } = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  const statusConfig = {
    'Active': { icon: <CheckCircleIcon color='success' /> },
    'Pending': { icon: <AutorenewIcon color='success' /> },
    'Lapsed': { icon: <WarningIcon color='error' /> },
    'Insufficient Funds': { icon: <AccountBalanceIcon color='error' /> },
    'Cancelled': { icon: <CancelIcon color='error' /> },
  };

  useEffect(() => {
    if (agent && (agent['role'] === 'admin' || agent['role'] === 'owner')) {
      setIsAdmin(true);
    }
  }, [agent]);

  const columns = React.useMemo(() => {
    const cols = [];

    if (isAdmin) {
      cols.push({
        field: 'writing_agent_name',
        headerName: 'Agent',
        flex: 1,
        width: 100,
        sortable: true,
        filterable: true,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      });
    }

    cols.push(
      {
        field: 'created_at',
        headerName: 'Created',
        filterable: true,
        sortable: true,
        width: 150,
        renderCell: (params) =>
          params.value ? new Date(params.value).toLocaleString() : 'unknown',
        sortComparator: (v1, v2) => {
          const a = v1 ? new Date(v1).getTime() : 0;
          const b = v2 ? new Date(v2).getTime() : 0;
          return a - b;
        },
      },
      {
        field: 'policy_number',
        headerName: 'Policy #',
        flex: 1,
        minWidth: 80,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      },
      {
        field: 'client_name',
        headerName: 'Client',
        flex: 1,
        minWidth: 100,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      },
      {
        field: 'carrier_name',
        headerName: 'Carrier',
        flex: 1,
        width: 120,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      },
      {
        field: 'premium_amount',
        headerName: 'Premium',
        flex: 1,
        width: 80,
        valueGetter: (value) => parseFloat(value),
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
        field: 'effective_date',
        headerName: 'Effective Date',
        flex: 1,
        width: 80,
      },
      {
        field: 'policy_status',
        headerName: 'Status',
        flex: 1,
        width: 80,
        renderCell: (params) => {
          const status = params.value;
          const cfg = statusConfig?.[status] || {};
          return (
            <Stack
              direction='row'
              spacing={1}
              py={2}
              alignItems='center'
              sx={{ color: 'text.primary' }}
            >
              {cfg.icon}
              <Typography variant='caption' sx={{ mb: 0.5 }}>
                {status}
              </Typography>
            </Stack>
          );
        },
      },
    );

    if (!pathname.includes('/team-production')) {
      cols.push({
        field: 'actions',
        type: 'actions',
        headerName: '',
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
              showInMenu={true}
            />,
            <GridActionsCellItem
              key='delete'
              icon={<DeleteIcon />}
              label='Delete Policy'
              onClick={() => {
                setPolicy && setPolicy(p);
                setDeletePolicyOpen && setDeletePolicyOpen(true);
              }}
              showInMenu={true}
            />,
          ];
        },
      });
    }

    return cols;
  }, [isAdmin, handleUpdatePolicy, setPolicy, setDeletePolicyOpen]);

  return (
    <Stack sx={{ minHeight: 600, maxHeight: 800, maxWidth: 1200 }}>
      <DataGrid
        sx={{ border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}
        rows={policies || []}
        rowHeight={60}
        loading={!!policiesLoading}
        getRowId={(row) => row.id}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] },
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
      />
    </Stack>
  );
}

PoliciesGrid.propTypes = {
  agent: PropTypes.object,
  policies: PropTypes.array,
  policiesLoading: PropTypes.bool,
  handleUpdatePolicy: PropTypes.func,
  setPolicy: PropTypes.func,
  setDeletePolicyOpen: PropTypes.func,
};
