import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Grid,
  IconButton,
  Link,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import { useMutation } from '@tanstack/react-query';
import { enqueueSnackbar } from 'notistack';
import { saveBusinessNotes } from '../utils/query';
import { SNACKBAR_SUCCESS_OPTIONS } from '../utils/constants';
import { formatLocalTime } from '../utils/stateTimezones';

const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const NOTES_DEBOUNCE_MS = 800;

const QUICK_ACTIONS = [
  ['Call', CallOutlinedIcon],
  ['Text', SmsOutlinedIcon],
  ['Disposition', AssignmentTurnedInOutlinedIcon],
  ['Appointment', EventOutlinedIcon],
];

const formatPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 10) return value || '';
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

const formatDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
};

const computeAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  return beforeBirthday ? age - 1 : age;
};

const computeBmi = ({ height_feet: feet, height_inches: inches, weight_lbs: pounds }) => {
  const heightInches = (Number(feet) || 0) * 12 + (Number(inches) || 0);
  const weight = Number(pounds) || 0;
  if (heightInches <= 0 || weight <= 0) return null;
  return ((weight / (heightInches * heightInches)) * 703).toFixed(1);
};

const formatBool = (value) =>
  value === true ? 'Yes' : value === false ? 'No' : '—';

const copyToClipboard = async (label, value) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(String(value));
    enqueueSnackbar(`${label} copied`, SNACKBAR_SUCCESS_OPTIONS);
  } catch {
    // Clipboard access denied (e.g. non-secure context); nothing to surface.
  }
};

const SummaryRow = ({ label, value }) => (
  <Stack direction='row' spacing={1} justifyContent='space-between'>
    <Typography
      variant='caption'
      sx={{ fontFamily: SANS, fontWeight: 700, color: 'text.secondary' }}
    >
      {label}
    </Typography>
    <Typography variant='caption' sx={{ fontWeight: 600, textAlign: 'right' }}>
      {value ?? '—'}
    </Typography>
  </Stack>
);

