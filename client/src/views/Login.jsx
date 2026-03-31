import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Stack,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [agency, setAgency] = useState('');
  const navigate = useNavigate();

  const url = window.location.href;

  useEffect(() => {
    if (url.includes('fearless')) {
      setAgency('446316f9-021a-460a-9bac-f7116e1bfa62');
    } else {
      setAgency('c533bb5e-26cf-47c5-b08d-c14e4ab4f904');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/clients');
    } catch {
      setErrorMsg(
        'We\u2019re unable to verify your credentials. Please try again.',
      );
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
        {agency && (
          <Box
            component='img'
            src={`${agency}_logo.png`}
            sx={{ maxHeight: 200, alignSelf: 'center', objectFit: 'contain' }}
          />
        )}

        <Stack spacing={0.5}>
          <Typography variant='h5' fontWeight={600}>
            Welcome back
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Sign in to your account to continue
          </Typography>
        </Stack>

        <form onSubmit={handleLogin}>
          <Stack spacing={2}>
            <TextField
              label='Email'
              type='email'
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              size='small'
            />
            <TextField
              label='Password'
              type='password'
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              size='small'
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
              {loading ? <CircularProgress size={20} /> : 'Sign In'}
            </Button>
            <Button
              variant='text'
              size='small'
              color='inherit'
              onClick={() => navigate('/forgot-password')}
              sx={{ alignSelf: 'center', color: 'text.secondary' }}
            >
              Forgot password?
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
            Need access?{' '}
            <Typography
              component='span'
              variant='caption'
              color='text.primary'
              sx={{ fontWeight: 500 }}
            >
              Ask your upline for an invite link.
            </Typography>
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
};

export default Login;
