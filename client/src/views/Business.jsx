import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Fade,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TablePagination,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { enqueueSnackbar } from 'notistack';
import {
  deleteBusinessRecords,
  getBusinessRecords,
  getBusinessMetrics,
  getAgents,
} from '../utils/query';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';
import NewLeadDialog from '../components/NewLeadDialog';
import CreateClientDialog from '../components/CreateClientDialog';
import CreatePolicyDialog from '../components/CreatePolicyDialog';
import UpdatePolicyDialog from '../components/UpdatePolicyDialog';
import BusinessCard from '../components/BusinessCard';
import ReleaseNotificationDialog from '../components/ReleaseNotificationDialog';

const SANS = '"Inter", sans-serif';
const LOCAL_TIME_TICK_MS = 30000;
const SUPERUSER_ID = 'beeb19f7-c42e-4175-9477-0a91c393101c';
// TEMPORARY TEST OVERRIDE — remove after testing. Superuser-only: scopes the
// list and metrics queries to this agent instead of the caller's own.

// One row per business record, so a person with multiple policies only gets
// the most recent one's fields (the view already orders policies newest
// first) plus a count so nothing is silently dropped.
const formatBeneficiaries = (policy) =>
  (policy?.beneficiaries || [])
    .map(
      (b) =>
        `${[b.first_name, b.last_name].filter(Boolean).join(' ')} (${
          b.relationship || '—'
        }, ${b.allocation_percent ?? '—'}%, ${b.beneficiary_type})`,
    )
    .join('; ');

// [label, accessor] rather than [field, label]: policy and beneficiary
// columns are computed from `person.policies`, not a flat field lookup.
const CSV_COLUMNS = [
  ['Business ID', (p) => p.id],
  ['Lead ID', (p) => p.lead_id],
  ['Client ID', (p) => p.client_id],
  ['Lifecycle', (p) => p.lifecycle_status],
  ['First Name', (p) => p.first_name],
  ['Last Name', (p) => p.last_name],
  ['Email', (p) => p.email],
  ['Phone', (p) => p.phone],
  ['Date of Birth', (p) => p.date_of_birth],
  ['State', (p) => p.state],
  ['Address', (p) => p.address],
  ['City', (p) => p.city],
  ['Zip', (p) => p.zip],
  ['Occupation', (p) => p.occupation],
  ['Marital Status', (p) => p.marital_status],
  ['Annual Income', (p) => p.annual_income],
  ['Agent ID', (p) => p.agent_id],
  ['Sold', (p) => p.sold],
  ['Verified', (p) => p.verified],
  ['Smoker', (p) => p.smoker],
  ['Height (feet)', (p) => p.height_feet],
  ['Height (inches)', (p) => p.height_inches],
  ['Weight (lbs)', (p) => p.weight_lbs],
  ['Cholesterol Medication', (p) => p.cholesterol_medication],
  ['Blood Pressure Medication', (p) => p.blood_pressure_medication],
  ['Health Class', (p) => p.health_class],
  ['Face Amount', (p) => p.face_amount],
  ['Premium', (p) => p.premium],
  ['Premium Min', (p) => p.premium_min],
  ['Premium Max', (p) => p.premium_max],
  ['Selected Carrier', (p) => p.selected_carrier],
  ['Selected Plan', (p) => p.selected_plan],
  ['Beneficiary', (p) => p.beneficiary],
  ['Priority', (p) => p.priority],
  ['Why', (p) => p.why],
  ['Availability', (p) => p.availability],
  ['Lead Vendor ID', (p) => p.lead_vendor_id],
  ['Lead Vendor Name', (p) => p.lead_vendor_name],
  ['GSQ Source', (p) => p.gsq_source],
  ['GSQ ID', (p) => p.gsq_id],
  ['GSQ Live Transfer', (p) => p.gsq_live_transfer],
  ['Notes', (p) => p.notes],
  ['Lead Created At', (p) => p.lead_created_at],
  ['Client Created At', (p) => p.client_created_at],
  ['Created At', (p) => p.created_at],
  ['Updated At', (p) => p.updated_at],
  ['Policy Count', (p) => (p.policies || []).length],
  ['Policy Number', (p) => p.policies?.[0]?.policy_number],
  ['Policy Status', (p) => p.policies?.[0]?.policy_status],
  ['Carrier', (p) => p.policies?.[0]?.carrier_name],
  ['Product', (p) => p.policies?.[0]?.product_name],
  ['Coverage Amount', (p) => p.policies?.[0]?.coverage_amount],
  ['Premium Amount', (p) => p.policies?.[0]?.premium_amount],
  ['Premium Frequency', (p) => p.policies?.[0]?.premium_frequency],
  ['Effective Date', (p) => p.policies?.[0]?.effective_date],
  ['Sold Date', (p) => p.policies?.[0]?.sold_date],
  ['Draft Day', (p) => p.policies?.[0]?.draft_day],
  ['Split Policy', (p) => p.policies?.[0]?.split_policy],
  ['Policy Beneficiaries', (p) => formatBeneficiaries(p.policies?.[0])],
];

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
          ? 'Yes'
          : 'No'
        : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
};

