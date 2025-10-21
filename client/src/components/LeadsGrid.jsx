// LeadsGrid.js
import * as React from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Stack, Typography, Chip } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { styled } from '@mui/material/styles';
import CreateClientDialog from './CreateClientDialog';
import { useState } from 'react';
import { alpha } from '@mui/material/styles';

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
      map[a.uid] = a.name;
    });
    return map;
  }, [agents]);

  const isAdmin = agent && agent['role'] === 'admin';

  const rows = leads.map((lead) => {
    return {
      ...lead,
      fullName: `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
    };
  });

  const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
    '& .row-sold': {
      backgroundColor: alpha(theme.palette.success.light, 0.5),
      color: theme.palette.common.black,
    },
  }));

  const columns = React.useMemo(() => {
    const cols = [];

    cols.push(
      {
        field: 'createdAtMs',
        headerName: 'Received At',
        filterable: true,
        sortable: true,
        width: 200,

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
        field: 'email',
        headerName: 'Email',
        flex: 1,
        width: 200,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const lead = params.row;
          return <>{lead.email && <Typography variant='caption'>{lead.email}</Typography>}</>;
        },
      },
      {
        field: 'phone',
        headerName: 'Phone',
        flex: 1,
        width: 200,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const lead = params.row;
          return <>{lead.phone && <Typography variant='caption'>{lead.phone}</Typography>}</>;
        },
      },

      {
        field: 'sold',
        headerName: 'Sold',
        flex: 1,
        width: 200,
        sortable: false,
        filterable: false,
      },

      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        align: 'right',
        width: 10,
        headerAlign: 'right',
        getActions: (params) => {
          const lead = params.row;
          if (lead.sold) {
            return [];
          }
          return [
            <GridActionsCellItem
              key='add'
              icon={<AddCircleIcon />}
              label='Make Client'
              onClick={() => {
                setLead(lead);
                setCreateClientOpen(true);
              }}
              showInMenu={true}
            />,
          ];
        },
      },
    );

    return cols;
  }, [isAdmin, agentNameById]);

  return (
    <Stack sx={{ minHeight: 600, maxHeight: 800, maxWidth: 1200 }}>
      <StyledDataGrid
        sx={{
          border: 'none',
          boxShadow: 'none',
          bgcolor: 'transparent',
        }}
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
        getRowClassName={(params) => {
          if (params.row.sold) return 'row-sold';
        }}
      />
    </Stack>
  );
}
