import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Link,
  Stack,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { postAgent, validateInvite } from '../utils/query';
import { enqueueSnackbar } from 'notistack';
import { toTitleCase } from '../utils/helpers';
import {
  SNACKBAR_SUCCESS_OPTIONS,
  SNACKBAR_ERROR_OPTIONS,
} from '../utils/constants';
import { supabase } from '../utils/supabase';

export default function SignUp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [npn, setNpn] = useState('');
  const [name, setName] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const {
    data: tokenValidation,
    isLoading: tokenLoading,
    isError: tokenError,
    error: tokenErrorData,
  } = useQuery({
    queryKey: ['invite-validate', token],
    queryFn: () => validateInvite(token),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (!token) {
      enqueueSnackbar(
        'An invite link is required to sign up.',
        SNACKBAR_ERROR_OPTIONS,
      );
    }
  }, []);

  useEffect(() => {
    if (tokenErrorData) {
      enqueueSnackbar(
        tokenErrorData?.response?.data?.error ||
          'Failed to validate invite token.',
        SNACKBAR_ERROR_OPTIONS,
      );
    }
  }, [tokenErrorData]);

  const { mutateAsync: createAgent } = useMutation({
    mutationFn: postAgent,
    onError: (error) => {
      console.error('Error creating agent:', error);
      setErrorMsg('Failed to create account. Please try again.');
    },
  });

  const tokenInvalid =
    !token || tokenError || (tokenValidation && !tokenValidation.valid);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (tokenInvalid) {
      enqueueSnackbar(
        'A valid invite link is required to sign up.',
        SNACKBAR_ERROR_OPTIONS,
      );
      return;
    }

    if (password !== confirmPass) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;

      await createAgent({
        data: {
          userId: user.id,
          name,
          email,
          npn,
          role: 'agent',
          level: 105,
          token,
        },
      });

      enqueueSnackbar('Account created!', SNACKBAR_SUCCESS_OPTIONS);
      navigate('/clients');
    } catch (error) {
      console.error(error);
      setErrorMsg('Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenLoading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (tokenInvalid) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 360, px: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant='h5' fontWeight={600}>
              Invalid Invite
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              This invite link is invalid, expired, or has already been used.
            </Typography>
          </Stack>
          <Alert severity='error' sx={{ py: 0.5 }}>
            Please request a new invite link from your upline.
          </Alert>
          <Divider />
          <Typography
            variant='caption'
            color='text.secondary'
            textAlign='center'
          >
            Already have an account?{' '}
            <Link
              href='/login'
              underline='hover'
              color='text.primary'
              fontWeight={500}
            >
              Sign in
            </Link>
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={4} sx={{ width: '100%', maxWidth: 360, px: 2 }}>
        <Stack spacing={0.5}>
          <Typography variant='h5' fontWeight={600}>
            Create your account
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            You&apos;ve been invited to join the platform.
          </Typography>
        </Stack>

        <form onSubmit={handleSignUp}>
          <Stack spacing={2}>
            <TextField
              label='Full Name'
              type='text'
              fullWidth
              size='small'
              value={name}
              onChange={(e) => setName(toTitleCase(e.target.value))}
            />
            <TextField
              label='Email'
              type='email'
              fullWidth
              size='small'
              value={email}
              onChange={(e) => setEmail(e.target.value.toLowerCase())}
              required
            />
            <TextField
              label='NPN'
              type='text'
              fullWidth
              size='small'
              value={npn}
              onChange={(e) => setNpn(e.target.value)}
              required
            />
            <TextField
              label='Password'
              type='password'
              fullWidth
              size='small'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <TextField
              label='Confirm Password'
              type='password'
              fullWidth
              size='small'
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              required
            />

            {errorMsg && (
              <Alert severity='error' sx={{ py: 0.5 }}>
                {errorMsg}
              </Alert>
            )}

            <Button
              type='submit'
              variant='contained'
              color='primary'
              fullWidth
              disabled={loading || npn.length !== 10}
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Create Account'}
            </Button>
          </Stack>
        </form>

        <Stack spacing={1.5}>
          <Divider />
          <Typography
            variant='caption'
            color='text.secondary'
            textAlign='center'
          >
            Already have an account?{' '}
            <Link href='/login' underline='hover' color='text.primary'>
              <Typography component='span' variant='caption' fontWeight={500}>
                Sign in
              </Typography>
            </Link>
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
