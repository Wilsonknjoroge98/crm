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
import { useEffect, useState } from 'react';
import WarningIcon from '@mui/icons-material/Warning';

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

  const [isAdmin, setIsAdmin] = React.useState(false);

  useEffect(() => {
    console.log('agent in ClientsGrid', agent);
    if (agent && (agent['role'] === 'admin' || agent['role'] === 'owner')) {
      setIsAdmin(true);
    }
  }, [agent]);

  const policyCount = (row) => row?.policyData?.length ?? 0;

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
        width: 100,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          const ids = params.value;
          const agents = ids.map((id) => agentNameById[id]);

          return (
            <Stack
              sx={{
                width: '100%',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              {agents.sort().map((agent) => (
                <Stack
                  sx={{
                    height: '100%',
                    width: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant='caption' key={agent}>
                    {agent}
                  </Typography>
                </Stack>
              ))}
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
        field: 'fullName',
        headerName: 'Name',
        flex: 1,
        width: 100,
        renderCell: (params) => {
          const c = params.row;
          return <Typography variant='caption'>{c.fullName}</Typography>;
        },
      },
      {
        field: 'contact',
        headerName: 'Contact',
        flex: 1,
        width: 200,
        sortable: true,
        filterable: true,
        valueGetter: (value, row) => {
          const { email, phone } = row;
          return [email, phone].filter(Boolean).join(' ');
        },
        renderCell: (params) => {
          const c = params.row;
          return (
            <Stack
              spacing={0.5}
              py={1}
              direction='column'
              sx={{ width: '100%', justifyContent: 'center' }}
            >
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
        field: 'address',
        headerName: 'Address',
        flex: 1,
        minWidth: 150,
        renderCell: (params) => {
          const c = params.row;
          const street = c.address || '';
          const city = c.city || '';
          const state = c.state || '';
          const zip = c.zip || '';
          return (
            <Stack sx={{ width: '100%', height: '100%', justifyContent: 'center' }}>
              <Typography variant='caption'>{`${street}, ${city}`}</Typography>
              <Typography variant='caption'>{`${state} ${zip}`}</Typography>
            </Stack>
          );
        },
      },

      {
        field: 'policies',
        headerName: 'Policies',
        width: 150,
        sortable: true,
        filterable: true,
        valueGetter: (value, row) => policyCount(row),
        renderCell: (params) => {
          const c = params.row;
          const policies = (c && c.policyData) || [];
          if (!policies.length) {
            return (
              <Stack direction='row' spacing={0} alignItems='center' justifyContent='center' py={2}>
                {/* <Chip
                  icon={<WarningIcon color='warning' />}
                  sx={{ color: '#000' }}
                  color='transparent'
                  label='Missing Policies'
                  size='small'
                /> */}

                <WarningIcon color='error' sx={{ mr: 1 }} />
                <Typography variant='caption' sx={{ color: 'text.primary' }}>
                  Missing Policies
                </Typography>
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
                // <Chip
                //   key={p.id}
                //   size='small'
                //   label={`${(carrierMap && carrierMap[p.carrier]) || p.carrier} | #${
                //     p.policyNumber
                //   }`}
                // />
                <>
                  <Typography key={p.id} variant='caption' sx={{ color: 'text.primary' }}>{`${
                    (carrierMap && carrierMap[p.carrier]) || p.carrier
                  }`}</Typography>
                  <Typography
                    key={p.id}
                    variant='caption'
                    sx={{ color: 'text.primary' }}
                  >{`#${p.policyNumber}`}</Typography>
                </>
              ))}
            </Stack>
          );
        },
      },
      {
        field: 'source',
        headerName: 'Ad Source',
        width: 150,
        renderCell: (params) => <Typography variant='caption'>{params.value}</Typography>,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        align: 'right',
        width: 10,
        headerAlign: 'right',
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
    <Stack sx={{ minHeight: 600, maxHeight: 800, maxWidth: 1200 }}>
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
          sorting: { sortModel: [{ field: 'createdAtMs', sort: 'desc' }] },
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
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
