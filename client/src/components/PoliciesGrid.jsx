import * as React from 'react';
import PropTypes from 'prop-types';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Stack, Typography, Chip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';

export default function PoliciesGrid({
  agent,
  agents,
  policies,
  policiesLoading,
  agentsLoading,
  handleUpdatePolicy,
  setPolicy,
  setDeletePolicyOpen,
}) {
  const [isAdmin, setIsAdmin] = useState(false);
  const agentNameById = React.useMemo(() => {
    const map = {};
    (agents || []).forEach((a) => {
      map[a?.uid] = a?.name;
    });
    return map;
  }, [agents]);

  const statusConfig = {
    Active: { label: 'Active', bgcolor: 'success.main' },
    Pending: { label: 'Pending', bgcolor: 'info.main' },
    Lapsed: { label: 'Lapsed', bgcolor: 'warning.main' },
    'Insufficient Funds': { label: 'Insufficient Funds', bgcolor: 'warning.main' },
    Cancelled: { label: 'Cancelled', bgcolor: 'error.main' },
  };

  useEffect(() => {
    console.log('agent in ClientsGrid', agent);
    if (agent && (agent['role'] === 'admin' || agent['role'] === 'owner')) {
      setIsAdmin(true);
    }
  }, [agent]);

  const columns = React.useMemo(() => {
    const cols = [];

    if (isAdmin) {
      cols.push({
        field: 'agentIds',
        headerName: 'Agent',
        flex: 1,
        width: 100,
        sortable: true,
        filterable: true,
        valueGetter: (value) => value.map((id) => agentNameById[id] || '').join(', '),
        renderCell: (params) => {
          const value = params.value;

          return (
            <Stack
              sx={{
                width: '100%',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              <Stack
                direction={'row'}
                sx={{
                  height: '100%',
                  width: '100%',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}
              >
                <Typography variant='caption' key={value}>
                  {value}
                </Typography>
              </Stack>
            </Stack>
          );
        },
      });
    }

    cols.push(
      {
        field: 'createdAtMs',
        headerName: 'Created',
        filterable: true,
        sortable: true,
        width: 170,

        renderCell: (params) => {
          return params.value ? new Date(params.value).toLocaleString() : 'unknown';
        },
        sortComparator: (v1, v2) => {
          const a = v1 ?? 0;
          const b = v2 ?? 0;
          return a - b;
        },
      },
      {
        field: 'policyNumber',
        headerName: 'Policy #',
        flex: 1,
        minWidth: 80,
        renderCell: (params) => <Typography variant='caption'>{params.value}</Typography>,
      },
      {
        field: 'clientName',
        headerName: 'Client',
        flex: 1,
        minWidth: 100,
        renderCell: (params) => <Typography variant='caption'>{params.value}</Typography>,
      },
      {
        field: 'carrier',
        headerName: 'Carrier',
        flex: 1,
        width: 100,
        renderCell: (params) => <Typography variant='caption'>{params.value}</Typography>,
      },
      {
        field: 'premiumAmount',
        headerName: 'Premium',
        flex: 1,
        width: 100,
        valueGetter: (value, row) => parseFloat(row.premiumAmount),
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
        width: 80,
      },
      {
        field: 'policyStatus',
        headerName: 'Status',
        flex: 1,
        width: 80,
        renderCell: (params) => {
          const status = params.value;
          const cfg = statusConfig?.[status] || {};
          return (
            <Stack
              sx={{
                py: 2,
                width: '100%',
                overflowX: 'auto',
                justifyContent: 'center',
              }}
            >
              <Chip
                label={status}
                sx={{
                  color: cfg.color || 'inherit',
                  backgroundColor: cfg.bgcolor || 'transparent',
                }}
                size='small'
              />
            </Stack>
          );
        },
      },
      {
        field: 'source',
        headerName: 'Ad Source',
        flex: 1,
        minWidth: 80,
        renderCell: (params) => <Typography variant='caption'>{params.value}</Typography>,
      },
      {
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
      },
    );

    return cols;
  }, [isAdmin, agentNameById, handleUpdatePolicy, setPolicy, setDeletePolicyOpen, statusConfig]);

  return (
    <Stack sx={{ minHeight: 600, maxHeight: 800, maxWidth: 1200 }}>
      <DataGrid
        sx={{ border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}
        rows={policies || []}
        rowHeight={60}
        loading={!!policiesLoading || !!agentsLoading}
        getRowId={(row) => row.id}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          sorting: { sortModel: [{ field: 'createdAtMs', sort: 'desc' }] },
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
      />
    </Stack>
  );
}

PoliciesGrid.propTypes = {
  agent: PropTypes.object,
  agents: PropTypes.array,
  policies: PropTypes.array,
  policiesLoading: PropTypes.bool,
  agentsLoading: PropTypes.bool,
  handleUpdatePolicy: PropTypes.func,
  setPolicy: PropTypes.func,
  setDeletePolicyOpen: PropTypes.func,
};