// One expanded row per lead/client. Column 1 identity + local time, column 2
// auto-saving notes, column 3 quick-action placeholders, column 4
// underwriting summary.
const BusinessCard = ({
  person,
  now,
  selected,
  onToggleSelect,
  onOpenDrawer,
  onQuickAction,
}) => {
  const [notes, setNotes] = useState(person.notes || '');
  const [noteStatus, setNoteStatus] = useState('idle');
  const debounceRef = useRef(null);

  // Reset when pagination swaps a different person into this card slot.
  useEffect(() => {
    setNotes(person.notes || '');
    setNoteStatus('idle');
  }, [person.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: persistNotes } = useMutation({
    mutationFn: saveBusinessNotes,
    onSuccess: () => setNoteStatus('saved'),
    onError: () => setNoteStatus('error'),
  });

  const handleNotesChange = (event) => {
    const value = event.target.value;
    setNotes(value);
    setNoteStatus('saving');
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      persistNotes({ personId: person.id, notes: value });
    }, NOTES_DEBOUNCE_MS);
  };

  useEffect(
    () => () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    },
    [],
  );

  const isSale = person.lifecycle_status === 'SALE';
  const fullName =
    [person.first_name, person.last_name].filter(Boolean).join(' ') || '—';
  const localTime = formatLocalTime(person.state, now);
  const bmi = computeBmi(person);
  const receivedAt = person.lead_created_at || person.created_at;

  return (
    <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, borderColor: '#E0E0E0' }}>
      <Grid container spacing={2}>
        {/* Column 1: identity & local time */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={0.75}>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Checkbox
                size='small'
                checked={selected}
                onChange={() => onToggleSelect(person)}
                sx={{ p: 0.25 }}
                inputProps={{ 'aria-label': `Select ${fullName}` }}
              />
              <Link
                component='button'
                underline='hover'
                onClick={() => onOpenDrawer(person.id)}
                sx={{ fontWeight: 700, fontSize: '1rem', textAlign: 'left' }}
              >
                {fullName}
              </Link>
              <Chip
                label={person.lifecycle_status}
                size='small'
                sx={{
                  bgcolor: isSale ? '#E6F1EC' : '#F0F4F8',
                  color: isSale ? 'success.main' : 'secondary.main',
                  border: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 700,
                  fontSize: '0.675rem',
                }}
              />
            </Stack>

            {person.phone && (
              <Stack direction='row' spacing={0.5} alignItems='center'>
                <Typography variant='body2' sx={{ fontFamily: MONO }}>
                  {formatPhone(person.phone)}
                </Typography>
                {person.verified === true && (
                  <Tooltip title='Verified'>
                    <CheckCircleOutlinedIcon
                      sx={{ fontSize: 16, color: 'success.main' }}
                    />
                  </Tooltip>
                )}
                <IconButton
                  size='small'
                  aria-label='Copy phone'
                  onClick={() => copyToClipboard('Phone', person.phone)}
                >
                  <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            )}

            {person.email && (
              <Stack direction='row' spacing={0.5} alignItems='center'>
                <Typography
                  variant='body2'
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {person.email}
                </Typography>
                <IconButton
                  size='small'
                  aria-label='Copy email'
                  onClick={() => copyToClipboard('Email', person.email)}
                >
                  <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Stack>
            )}

            <Typography variant='body2' color='text.secondary'>
              {[person.state, formatDate(person.date_of_birth) &&
                `DOB ${formatDate(person.date_of_birth)}`]
                .filter(Boolean)
                .join(' • ') || '—'}
            </Typography>

            {localTime && (
              <Stack direction='row' spacing={0.5} alignItems='center'>
                <AccessTimeOutlinedIcon
                  sx={{ fontSize: 14, color: 'text.secondary' }}
                />
                <Typography
                  variant='caption'
                  sx={{ fontFamily: MONO, color: 'text.secondary' }}
                >
                  {localTime} local
                </Typography>
              </Stack>
            )}
          </Stack>
        </Grid>

        {/* Column 2: inline auto-saving notes */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={0.5} sx={{ height: '100%' }}>
            <TextField
              multiline
              rows={3}
              fullWidth
              size='small'
              placeholder='Notes — autosaves as you type'
              value={notes}
              onChange={handleNotesChange}
            />
            <Typography
              variant='caption'
              sx={{
                fontFamily: SANS,
                color:
                  noteStatus === 'error'
                    ? 'error.main'
                    : noteStatus === 'saved'
                      ? 'success.main'
                      : 'text.disabled',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                minHeight: 18,
              }}
            >
              {noteStatus === 'saving' && 'Saving…'}
              {noteStatus === 'saved' && (
                <>
                  <CheckIcon sx={{ fontSize: 14 }} /> Saved
                </>
              )}
              {noteStatus === 'error' && 'Failed to save'}
            </Typography>
          </Stack>
        </Grid>

        {/* Column 3: quick-action placeholders */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={1}>
            {QUICK_ACTIONS.map(([label, Icon]) => (
              <Tooltip
                key={label}
                title='Integrated sendblue texter / dialer coming soon - click to get notified'
              >
                {/* span wrapper so the tooltip and click work on a disabled button */}
                <Box component='span' onClick={onQuickAction} sx={{ display: 'flex' }}>
                  <Button
                    fullWidth
                    size='small'
                    variant='outlined'
                    disabled
                    startIcon={<Icon />}
                    sx={{ justifyContent: 'flex-start', pointerEvents: 'none' }}
                  >
                    {label}
                  </Button>
                </Box>
              </Tooltip>
            ))}
          </Stack>
        </Grid>

        {/* Column 4: underwriting summary */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={0.25}>
            <SummaryRow label='Age' value={computeAge(person.date_of_birth)} />
            <SummaryRow label='Smoker' value={formatBool(person.smoker)} />
            <SummaryRow
              label='Face Amount'
              value={
                person.face_amount
                  ? Number(person.face_amount).toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                    })
                  : '—'
              }
            />
            <SummaryRow label='Beneficiary' value={person.beneficiary} />
            <SummaryRow label='Reason' value={person.why} />
            <SummaryRow label='BMI' value={bmi} />
            <SummaryRow
              label='Cholesterol Med'
              value={formatBool(person.cholesterol_medication)}
            />
            <SummaryRow
              label='BP Med'
              value={formatBool(person.blood_pressure_medication)}
            />
            <SummaryRow
              label='Received'
              value={receivedAt ? new Date(receivedAt).toLocaleString() : '—'}
            />
            <SummaryRow label='Source' value={person.lead_vendor_name} />
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BusinessCard;
