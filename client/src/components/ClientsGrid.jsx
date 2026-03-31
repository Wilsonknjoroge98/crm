// ClientsGrid.js
import * as React from 'react';
import PropTypes from 'prop-types';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import {
  Stack,
  Typography,
  Chip,
  Popover,
  Box,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useEffect, useState } from 'react';
import WarningIcon from '@mui/icons-material/Warning';
import dayjs from 'dayjs';

export default function ClientsGrid({
  agent,
  clients,
  clientsLoading,
  carrierMap,
  handleAddPolicies,
  handleUpdateClient,
  handleDeleteClient,
  showToolbar = false, // toggle quick filter toolbar
}) {
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [popoverPolicies, setPopoverPolicies] = useState([]);

  useEffect(() => {
    if (agent && (agent['role'] === 'admin' || agent['role'] === 'owner')) {
      setIsAdmin(true);
    }
  }, [agent]);

  const policyCount = (row) => row?.policyData?.length ?? 0;

  const handleOverflowClick = (event, policies) => {
    event.stopPropagation();
    setPopoverAnchor(event.currentTarget);
    setPopoverPolicies(policies);
  };

  const handlePopoverClose = () => {
    setPopoverAnchor(null);
    setPopoverPolicies([]);
  };

  const rows = clients.map((client) => {
    return {
      ...client,
      fullName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    };
  });

  const columns = React.useMemo(() => {
    const cols = [];

    if (isAdmin) {
      cols.push({
        field: 'agent_name',
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
        width: 170,
        renderCell: (params) => {
          return params.value
            ? new Date(params.value).toLocaleString()
            : 'unknown';
        },
        sortComparator: (v1, v2) => {
          const a = v1 ? new Date(v1).getTime() : 0;
          const b = v2 ? new Date(v2).getTime() : 0;
          return a - b;
        },
      },
      {
        field: 'fullName',
        headerName: 'Name',
        width: 125,
        renderCell: (params) => {
          const c = params.row;
          return <Typography variant='caption'>{c.fullName}</Typography>;
        },
      },
      {
        field: 'date_of_birth',
        headerName: 'Age',
        width: 50,
        filterable: true,
        sortable: true,
        renderCell: (params) => {
          const dob = params.value;
          const birthDate = dob ? dayjs(dob) : null;
          const age = birthDate ? dayjs().diff(birthDate, 'year') : undefined;
          return (
            <Typography variant='caption'>
              {age !== undefined ? age : '—'}
            </Typography>
          );
        },
      },
      {
        field: 'contact',
        headerName: 'Contact',
        flex: 1,
        width: 225,
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
        minWidth: 200,
        renderCell: (params) => {
          const c = params.row;
          const street = c.address || '';
          const city = c.city || '';
          const state = c.state || '';
          const zip = c.zip || '';
          return (
            <Stack
              sx={{ width: '100%', height: '100%', justifyContent: 'center' }}
            >
              <Typography variant='caption'>{`${street}, ${city}`}</Typography>
              <Typography variant='caption'>{`${state} ${zip}`}</Typography>
            </Stack>
          );
        },
      },
      {
        field: 'annual_income',
        headerName: 'Annual Income',
        width: 100,
        renderCell: (params) => (
          <Typography variant='caption'>
            {params.value ? `$${Number(params.value).toLocaleString()}` : '—'}
          </Typography>
        ),
      },
      {
        field: 'occupation',
        headerName: 'Occupation',
        width: 100,
        renderCell: (params) => (
          <Typography variant='caption'>{params.value}</Typography>
        ),
      },
      {
        field: 'policies',
        headerName: 'Policies',
        width: 160,
        sortable: true,
        filterable: true,
        valueGetter: (value, row) => policyCount(row),
        renderCell: (params) => {
          const c = params.row;
          const policies = (c && c.policyData) || [];

          if (!policies.length) {
            return (
              <Stack
                direction='row'
                alignItems='center'
                sx={{ height: '100%' }}
              >
                <WarningIcon color='error' sx={{ mr: 0.5 }} fontSize='small' />
                <Typography variant='caption'>Missing Policies</Typography>
              </Stack>
            );
          }

          const first = policies[0];
          const overflow = policies.length - 1;
          const carrierName =
            (carrierMap && carrierMap[first.carrier]) || first.carrier || '—';

          return (
            <Stack
              direction='row'
              alignItems='center'
              spacing={1}
              sx={{ height: '100%' }}
            >
              <Stack direction='column' spacing={0} justifyContent='center'>
                <Typography variant='caption' fontWeight={500}>
                  {carrierName}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  #{first.policyNumber}
                </Typography>
              </Stack>
              {overflow > 0 && (
                <Chip
                  label={`+${overflow}`}
                  size='small'
                  onClick={(e) => handleOverflowClick(e, policies)}
                  sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }}
                />
              )}
            </Stack>
          );
        },
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
              label='Edit / View Client'
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
    carrierMap,
    handleAddPolicies,
    handleUpdateClient,
    handleDeleteClient,
    handleOverflowClick,
  ]);

  return (
    <Stack sx={{ minHeight: 600, maxHeight: 800, maxWidth: 1200 }}>
      <DataGrid
        sx={{ border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}
        rowHeight={64}
        rows={rows || []}
        loading={!!clientsLoading}
        getRowId={(row) => row.id}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] },
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
      />

      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        disableRestoreFocus
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant='caption' color='text.secondary' fontWeight={600}>
            ALL POLICIES
          </Typography>
          {popoverPolicies.map((p, idx) => (
            <React.Fragment key={p.id}>
              {idx > 0 && <Divider sx={{ my: 1 }} />}
              <Box sx={{ mt: 1 }}>
                <Typography variant='body2' fontWeight={500}>
                  {(carrierMap && carrierMap[p.carrier]) || p.carrier || '—'}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  #{p.policyNumber}
                </Typography>
              </Box>
            </React.Fragment>
          ))}
        </Box>
      </Popover>
    </Stack>
  );
}

ClientsGrid.propTypes = {
  agent: PropTypes.object,
  clients: PropTypes.arrayOf(PropTypes.object).isRequired,
  clientsLoading: PropTypes.bool,
  carrierMap: PropTypes.object,
  handleAddPolicies: PropTypes.func,
  handleUpdateClient: PropTypes.func,
  handleDeleteClient: PropTypes.func,
  showToolbar: PropTypes.bool,
};
