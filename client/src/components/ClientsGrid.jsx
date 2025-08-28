// ClientsGrid.js
import * as React from 'react';
import PropTypes from 'prop-types';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Stack, Typography, Chip } from '@mui/material';
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
          <Stack
            sx={{
              width: '100%',
              height: '100%',
              justifyContent: 'flex-end',
            }}
          >
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
                  sx={{ color: '#000' }}
                  color='error'
                  label='Missing Policies'
                  size='small'
                />
              </Stack>
            );
          }
          return (
            <Stack
              sx={{
                py: 2,
                width: '100%',
                overflowX: 'auto',
                justifyContent: 'center',
              }}
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
        headerName: '',
        align: 'right',
        headerAlign: 'right',
        width: 60,
        getActions: (params) => {
          const c = params.row;
          return [
            <GridActionsCellItem
              key='add'
              icon={<AddCircleIcon />}
              label='Add Policy'
              onClick={() => handleAddPolicies && handleAddPolicies(c)}
              showInMenu={true}
            />,
            <GridActionsCellItem
              key='edit'
              icon={<EditIcon />}
              label='Update Client'
              onClick={() => handleUpdateClient && handleUpdateClient(c)}
              showInMenu={true}
            />,
            <GridActionsCellItem
              key='delete'
              icon={<DeleteIcon />}
              label='Delete Client'
              onClick={() => handleDeleteClient && handleDeleteClient(c)}
              showInMenu={true}
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
    <Stack sx={{ minHeight: 600, maxHeight: 600 }}>
      <DataGrid
        sx={{ border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}
        rowHeight={60}
        rows={rows || []}
        loading={!!clientsLoading}
        getRowId={(row) => row.id}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
        // slots={showToolbar ? { toolbar: GridToolbar } : undefined}
        // slotProps={
        //   showToolbar ? { toolbar: { showQuickFilter: true } } : undefined
        // }
      />
    </Stack>
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
