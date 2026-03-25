import * as React from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Stack, Typography, Chip } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { styled } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

const formatPhone = (phone) => {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  return d.length === 10
    ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
    : phone;
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

  // TODO - age no longer exists on lead records, need to calculate from date_of_birth

  const isAdmin = agent?.role === 'admin';

  const rows = leads.map((lead) => ({
    ...lead,
    fullName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
  }));

  const columns = React.useMemo(
    () => [
      {
        field: 'created_at',
        headerName: 'Received',
        width: 90,
        filterable: true,
        sortable: true,
        renderCell: (params) =>
          params.value ? new Date(params.value).toLocaleString() : '',
        sortComparator: (v1, v2) => (v1 ?? 0) - (v2 ?? 0),
      },
      {
        field: 'fullName',
        headerName: 'Name',
        width: 90,
        renderCell: (params) => (
          <Typography variant='caption'>
            {params.row.first_name || ''} {params.row.last_name || ''}
          </Typography>
        ),
      },
      {
        field: 'age',
        headerName: 'Age',
        width: 80,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          const { age } = params.row;
          if (!age) return '—';
          return <Typography variant='caption'>{age}</Typography>;
        },
      },
      {
        field: 'phone',
        headerName: 'Phone',
        width: 110,
        sortable: true,
        filterable: true,
        renderCell: (params) => (
          <Typography variant='caption'>
            {formatPhone(params.row.phone)}
          </Typography>
        ),
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 110,
        sortable: true,
        filterable: true,
        renderCell: (params) => (
          <Typography variant='caption'>{params.row.email || '—'}</Typography>
        ),
      },
      {
        field: 'date_of_birth',
        headerName: 'DOB',
        width: 100,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          const { date_of_birth } = params.row;
          if (!date_of_birth) return '—';
          return (
            <Typography variant='caption'>
              {formatDob(date_of_birth)}
            </Typography>
          );
        },
      },
      {
        field: 'state',
        headerName: 'State',
        width: 70,
        renderCell: (params) => (
          <Typography variant='caption'>{params.row.state || '—'}</Typography>
        ),
      },
      {
        field: 'face_amount',
        headerName: 'Face Amount',
        width: 100,
        sortable: true,
        filterable: true,
        renderCell: (params) => (
          <Typography variant='caption'>
            {formatCurrency(params.row.face_amount) || '—'}
          </Typography>
        ),
      },
      {
        field: 'premium',
        headerName: 'Premium',
        width: 100,
        sortable: true,
        filterable: true,
        renderCell: (params) => (
          <Typography variant='caption'>
            {formatCurrency(params.row.premium) || '—'}
          </Typography>
        ),
      },
      {
        field: 'smoker',
        headerName: 'Smoker',
        width: 80,
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          const { smoker } = params.row;
          if (smoker === undefined || smoker === null) return '—';

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
        field: 'selected_carrier',
        headerName: 'Carrier / Plan',
        flex: 1,
        minWidth: 100,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const { selected_carrier, selected_plan } = params.row;
          if (!selected_carrier && !selected_plan) return '—';
          return (
            <Stack
              spacing={0}
              sx={{ height: '100%', justifyContent: 'center' }}
            >
              {selected_carrier && (
                <Typography variant='caption'>{selected_carrier}</Typography>
              )}
              {selected_plan && (
                <Typography variant='caption' color='text.secondary'>
                  {selected_plan}
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
        sortable: true,
        filterable: true,
        renderCell: (params) => {
          const { verified } = params.row;
          if (verified === undefined || verified === null) return '—';
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
        sortable: true,
        filterable: true,
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
