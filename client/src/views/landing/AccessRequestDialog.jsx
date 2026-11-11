// AccessRequestDialog.jsx
// Step two of "Get access": the email box on the landing page opens this
// with the email filled in, and the agent adds the details we review
// (name, phone, NPN, licensed states). Submitting stores the request for an
// admin to approve in the CRM; nothing here creates an account. Once it is
// sent, the dialog turns into the confirmation.
import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import TextField from '@mui/material/TextField';
import { STATE_OPTIONS } from '../../utils/constants';
import { postAccessRequest } from '../../utils/query';
import {
  ERROR,
  GREEN,
  GREEN_BORDER,
  GREEN_TINT,
  HAIRLINE,
  INK,
  KEY,
  SERIF,
  SLATE_BODY,
  SLATE_MUTED,
  SLATE_NAVY,
  WHITE,
} from './blocks';

// Set this to a scheduling link to offer "Prefer to talk first? Book a call"
// on the confirmation. Left empty, the confirmation shows no link.
const BOOK_CALL_URL = '';

const EMPTY = { firstName: '', lastName: '', phone: '', npn: '' };

const digits = (value) => value.replace(/\D/g, '');

const buttonSx = {
  border: `1px solid ${INK}`,
  bgcolor: INK,
  color: WHITE,
  fontFamily: 'inherit',
  fontSize: '0.9375rem',
  fontWeight: 700,
  px: 3,
  py: 1.5,
  borderRadius: KEY,
  cursor: 'pointer',
  transition: 'background-color 0.15s',
  '&:hover': { bgcolor: SLATE_NAVY, borderColor: SLATE_NAVY },
  '&:disabled': { opacity: 0.6, cursor: 'default' },
};

