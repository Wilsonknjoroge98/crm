import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const ResetPassword = () => {
  const [sessionReady, setSessionReady] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase JS v2 automatically parses the #access_token hash on load
    // and fires PASSWORD_RECOVERY when a valid recovery session is detected.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery session detected.');
        setSessionReady(true);
      }
    });

    // Fallback: if the hash is missing or malformed, show an error after a short wait
    const timeout = setTimeout(() => {
      setTokenError((prev) => {
        if (!sessionReady) return true;
        return prev;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(
        updateError.message ||
          'Failed to update password. Your link may have expired.',
      );
    } else {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  // Still waiting for the Supabase auth event
  if (!sessionReady && !tokenError) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={2} alignItems='center'>
          <CircularProgress size={32} />
          <Typography variant='body2' color='text.secondary'>
            Verifying your reset link…
          </Typography>
        </Stack>
      </Box>
    );
  }

  // Token was missing or already expired
  if (tokenError && !sessionReady) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={3} sx={{ width: '100%', maxWidth: 360, px: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant='h5' fontWeight={600}>
              Link Expired
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              This password reset link is no longer valid. It may have already
              been used or expired.
            </Typography>
          </Stack>
          <Alert severity='warning'>
            Please request a new password reset link and try again.
          </Alert>
          <Button variant='outlined' onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </Stack>
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Stack spacing={3} sx={{ width: '100%', maxWidth: 360, px: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant='h5' fontWeight={600}>
              Password Updated
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              Your password has been changed successfully. Redirecting you to
              login…
            </Typography>
          </Stack>
          <Alert severity='success'>
            You're all set. You can now sign in with your new password.
          </Alert>
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
            Set a New Password
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Choose a strong password you haven't used before.
          </Typography>
        </Stack>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField
              label='New Password'
              type='password'
              fullWidth
              size='small'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText='At least 8 characters'
            />
            <TextField
              label='Confirm New Password'
              type='password'
              fullWidth
              size='small'
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />

            {error && (
              <Alert severity='error' sx={{ py: 0.5 }}>
                {error}
              </Alert>
            )}

            <Button
              type='submit'
              variant='contained'
              color='primary'
              fullWidth
              disabled={loading}
              sx={{ mt: 1 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Update Password'}
            </Button>
          </Stack>
        </form>
      </Stack>
    </Box>
  );
};

export default ResetPassword;
