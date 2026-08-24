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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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

// Payments per year by premium_frequency; unknown frequencies assume monthly.
// Mirrors the server's annualizePremium for the card's Sale amount readout.
const PREMIUM_ANNUAL_MULTIPLIERS = {
  'weekly': 52,
  'monthly': 12,
  'quarterly': 4,
  'semi-annually': 2,
  'semi-annual': 2,
  'annually': 1,
  'annual': 1,
};

const annualizedSaleAmount = (policies) => {
  if (!Array.isArray(policies) || policies.length === 0) return null;
  const total = policies.reduce((sum, policy) => {
    const multiplier =
      PREMIUM_ANNUAL_MULTIPLIERS[
        String(policy.premium_frequency || '').toLowerCase()
      ] ?? 12;
    return sum + (Number(policy.premium_amount) || 0) * multiplier;
  }, 0);
  return total > 0 ? total : null;
};

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

const formatCurrency = (value, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

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

const formatBuild = ({ height_feet: feet, height_inches: inches, weight_lbs: pounds }) => {
  const heightInches = (Number(feet) || 0) * 12 + (Number(inches) || 0);
  const weight = Number(pounds) || 0;
  if (heightInches <= 0 || weight <= 0) return null;
  const bmi = ((weight / (heightInches * heightInches)) * 703).toFixed(1);
  const feetPart = Math.floor(heightInches / 12);
  const inchPart = heightInches % 12;
  return `${feetPart}'${inchPart}" · ${weight} lbs (${bmi})`;
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

const ColumnHeading = ({ children, right }) => (
  <Stack
    direction='row'
    justifyContent='space-between'
    alignItems='center'
    sx={{ mb: 0.75, minHeight: 20 }}
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
      {children}
    </Typography>
    {right}
  </Stack>
);

const Bullet = ({ children }) => (
  <Typography
    variant='caption'
    component='li'
    sx={{ color: 'text.primary', lineHeight: 1.7, listStyle: 'disc' }}
  >
    {children}
  </Typography>
);

const LabeledValue = ({ label, value, mono }) => (
  <Typography variant='caption' sx={{ display: 'block', lineHeight: 1.8 }}>
    <Box component='span' sx={{ color: 'text.secondary' }}>
      {label}:{' '}
    </Box>
    <Box
      component='span'
      sx={{ fontWeight: 600, fontFamily: mono ? MONO : 'inherit' }}
    >
      {value ?? '—'}
    </Box>
  </Typography>
);

// One expanded row per lead/client, matching BUSINESS_VIEW.png: identity,
// auto-saving notes, quick-action placeholders, funnel data with a
// show-more, and lead info with the sale readout.
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
  const [showMore, setShowMore] = useState(false);
  const debounceRef = useRef(null);
  // Saves are serialized: at most one PATCH in flight, and when it settles
  // any newer text is sent next. Concurrent saves could otherwise land out
  // of order and persist stale notes.
  const latestNotesRef = useRef(person.notes || '');
  const inFlightRef = useRef(false);

  // Reset when pagination swaps a different person into this card slot.
  useEffect(() => {
    setNotes(person.notes || '');
    setNoteStatus('idle');
    setShowMore(false);
    latestNotesRef.current = person.notes || '';
    inFlightRef.current = false;
  }, [person.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const { mutate: persistNotes } = useMutation({
    mutationFn: saveBusinessNotes,
    onSettled: (data, error, variables) => {
      if (latestNotesRef.current !== variables.notes) {
        persistNotes({ personId: person.id, notes: latestNotesRef.current });
        return;
      }
      inFlightRef.current = false;
      setNoteStatus(error ? 'error' : 'saved');
    },
  });

  const handleNotesChange = (event) => {
    const value = event.target.value;
    setNotes(value);
    setNoteStatus('saving');
    latestNotesRef.current = value;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      // An in-flight save re-sends the latest text when it settles.
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      persistNotes({ personId: person.id, notes: latestNotesRef.current });
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
  const build = formatBuild(person);
  const receivedAt = person.lead_created_at || person.created_at;
  const saleAmount = annualizedSaleAmount(person.policies);
  const age = computeAge(person.date_of_birth);

  const notesStatusIndicator = (
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
      }}
    >
      {noteStatus === 'idle' && 'Autosaves as you type'}
      {noteStatus === 'saving' && 'Saving…'}
      {noteStatus === 'saved' && (
        <>
          <CheckIcon sx={{ fontSize: 14 }} /> Saved
        </>
      )}
      {noteStatus === 'error' && 'Failed to save'}
    </Typography>
  );

  return (
    <Paper
      variant='outlined'
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: isSale ? 'success.main' : '#E0E0E0',
        borderWidth: isSale ? 1.5 : 1,
        bgcolor: isSale ? '#FBFDFC' : '#FFFFFF',
      }}
    >
      <Grid container columns={20} spacing={2}>
        {/* Column 1: identity & local time */}
        <Grid size={{ xs: 20, md: 4 }}>
          <Stack spacing={0.25}>
            <Stack direction='row' spacing={0.75} alignItems='center'>
              <Checkbox
                size='small'
                checked={selected}
                onChange={() => onToggleSelect(person)}
                sx={{ p: 0.25, ml: -0.5 }}
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
                  sx={{ fontFamily: MONO, fontSize: '0.8rem', overflowWrap: 'anywhere' }}
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

            {person.state && (
              <Typography variant='body2'>{person.state}</Typography>
            )}
            <LabeledValue
              label='Birthday'
              value={formatDate(person.date_of_birth)}
              mono
            />
            <LabeledValue label='Local time' value={localTime} mono />
          </Stack>
        </Grid>

        {/* Column 2: inline auto-saving notes */}
        <Grid size={{ xs: 20, md: 6 }}>
          <ColumnHeading right={notesStatusIndicator}>Notes</ColumnHeading>
          <TextField
            multiline
            rows={3}
            fullWidth
            size='small'
            placeholder='Start typing — notes save automatically…'
            value={notes}
            onChange={handleNotesChange}
          />
        </Grid>

        {/* Column 3: quick-action placeholders */}
        <Grid size={{ xs: 20, md: 3 }}>
          <ColumnHeading>Actions</ColumnHeading>
          <Stack spacing={1}>
            {QUICK_ACTIONS.map(([label, Icon]) => (
              <Tooltip
                key={label}
                title='Integrated sendblue texter / dialer coming soon - click to get notified'
              >
                {/* span wrapper so the tooltip and click work on a disabled button */}
                <Box
                  component='span'
                  onClick={onQuickAction}
                  sx={{ display: 'flex', cursor: 'pointer' }}
                >
                  <Button
                    fullWidth
                    size='small'
                    variant='outlined'
                    disabled
                    startIcon={<Icon />}
                    sx={{
                      justifyContent: 'flex-start',
                      pointerEvents: 'none',
                      textTransform: 'none',
                      // Disabled per spec, but keep the mockup's readable look.
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
        </Grid>

        {/* Column 4: funnel data with show-more */}
        <Grid size={{ xs: 20, md: 4 }}>
          <ColumnHeading>Funnel Data</ColumnHeading>
          <Box component='ul' sx={{ m: 0, pl: 2 }}>
            <Bullet>
              <Box component='span' sx={{ color: 'text.secondary' }}>Age: </Box>
              <b>{age ?? '—'}</b>
              <Box component='span' sx={{ color: 'text.secondary' }}> · Smoker: </Box>
              <b>{formatBool(person.smoker)}</b>
            </Bullet>
            <Bullet>
              <Box component='span' sx={{ color: 'text.secondary' }}>Face amount: </Box>
              <b>
                {person.face_amount
                  ? formatCurrency(person.face_amount, 0)
                  : '—'}
              </b>
            </Bullet>
            <Bullet>
              <Box component='span' sx={{ color: 'text.secondary' }}>Beneficiary: </Box>
              <b>{person.beneficiary || '—'}</b>
            </Bullet>
            <Bullet>
              <Box component='span' sx={{ color: 'text.secondary' }}>BMI: </Box>
              <b>{build || '—'}</b>
            </Bullet>
            <Bullet>
              <Box component='span' sx={{ color: 'text.secondary' }}>BP medication: </Box>
              <b>{formatBool(person.blood_pressure_medication)}</b>
            </Bullet>
            {showMore && (
              <>
                <Bullet>
                  <Box component='span' sx={{ color: 'text.secondary' }}>Cholesterol: </Box>
                  <b>{formatBool(person.cholesterol_medication)}</b>
                </Bullet>
                <Bullet>
                  <Box component='span' sx={{ color: 'text.secondary' }}>Reason: </Box>
                  <b>{person.why || '—'}</b>
                </Bullet>
              </>
            )}
          </Box>
          <Link
            component='button'
            underline='none'
            onClick={() => setShowMore((current) => !current)}
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'text.secondary',
              display: 'inline-flex',
              alignItems: 'center',
              mt: 0.5,
            }}
          >
            {showMore ? 'Show less' : 'Show more'}
            {showMore ? (
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            )}
          </Link>
        </Grid>

        {/* Column 5: lead info */}
        <Grid size={{ xs: 20, md: 3 }}>
          <ColumnHeading>Lead Info</ColumnHeading>
          <Stack spacing={0.25}>
            <LabeledValue
              label='Received'
              value={receivedAt ? new Date(receivedAt).toLocaleString() : null}
              mono
            />
            <LabeledValue label='Source' value={person.lead_vendor_name} />
            <LabeledValue
              label='Sale amount'
              value={saleAmount ? formatCurrency(saleAmount) : 'Not set'}
              mono={Boolean(saleAmount)}
            />
            {isSale && (
              <Box sx={{ pt: 0.75 }}>
                <Chip
                  label='Sold'
                  size='small'
                  sx={{
                    bgcolor: '#E6F1EC',
                    color: 'success.main',
                    fontWeight: 700,
                    fontSize: '0.675rem',
                  }}
                />
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BusinessCard;
