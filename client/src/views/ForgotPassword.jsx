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
import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      setErrorMsg('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Reset your password
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Enter your email and we'll send you a reset link.
          </Typography>
        </Stack>

        {sent ? (
          <Alert severity='success'>
            Check your email for a password reset link.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label='Email'
                type='email'
                fullWidth
                size='small'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                disabled={loading}
                sx={{ mt: 1 }}
              >
                {loading ? <CircularProgress size={20} /> : 'Send Reset Link'}
              </Button>
            </Stack>
          </form>
        )}

        <Stack spacing={1.5}>
          <Divider />
          <Typography
            variant='caption'
            color='text.secondary'
            textAlign='center'
          >
            <Link href='/login' underline='hover' color='text.primary' fontWeight={500}>
              Back to Login
            </Link>
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