const downloadRows = (rows) => {
  const header = CSV_COLUMNS.map(([label]) => escapeCsv(label)).join(',');
  const body = rows.map((row) =>
    CSV_COLUMNS.map(([, getValue]) => escapeCsv(getValue(row))).join(','),
  );
  const blob = new Blob([[header, ...body].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `business-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};

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
      bgcolor: '#FFFFFF',
      borderTop: `3px solid ${accentColor}`,
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

const CardSkeleton = () => (
  <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      {[0, 1, 2, 3].map((column) => (
        <Box key={column} sx={{ flex: 1 }}>
          <Skeleton variant='text' width='70%' height={22} />
          <Skeleton variant='text' width='90%' height={18} />
          <Skeleton variant='text' width='55%' height={18} />
        </Box>
      ))}
    </Stack>
  </Paper>
);

const Business = () => {
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.user);
  const isAdmin = user?.id === SUPERUSER_ID;
  const [gsqOnly, setGsqOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectedById, setSelectedById] = useState(new Map());
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [markSoldLead, setMarkSoldLead] = useState(null);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [policyClient, setPolicyClient] = useState(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [editPolicyOpen, setEditPolicyOpen] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  // Single ticking clock shared by every card's local-time display.
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date()),
      LOCAL_TIME_TICK_MS,
    );
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const {
    data: businessResponse,
    isLoading,
    error: businessError,
  } = useQuery({
    queryKey: ['business', page, pageSize, search, statusFilter, gsqOnly],
    queryFn: () =>
      getBusinessRecords({
        page: page + 1,
        limit: pageSize,
        sort: 'created_at',
        direction: 'desc',
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
    queryKey: ['businessMetrics', gsqOnly],
    queryFn: () => getBusinessMetrics({ gsqOnly }),
  });

  // Only needed for UpdatePolicyDialog's split-policy agent picker.
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => getAgents(),
  });

  const rows = businessResponse?.data || [];
  const rowCount = businessResponse?.pagination?.total || 0;
  const selectedIds = useMemo(() => [...selectedById.keys()], [selectedById]);
  const selectedRows = useMemo(
    () => [...selectedById.values()],
    [selectedById],
  );

  const refreshBusiness = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['business'] }),
      queryClient.invalidateQueries({ queryKey: ['businessMetrics'] }),
    ]);
  };

  const { mutate: removeRecords, isPending: isDeleting } = useMutation({
    mutationFn: deleteBusinessRecords,
    onSuccess: async () => {
      enqueueSnackbar('Selected records deleted', SNACKBAR_SUCCESS_OPTIONS);
      setSelectedById(new Map());
      setSelectedPersonId(null);
      await refreshBusiness();
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.error || 'Failed to delete selected records',
        SNACKBAR_ERROR_OPTIONS,
      );
    },
  });

  const toggleSelected = (person) => {
    setSelectedById((current) => {
      const next = new Map(current);
      if (next.has(person.id)) {
        next.delete(person.id);
      } else {
        next.set(person.id, person);
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected ${
        selectedIds.length === 1 ? 'record' : 'records'
      } and their associated data?`,
    );
    if (confirmed) removeRecords(selectedIds);
  };

  const handleMarkSold = (person) => {
    setMarkSoldLead(person);
    setClientDialogOpen(true);
  };

  // Recovery path for a SALE record whose client was created but never got
  // a policy (dialog cancelled, request failed, etc.) — skips straight to
  // CreatePolicyDialog instead of going through CreateClientDialog again.
  const handleAddPolicy = (person) => {
    setPolicyClient({ ...person, id: person.client_id });
    setPolicyDialogOpen(true);
  };

  // The view's policy JSON carries raw carrier_id/product_id (from
  // to_jsonb(policies)), but UpdatePolicyDialog's carrier/product selects
  // bind to `carrier`/`product` — remap so they prefill correctly.
  const handleEditPolicy = (person, policy) => {
    setEditingPolicy({
      ...policy,
      carrier: policy.carrier_id,
      product: policy.product_id,
      client_name: [person.first_name, person.last_name]
        .filter(Boolean)
        .join(' '),
    });
    setEditPolicyOpen(true);
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
            <Typography variant='h4'>Business</Typography>
            <Typography color='text.secondary'>
              Leads, clients, and policies in one place.
            </Typography>
          </Box>
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
                setPage(0);
              }}
              slotProps={{ input: { 'aria-label': 'GSQ leads only' } }}
            />
          </Stack>
        </Stack>

        {metricsError && (
          <Alert severity='error'>Failed to load business metrics.</Alert>
        )}
        {/* All-time financial strip; Stripe-derived spend, not estimates. */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          {isMetricsPending ? (
            [0, 1, 2, 3, 4].map((index) => <MetricCardSkeleton key={index} />)
          ) : (
            <>
              <MetricCard
                label='Lead Spend'
                value={formatCurrency(metrics?.leadSpend)}
                subtext='All-time Stripe charges'
              />
              <MetricCard
                label='Lead Count'
                value={Number(metrics?.leadsDelivered || 0).toLocaleString()}
                subtext='All-time'
              />
              <MetricCard
                label='Closed Sales'
                value={Number(metrics?.closedSales || 0).toLocaleString()}
                subtext='All-time policies sold'
              />
              <MetricCard
                label='Total Closed'
                value={formatCurrency(metrics?.totalClosed)}
                subtext='Annual premium, all-time'
              />
              <MetricCard
                label='ROI Multiplier'
                value={formatMultiplier(metrics?.roiMultiplier)}
                subtext={`${formatSigned(metrics?.roiNet)} net`}
                accentColor='#2E7D32'
              />
            </>
          )}
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
                  setPage(0);
                }}
              >
                <ToggleButton value='all'>All</ToggleButton>
                <ToggleButton value='lead'>Leads</ToggleButton>
                <ToggleButton value='sale'>Sales</ToggleButton>
              </ToggleButtonGroup>
              {/* Placeholder filters from BUSINESS_VIEW.png; same coming-soon
                  treatment as the card action buttons. */}
              {['Disposition tags', 'Automations'].map((label) => (
                <Tooltip
                  key={label}
                  title='Coming soon - click to get notified'
                >
                  <Box
                    component='span'
                    onClick={() => setReleaseDialogOpen(true)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <Button
                      size='small'
                      variant='outlined'
                      disabled
                      endIcon={<ArrowDropDownIcon />}
                      sx={{
                        textTransform: 'none',
                        pointerEvents: 'none',
                        '&.Mui-disabled': {
                          color: 'text.primary',
                          borderColor: '#E0E0E0',
                          opacity: 0.9,
                        },
                      }}
                    >
                      {label}
                    </Button>
                  </Box>
                </Tooltip>
              ))}
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

        {businessError && (
          <Alert severity='error'>
            {businessError?.response?.data?.error ||
              'Failed to load business records.'}
          </Alert>
        )}

        <Stack spacing={1.5}>
          <Stack
            direction='row'
            justifyContent='space-between'
            alignItems='center'
            sx={{ px: 0.5 }}
          >
            <Typography
              variant='caption'
              sx={{
                fontFamily: SANS,
                fontWeight: 700,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              {selectedIds.length} selected
            </Typography>
            <Typography
              variant='caption'
              sx={{
                fontFamily: '"JetBrains Mono", monospace',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              {rowCount > 0
                ? `${page * pageSize + 1}–${Math.min(
                    (page + 1) * pageSize,
                    rowCount,
                  )} of ${rowCount.toLocaleString()}`
                : '0 of 0'}
            </Typography>
          </Stack>
          {isLoading ? (
            [0, 1, 2].map((index) => <CardSkeleton key={index} />)
          ) : rows.length === 0 ? (
            <Paper
              variant='outlined'
              sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}
            >
              <Typography color='text.secondary'>
                No records match the current filters.
              </Typography>
            </Paper>
          ) : (
            rows.map((person) => (
              <BusinessCard
                key={person.id}
                person={person}
                now={now}
                isAdmin={isAdmin}
                selected={selectedById.has(person.id)}
                onToggleSelect={toggleSelected}
                onQuickAction={() => setReleaseDialogOpen(true)}
                onMarkSold={handleMarkSold}
                onAddPolicy={handleAddPolicy}
                onEditPolicy={handleEditPolicy}
              />
            ))
          )}

          <Paper variant='outlined' sx={{ borderRadius: 2 }}>
            <TablePagination
              component='div'
              count={rowCount}
              page={page}
              onPageChange={(event, nextPage) => setPage(nextPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </Paper>
        </Stack>
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
            >
              Download as .csv
            </Button>
            <Button
              color='inherit'
              startIcon={<DeleteOutlineIcon />}
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </Stack>
        </Paper>
      </Fade>

      <NewLeadDialog
        open={newLeadOpen}
        onClose={() => setNewLeadOpen(false)}
        onCreated={refreshBusiness}
      />

      <ReleaseNotificationDialog
        open={releaseDialogOpen}
        onClose={() => setReleaseDialogOpen(false)}
      />

      {clientDialogOpen && (
        <CreateClientDialog
          open={clientDialogOpen}
          setOpen={setClientDialogOpen}
          lead={markSoldLead}
          refetchClients={refreshBusiness}
          onCreated={async (client) => {
            await refreshBusiness();
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
          refetchClients={refreshBusiness}
        />
      )}

      {editingPolicy && (
        <UpdatePolicyDialog
          open={editPolicyOpen}
          setOpen={(nextOpen) => {
            setEditPolicyOpen(nextOpen);
            if (!nextOpen) setEditingPolicy(null);
          }}
          policy={editingPolicy}
          refetchPolicies={refreshBusiness}
          agents={agents}
        />
      )}
    </Container>
  );
};

export default Business;
