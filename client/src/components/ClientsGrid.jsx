// ClientsGrid.js
import * as React from 'react';
import PropTypes from 'prop-types';
import { DataGrid, GridActionsCellItem, GridToolbar } from '@mui/x-data-grid';
import { Stack, Typography, Chip, Box, Paper } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

export default function ClientsGrid({
  agent,
  clients,
  clientsLoading,
  agents,
  carrierMap,
  handleAddPolicies,
  handleUpdateClient,
  handleDeleteClient,
  showToolbar = false, // toggle quick filter toolbar
}) {
  const agentNameById = React.useMemo(() => {
    const map = {};
    (agents || []).forEach((a) => {
      map[a.uid] = a.name;
    });
    return map;
  }, [agents]);

  const isAdmin = agent && agent['role'] === 'admin';

  const rows = clients.map((client) => {
    return {
      ...client,
      fullName: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
    };
  });

  const columns = React.useMemo(() => {
    const cols = [];

    if (isAdmin) {
      cols.push({
        field: 'agentIds',
        headerName: 'Agent',
        flex: 1,
        minWidth: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack>
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
        field: 'fullName',
        headerName: 'Name',
        flex: 0.5,
        minWidth: 160,
        renderCell: (params) => {
          const c = params.row;
          return <Typography variant='caption'>{c.fullName}</Typography>;
        },
      },
      {
        field: 'contact',
        headerName: 'Contact',
        flex: 1.2,
        minWidth: 240,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const c = params.row;
          return (
            <Stack spacing={0.5} sx={{ width: '100%' }}>
              {c.email && (
                <Stack direction='row' spacing={1} alignItems='center'>
                  <EmailIcon fontSize='small' />
                  <Typography variant='caption'>{c.email}</Typography>
                </Stack>
              )}
              {c.phone && (
                <Stack direction='row' spacing={1} alignItems='center'>
                  <PhoneIcon fontSize='small' />
                  <Typography variant='caption'>{c.phone}</Typography>
                </Stack>
              )}
            </Stack>
          );
        },
      },
      {
        field: 'addressBlock',
        headerName: 'Address',
        flex: 1.5,
        minWidth: 240,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const c = params.row;
          return (
            <Stack spacing={0} sx={{ width: '100%' }}>
              {c.address && (
                <Typography variant='caption'>{c.address}</Typography>
              )}
              {(c.city || c.state || c.zip) && (
                <Typography variant='caption'>
                  {[c.city, c.state].filter(Boolean).join(', ')} {c.zip || ''}
                </Typography>
              )}
            </Stack>
          );
        },
      },
      {
        field: 'policies',
        headerName: 'Policies',
        flex: 0.5,
        minWidth: 290,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const c = params.row;
          const policies = (c && c.policyData) || [];
          if (!policies.length) {
            return <Chip color='error' label='Missing Policies' size='small' />;
          }
          return (
            <Stack
              spacing={1}
              sx={{ py: 0.5, width: '100%', overflowX: 'auto' }}
            >
              {policies.map((p) => (
                <Chip
                  key={p.id}
                  size='small'
                  label={`${
                    (carrierMap && carrierMap[p.carrier]) || p.carrier
                  } | #${p.policyNumber}`}
                />
              ))}
            </Stack>
          );
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        align: 'right',
        headerAlign: 'right',
        minWidth: 150,
        getActions: (params) => {
          const c = params.row;
          return [
            <GridActionsCellItem
              key='add'
              icon={<AddCircleIcon />}
              label='Add Policy'
              onClick={() => handleAddPolicies && handleAddPolicies(c)}
              showInMenu={false}
            />,
            <GridActionsCellItem
              key='edit'
              icon={<EditIcon />}
              label='Update Client'
              onClick={() => handleUpdateClient && handleUpdateClient(c)}
              showInMenu={false}
            />,
            <GridActionsCellItem
              key='delete'
              icon={<DeleteIcon />}
              label='Delete Client'
              onClick={() => handleDeleteClient && handleDeleteClient(c)}
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
    carrierMap,
    handleAddPolicies,
    handleUpdateClient,
    handleDeleteClient,
  ]);

  return (
    <Paper elevation={1} sx={{ minHeight: 300, maxHeight: 600 }}>
      <DataGrid
        rows={rows || []}
        loading={!!clientsLoading}
        getRowId={(row) => row.id}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
        slots={showToolbar ? { toolbar: GridToolbar } : undefined}
        slotProps={
          showToolbar ? { toolbar: { showQuickFilter: true } } : undefined
        }
        sx={{
          '& .MuiDataGrid-cell': { py: 1 },
          '& .MuiChip-root': { maxWidth: '100%' },
        }}
      />
    </Paper>
  );
}

ClientsGrid.propTypes = {
  agent: PropTypes.object,
  clients: PropTypes.arrayOf(PropTypes.object).isRequired,
  clientsLoading: PropTypes.bool,
  agents: PropTypes.arrayOf(
    PropTypes.shape({
      uid: PropTypes.string.isRequired,
      name: PropTypes.string,
    }),
  ),
  carrierMap: PropTypes.object,
  handleAddPolicies: PropTypes.func,
  handleUpdateClient: PropTypes.func,
  handleDeleteClient: PropTypes.func,
  showToolbar: PropTypes.bool,
};