function Confirmation({ email, onClose }) {
  return (
    <Box sx={{ textAlign: 'center', py: { xs: 1, sm: 2 } }}>
      <Box
        aria-hidden='true'
        sx={{
          width: 48,
          height: 48,
          mx: 'auto',
          mb: 2.5,
          borderRadius: '999px',
          border: `1px solid ${GREEN_BORDER}`,
          bgcolor: GREEN_TINT,
          color: GREEN,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component='svg'
          viewBox='0 0 24 24'
          sx={{
            width: 22,
            height: 22,
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 2.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
        >
          <path d='M5 12.5l4.5 4.5L19 7.5' />
        </Box>
      </Box>
      <Box
        component='h2'
        id='access-request-title'
        sx={{
          m: 0,
          mb: 1.5,
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: '1.5rem',
          lineHeight: 1.25,
          color: INK,
        }}
      >
        Request received
      </Box>
      <Box
        component='p'
        sx={{
          m: 0,
          mb: 3,
          fontSize: '1rem',
          lineHeight: 1.65,
          color: SLATE_BODY,
        }}
      >
        We review every request. Once yours is approved, we&apos;ll email your
        invite to <strong>{email}</strong>.
      </Box>
      <Box component='button' type='button' onClick={onClose} sx={buttonSx}>
        Done
      </Box>
      {BOOK_CALL_URL && (
        <Box sx={{ mt: 2.5, fontSize: '0.9375rem', color: SLATE_MUTED }}>
          Prefer to talk first?{' '}
          <Box
            component='a'
            href={BOOK_CALL_URL}
            target='_blank'
            rel='noreferrer'
            sx={{ color: INK, fontWeight: 600 }}
          >
            Book a call
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default function AccessRequestDialog({
  open,
  email: startEmail,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY);
  const [email, setEmail] = useState('');
  const [states, setStates] = useState([]);
  // A field people never see; only a bot fills it in.
  const [company, setCompany] = useState('');

  const {
    mutate: send,
    isPending,
    isSuccess,
    error,
    reset,
  } = useMutation({ mutationFn: postAccessRequest });

  // Each time it opens, start from the email typed on the page.
  useEffect(() => {
    if (!open) return;
    setEmail(startEmail || '');
    reset();
  }, [open, startEmail, reset]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    send({
      first_name: form.firstName,
      last_name: form.lastName,
      email,
      phone: form.phone,
      npn: form.npn,
      states: states.map((s) => s.code),
      company,
    });
  };

  const ready =
    form.firstName.trim() &&
    form.lastName.trim() &&
    email.trim() &&
    digits(form.phone).length >= 10 &&
    form.npn.length > 0 &&
    states.length > 0;

  const failure = error
    ? error.response?.data?.error ||
      'We couldn’t send your request. Please try again.'
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='sm'
      aria-labelledby='access-request-title'
      PaperProps={{
        elevation: 0,
        sx: {
          border: `1px solid ${HAIRLINE}`,
          borderRadius: '10px',
          p: { xs: 2.5, sm: 4 },
          m: { xs: 2, sm: 4 },
        },
      }}
    >
      {isSuccess ? (
        <Confirmation email={email} onClose={onClose} />
      ) : (
        <Box component='form' onSubmit={onSubmit} noValidate>
          <Box
            component='h2'
            id='access-request-title'
            sx={{
              m: 0,
              mb: 1,
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: '1.5rem',
              lineHeight: 1.25,
              color: INK,
            }}
          >
            Request access
          </Box>
          <Box
            component='p'
            sx={{
              m: 0,
              mb: 3,
              fontSize: '1rem',
              lineHeight: 1.6,
              color: SLATE_BODY,
            }}
          >
            Leads go to licensed agents only. Tell us who you are and we&apos;ll
            review your request.
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            <TextField
              label='First name'
              size='small'
              required
              autoFocus
              autoComplete='given-name'
              value={form.firstName}
              onChange={set('firstName')}
            />
            <TextField
              label='Last name'
              size='small'
              required
              autoComplete='family-name'
              value={form.lastName}
              onChange={set('lastName')}
            />
            <TextField
              label='Email'
              type='email'
              size='small'
              required
              autoComplete='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label='Mobile phone'
              type='tel'
              size='small'
              required
              autoComplete='tel'
              value={form.phone}
              onChange={set('phone')}
            />
            <TextField
              label='National Producer Number (NPN)'
              size='small'
              required
              inputProps={{ inputMode: 'numeric', maxLength: 10 }}
              value={form.npn}
              onChange={(e) =>
                setForm((f) => ({ ...f, npn: digits(e.target.value) }))
              }
              sx={{ gridColumn: '1 / -1' }}
            />
            <Autocomplete
              multiple
              size='small'
              disableCloseOnSelect
              options={STATE_OPTIONS}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(a, b) => a.code === b.code}
              value={states}
              onChange={(_, value) => setStates(value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tag } = getTagProps({ index });
                  return (
                    <Box
                      key={key}
                      component='span'
                      {...tag}
                      sx={{
                        mr: 0.5,
                        px: 1,
                        py: '2px',
                        borderRadius: '999px',
                        border: `1px solid ${HAIRLINE}`,
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        color: INK,
                      }}
                    >
                      {option.code}
                    </Box>
                  );
                })
              }
              renderInput={(params) => (
                <TextField {...params} label='Licensed states' required />
              )}
              sx={{ gridColumn: '1 / -1' }}
            />
            <Box
              component='input'
              type='text'
              name='company'
              tabIndex={-1}
              autoComplete='off'
              aria-hidden='true'
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              sx={{
                position: 'absolute',
                left: '-9999px',
                width: 1,
                height: 1,
                opacity: 0,
              }}
            />
          </Box>

          {failure && (
            <Box
              role='alert'
              sx={{ mt: 2, fontSize: '0.9375rem', color: ERROR }}
            >
              {failure}
            </Box>
          )}

          <Box
            sx={{
              mt: 3,
              display: 'flex',
              flexDirection: { xs: 'column-reverse', sm: 'row' },
              justifyContent: 'flex-end',
              gap: 1.5,
            }}
          >
            <Box
              component='button'
              type='button'
              onClick={onClose}
              sx={{
                ...buttonSx,
                bgcolor: WHITE,
                color: INK,
                borderColor: HAIRLINE,
                '&:hover': { borderColor: INK },
              }}
            >
              Cancel
            </Box>
            <Box
              component='button'
              type='submit'
              disabled={!ready || isPending}
              sx={buttonSx}
            >
              {isPending ? 'Sending…' : 'Send request'}
            </Box>
          </Box>
        </Box>
      )}
    </Dialog>
  );
}
