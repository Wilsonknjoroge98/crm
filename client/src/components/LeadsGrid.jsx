import * as React from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Stack, Typography, Chip } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const formatPhone = (phone) => {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone;
};

const formatDob = (dob) => {
  if (!dob) return '';
  const [year, month, day] = dob.split('-');
  return `${month}/${day}/${year}`;
};

const formatCurrency = (val) => {
  if (!val) return '';
  const num = Number(String(val).replace(/[^0-9.]/g, ''));
  return isNaN(num) ? val : `$${num.toLocaleString()}`;
};

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  '& .row-sold': {
    backgroundColor: alpha(theme.palette.success.light, 0.5),
    color: theme.palette.common.black,
  },
}));

export default function LeadsGrid({
  agent,
  leads,
  leadsLoading,
  agents,
  setLead,
  setCreateClientOpen,
}) {
  const agentNameById = React.useMemo(() => {
    const map = {};
    (agents || []).forEach((a) => {
      map[a.id] = [a.first_name, a.last_name].filter(Boolean).join(' ');
    });
    return map;
  }, [agents]);

  const isAdmin = agent?.role === 'admin';

  const rows = leads.map((lead) => ({
    ...lead,
    fullName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
  }));

  const columns = React.useMemo(
    () => [
      {
        field: 'createdAtMs',
        headerName: 'Received',
        width: 90,
        filterable: true,
        sortable: true,
        renderCell: (params) => (params.value ? new Date(params.value).toLocaleString() : ''),
        sortComparator: (v1, v2) => (v1 ?? 0) - (v2 ?? 0),
      },
      {
        field: 'fullName',
        headerName: 'Name',
        width: 90,
        renderCell: (params) => (
          <Typography variant='caption'>{params.row.fullName || ''}</Typography>
        ),
      },
      {
        field: 'phone',
        headerName: 'Phone',
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Typography variant='caption'>{formatPhone(params.row.phone)}</Typography>
        ),
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 110,
        sortable: false,
        filterable: false,
        renderCell: (params) => <Typography variant='caption'>{params.row.email || ''}</Typography>,
      },
      {
        field: 'dob',
        headerName: 'DOB',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const { dob, age } = params.row;
          if (!dob) return null;
          return (
            <Stack spacing={0} sx={{ height: '100%', justifyContent: 'center' }}>
              <Typography variant='caption'>{formatDob(dob)}</Typography>
              {age ? (
                <Typography variant='caption' color='text.secondary'>
                  Age {age}
                </Typography>
              ) : null}
            </Stack>
          );
        },
      },
      {
        field: 'state',
        headerName: 'State',
        width: 70,
        renderCell: (params) => <Typography variant='caption'>{params.row.state || ''}</Typography>,
      },
      {
        field: 'faceAmount',
        headerName: 'Coverage',
        width: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Typography variant='caption'>{formatCurrency(params.row.faceAmount)}</Typography>
        ),
      },
      {
        field: 'smoker',
        headerName: 'Smoker',
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const { smoker } = params.row;
          if (smoker === undefined || smoker === null) return null;

          return (
            <Chip
              label={smoker ? 'Yes' : 'No'}
              size='small'
              color={smoker ? 'warning' : 'default'}
              variant='outlined'
              sx={{ fontSize: '0.7rem' }}
            />
          );
        },
      },
      {
        field: 'selectedCarrier',
        headerName: 'Carrier / Plan',
        flex: 1,
        minWidth: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const { selectedCarrier, selectedPlan } = params.row;
          if (!selectedCarrier && !selectedPlan) return null;
          return (
            <Stack spacing={0} sx={{ height: '100%', justifyContent: 'center' }}>
              {selectedCarrier && <Typography variant='caption'>{selectedCarrier}</Typography>}
              {selectedPlan && (
                <Typography variant='caption' color='text.secondary'>
                  {selectedPlan}
                </Typography>
              )}
            </Stack>
          );
        },
      },
      {
        field: 'verified',
        headerName: 'Verified',
        width: 80,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const { verified } = params.row;
          if (verified === undefined || verified === null) return null;
          return (
            <Chip
              label={verified ? 'Yes' : 'No'}
              size='small'
              color={verified ? 'success' : 'default'}
              variant='outlined'
              sx={{ fontSize: '0.7rem' }}
            />
          );
        },
      },
      {
        field: 'sold',
        headerName: '',
        width: 70,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (!params.row.sold) return null;
          return (
            <Chip
              label='Sold'
              size='small'
              color='success'
              sx={{ fontSize: '0.7rem', color: 'primary.contrastText' }}
            />
          );
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        width: 10,
        align: 'right',
        headerAlign: 'right',
        getActions: (params) => {
          if (params.row.sold) return [];
          return [
            <GridActionsCellItem
              key='add'
              icon={<AddCircleIcon />}
              label='Make Client'
              onClick={() => {
                setLead(params.row);
                setCreateClientOpen(true);
              }}
              showInMenu={true}
            />,
          ];
        },
      },
    ],
    [isAdmin, agentNameById],
  );

  return (
    <Stack sx={{ minHeight: 600, maxHeight: 800, width: '100%' }}>
      <StyledDataGrid
        sx={{ border: 'none', boxShadow: 'none', bgcolor: 'transparent' }}
        rowHeight={60}
        rows={rows || []}
        loading={!!leadsLoading}
        getRowId={(row) => row.id}
        columns={columns}
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50, 100]}
        initialState={{
          sorting: { sortModel: [{ field: 'createdAtMs', sort: 'desc' }] },
          pagination: { paginationModel: { pageSize: 10, page: 0 } },
        }}
        getRowClassName={(params) => (params.row.sold ? 'row-sold' : '')}
      />
    </Stack>
  );
}
