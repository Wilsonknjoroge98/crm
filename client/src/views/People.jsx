import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Fade,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddIcon from '@mui/icons-material/Add';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { deletePeople, getPeople, getPeopleMetrics } from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';
import NewLeadDialog from '../components/NewLeadDialog';
import PeopleDrawer from '../components/PeopleDrawer';
import CreateClientDialog from '../components/CreateClientDialog';
import CreatePolicyDialog from '../components/CreatePolicyDialog';

const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';

const DATE_PRESETS = [
  ['last_7_days', 'Last 7 days'],
  ['last_30_days', 'Last 30 days'],
  ['this_month', 'This month'],
  ['this_year', 'This year'],
  ['all_time', 'All time'],
];

const CSV_COLUMNS = [
  ['first_name', 'First Name'],
  ['last_name', 'Last Name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['state', 'State'],
  ['lifecycle_status', 'Lifecycle'],
  ['verified', 'Verified'],
  ['created_at', 'Created At'],
];

const formatPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 10) return value || '';
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const formatCurrency = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

const escapeCsv = (value) => {
  const normalized =
    value === null || value === undefined
      ? ''
      : typeof value === 'boolean'
        ? value
          ? 'Verified'
          : 'Unverified'
        : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
};

const downloadRows = (rows) => {
  const header = CSV_COLUMNS.map(([, label]) => escapeCsv(label)).join(',');
  const body = rows.map((row) =>
    CSV_COLUMNS.map(([field]) => escapeCsv(row[field])).join(','),
  );
  const blob = new Blob([[header, ...body].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `people-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const LEAD_COST = 39;

const formatMultiplier = (value) =>
  value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}x`;

const formatSigned = (value) =>
  `${Number(value) < 0 ? '-' : '+'}${formatCurrency(Math.abs(Number(value) || 0))}`;

const MetricCard = ({ label, value, subtext, accentColor = '#1C7EBB' }) => (
  <Paper
    variant='outlined'
    sx={{
      flex: 1,
      p: 2,
      borderRadius: 2,
      borderColor: '#E0E0E0',
      bgcolor: '#FFFFFF', // Clean white background
      borderTop: `3px solid ${accentColor}`, // 3px accent line at top
      transition: 'box-shadow 0.2s ease-in-out',
      '&:hover': {
        boxShadow: (theme) => theme.shadows[1],
      },
    }}
  >
    <Typography
      variant='caption'
      sx={{
        fontFamily: '"Inter", sans-serif',
        fontWeight: 700,
        color: 'text.secondary',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        display: 'block',
      }}
    >
      {label}
    </Typography>

    <Typography
      variant='h5'
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        color: 'text.primary',
        my: 0.5,
      }}
    >
      {value}
    </Typography>

    {subtext && (
      <Typography
        variant='caption'
        color='text.disabled'
        sx={{ display: 'block' }}
      >
        {subtext}
      </Typography>
    )}
  </Paper>
);

// Mirrors MetricCard's shape so the row keeps its height while loading. The
// accent stays neutral because a skeleton has no metric to color-code yet.
const MetricCardSkeleton = () => (
  <Paper
    variant='outlined'
    sx={{
      flex: 1,
      p: 2,
      borderRadius: 2,
      borderColor: '#E0E0E0',
      bgcolor: '#FFFFFF',
      borderTop: '3px solid #E0E0E0',
    }}
  >
    <Skeleton variant='text' width='45%' height={18} />
    <Skeleton variant='text' width='60%' height={34} sx={{ my: 0.5 }} />
    <Skeleton variant='text' width='35%' height={16} />
  </Paper>
);

const People = () => {
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState('last_30_days');
  const [metricsMode, setMetricsMode] = useState('production');
  const [gsqOnly, setGsqOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [sortModel, setSortModel] = useState([
    { field: 'created_at', sort: 'desc' },
  ]);
  const [selectionModel, setSelectionModel] = useState({
    type: 'include',
    ids: new Set(),
  });
  const [selectedRowsById, setSelectedRowsById] = useState(new Map());
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [markSoldLead, setMarkSoldLead] = useState(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [policyClient, setPolicyClient] = useState(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPaginationModel((current) => ({ ...current, page: 0 }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const activeSort = sortModel[0] || {
    field: 'created_at',
    sort: 'desc',
  };

  const {
    data: peopleResponse,
    isLoading,
    isFetching,
    error: peopleError,
  } = useQuery({
    queryKey: [
      'people',
      paginationModel.page,
      paginationModel.pageSize,
      activeSort.field,
      activeSort.sort,
      search,
      statusFilter,
      gsqOnly,
    ],
    queryFn: () =>
      getPeople({
        page: paginationModel.page + 1,
        limit: paginationModel.pageSize,
        sort: activeSort.field,
        direction: activeSort.sort || 'desc',
        search,
        status: statusFilter,
        gsqOnly,
      }),
    placeholderData: (previous) => previous,
  });

  const {
    data: metrics,
    isPending: isMetricsPending,
    error: metricsError,
  } = useQuery({
    queryKey: ['peopleMetrics', preset, metricsMode, gsqOnly],
    queryFn: () => getPeopleMetrics(preset, { mode: metricsMode, gsqOnly }),
  });

  const newLeads = Number(metrics?.new || 0);
  const closedSales = Number(metrics?.closed || 0);
  const totalRevenue = Number(metrics?.totalClosed || 0);
  const leadSpend = Number(metrics?.leadSpend || 0);

  const closeRate =
    newLeads > 0 ? ((closedSales / newLeads) * 100).toFixed(1) : '0.0';
  const avgDealSize = closedSales > 0 ? totalRevenue / closedSales : 0;

  const rows = peopleResponse?.data || [];
  const rowCount = peopleResponse?.pagination?.total || 0;
  const selectedIds = useMemo(
    () =>
      selectionModel?.ids
        ? Array.from(selectionModel.ids)
        : Array.isArray(selectionModel)
          ? selectionModel
          : [],
    [selectionModel],
  );
  useEffect(() => {
    setSelectedRowsById((current) => {
      const next = new Map(current);
      const selectedIdSet = new Set(selectedIds);
      let changed = false;

      for (const id of next.keys()) {
        if (!selectedIdSet.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      rows.forEach((row) => {
        if (selectedIdSet.has(row.id) && next.get(row.id) !== row) {
          next.set(row.id, row);
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [rows, selectedIds]);

  const selectedRows = useMemo(
    () => selectedIds.map((id) => selectedRowsById.get(id)).filter(Boolean),
    [selectedIds, selectedRowsById],
  );

  const refreshPeople = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['people'] }),
      queryClient.invalidateQueries({ queryKey: ['peopleMetrics'] }),
    ]);
  };

  const { mutate: removePeople, isPending: isDeleting } = useMutation({
    mutationFn: deletePeople,
    onSuccess: async () => {
      enqueueSnackbar('Selected people deleted', SNACKBAR_SUCCESS_OPTIONS);
      setSelectionModel({ type: 'include', ids: new Set() });
      setSelectedRowsById(new Map());
      setSelectedPersonId(null);
      await refreshPeople();
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.error || 'Failed to delete selected people',
        SNACKBAR_ERROR_OPTIONS,
      );
    },
  });

  const columns = useMemo(
    () => [
      {
        field: 'last_name',
        headerName: 'Name',
        minWidth: 180,
        flex: 1,
        renderCell: ({ row }) =>
          [row.first_name, row.last_name].filter(Boolean).join(' ') || '—',
      },
      { field: 'email', headerName: 'Email', minWidth: 220, flex: 1 },
      {
        field: 'phone',
        headerName: 'Phone',
        minWidth: 140,
        renderCell: ({ value }) => (
          <Box component='span' sx={{ fontFamily: MONO }}>
            {formatPhone(value)}
          </Box>
        ),
      },
      { field: 'state', headerName: 'State', minWidth: 130 },
      {
        field: 'lifecycle_status',
        headerName: 'Status',
        minWidth: 100,
        renderCell: ({ value }) => (
          <Chip
            label={value}
            size='small'
            sx={{
              bgcolor: value === 'SALE' ? '#E6F1EC' : '#F0F4F8',
              color: value === 'SALE' ? 'success.main' : 'secondary.main',
              border: '1px solid',
              borderColor: 'divider',
              fontWeight: 700,
              fontSize: '0.675rem',
            }}
          />
        ),
      },
      {
        field: 'verified',
        headerName: 'Verified',
        minWidth: 100,
        sortable: false,
        renderCell: ({ value }) =>
          value === true ? (
            <CheckCircleOutlinedIcon
              fontSize='small'
              sx={{ color: 'success.main' }}
            />
          ) : value === false ? (
            <HighlightOffOutlinedIcon
              fontSize='small'
              sx={{ color: 'text.disabled' }}
            />
          ) : (
            '—'
          ),
      },
      {
        field: 'created_at',
        headerName: 'Created At',
        minWidth: 210,
        renderCell: ({ value }) => (
          <Box component='span' sx={{ fontFamily: MONO }}>
            {value ? new Date(value).toLocaleString() : '—'}
          </Box>
        ),
      },
    ],
    [],
  );

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected ${
        selectedIds.length === 1 ? 'person' : 'people'
      } and their associated records?`,
    );
    if (confirmed) removePeople(selectedIds);
  };

  const handleMarkSold = (person) => {
    setMarkSoldLead(person);
    setSelectedPersonId(null);
    setClientDialogOpen(true);
  };

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent='space-between'
          alignItems={{ md: 'center' }}
          spacing={2}
        >
          <Box>
            <Typography variant='h4'>People</Typography>
            <Typography color='text.secondary'>
              Leads, clients, and policies in one place.
            </Typography>
          </Box>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Typography
                variant='caption'
                sx={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  color: gsqOnly ? 'text.primary' : 'text.secondary',
                }}
              >
                GSQ
              </Typography>
              <Switch
                size='small'
                checked={gsqOnly}
                onChange={(event) => {
                  setGsqOnly(event.target.checked);
                  setPaginationModel((current) => ({ ...current, page: 0 }));
                }}
                slotProps={{ input: { 'aria-label': 'GSQ leads only' } }}
              />
            </Stack>
            <FormControl size='small' sx={{ minWidth: 180 }}>
              <InputLabel id='people-date-preset-label'>Date range</InputLabel>
              <Select
                labelId='people-date-preset-label'
                value={preset}
                label='Date range'
                onChange={(event) => setPreset(event.target.value)}
              >
                {DATE_PRESETS.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Stack>

        {metricsError && (
          <Alert severity='error'>Failed to load people metrics.</Alert>
        )}
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <ToggleButtonGroup
            value={metricsMode}
            exclusive
            size='small'
            onChange={(event, value) => {
              if (value) setMetricsMode(value);
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            <ToggleButton value='production'>Production</ToggleButton>
            <ToggleButton value='profitability'>Profitability</ToggleButton>
          </ToggleButtonGroup>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            {isMetricsPending ? (
              [0, 1, 2, 3].map((index) => <MetricCardSkeleton key={index} />)
            ) : metricsMode === 'production' ? (
              <>
                <MetricCard
                  label='New Leads'
                  value={newLeads.toLocaleString()}
                  subtext='Delivered in period'
                />
                <MetricCard
                  label='Closed Sales'
                  value={closedSales.toLocaleString()}
                  subtext='Policies sold in period'
                />
                <MetricCard
                  label='Close Rate'
                  value={`${closeRate}%`}
                  subtext={`${closedSales.toLocaleString()} / ${newLeads.toLocaleString()} sold`}
                />
                <MetricCard
                  label='Total Revenue'
                  value={formatCurrency(totalRevenue)}
                  subtext={`Avg: ${formatCurrency(avgDealSize)}`}
                />
              </>
            ) : (
              <>
                <MetricCard
                  label='Leads Delivered'
                  value={newLeads.toLocaleString()}
                  subtext='Delivered in period'
                />
                <MetricCard
                  label='Total Lead Spend'
                  value={formatCurrency(leadSpend)}
                  subtext={`${newLeads.toLocaleString()} x ${formatCurrency(LEAD_COST)}`}
                />
                <MetricCard
                  label='Total Closed'
                  value={formatCurrency(totalRevenue)}
                  subtext='Cohort revenue, any sale date'
                />
                <MetricCard
                  label='ROI'
                  value={formatMultiplier(metrics?.roiMultiplier)}
                  subtext={`${formatSigned(metrics?.roiNet)} net`}
                />
              </>
            )}
          </Stack>
        </Stack>

        <Paper variant='outlined' sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent='space-between'
            spacing={1.5}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
            >
              <TextField
                variant='outlined'
                size='small'
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder='Search name, email, or phone'
                sx={{ width: { xs: '100%', sm: 360 } }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position='start'>
                        <SearchOutlinedIcon fontSize='small' />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                size='small'
                onChange={(event, value) => {
                  if (!value) return;
                  setStatusFilter(value);
                  setPaginationModel((current) => ({ ...current, page: 0 }));
                }}
              >
                <ToggleButton value='all'>All</ToggleButton>
                <ToggleButton value='lead'>Leads</ToggleButton>
                <ToggleButton value='sale'>Sales</ToggleButton>
              </ToggleButtonGroup>
            </Stack>
            <Button
              variant='contained'
              color='action'
              startIcon={<AddIcon />}
              onClick={() => setNewLeadOpen(true)}
            >
              New Lead
            </Button>
          </Stack>
        </Paper>

        {peopleError && (
          <Alert severity='error'>
            {peopleError?.response?.data?.error || 'Failed to load people.'}
          </Alert>
        )}

        <Paper variant='outlined' sx={{ height: 650, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            rowCount={rowCount}
            loading={isLoading || isFetching}
            paginationMode='server'
            sortingMode='server'
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50, 100]}
            sortModel={sortModel}
            onSortModelChange={(model) => {
              setSortModel(model);
              setPaginationModel((current) => ({ ...current, page: 0 }));
            }}
            checkboxSelection
            disableRowSelectionOnClick
            keepNonExistentRowsSelected
            rowSelectionModel={selectionModel}
            onRowSelectionModelChange={setSelectionModel}
            onRowClick={(params, event) => {
              if (event.target.closest?.('.MuiCheckbox-root')) return;
              setSelectedPersonId(params.id);
            }}
            sx={{ border: 0 }}
          />
        </Paper>
      </Stack>

      <Fade in={selectedIds.length > 0}>
        <Paper
          elevation={8}
          sx={{
            display: selectedIds.length ? 'block' : 'none',
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            zIndex: 1300,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            px: 2,
            py: 1.25,
            borderRadius: 2,
          }}
        >
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Typography fontWeight={700}>
              {selectedIds.length} selected
            </Typography>
            <Button
              color='inherit'
              startIcon={<DownloadOutlinedIcon />}
              onClick={() => downloadRows(selectedRows)}
              disabled={selectedRows.length !== selectedIds.length}
            >
              Download as .csv
            </Button>
            <Button
              color='inherit'
              startIcon={<DeleteOutlineIcon />}
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete lead'}
            </Button>
          </Stack>
        </Paper>
      </Fade>

      <NewLeadDialog
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onCreated={async (lead) => {
          await refreshPeople();
          setSelectedPersonId(lead?.id || null);
        }}
      />

      <PeopleDrawer
        open={Boolean(selectedPersonId)}
        personId={selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
        onUpdated={refreshPeople}
        onMarkSold={handleMarkSold}
      />

      {clientDialogOpen && (
        <CreateClientDialog
          open={clientDialogOpen}
          setOpen={setClientDialogOpen}
          lead={markSoldLead}
          refetchClients={refreshPeople}
          onCreated={async (client) => {
            await refreshPeople();
            setPolicyClient({
              ...client,
              lead_vendor_id: markSoldLead?.lead_vendor_id,
            });
            setPolicyDialogOpen(true);
          }}
        />
      )}

      {policyClient && (
        <CreatePolicyDialog
          open={policyDialogOpen}
          setOpen={(nextOpen) => {
            setPolicyDialogOpen(nextOpen);
            if (!nextOpen) setPolicyClient(null);
          }}
          client={policyClient}
          refetchClients={refreshPeople}
        />
      )}
    </Container>
  );
};

export default People;
