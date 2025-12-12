import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Link,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [agency, setAgency] = useState('');
  const navigate = useNavigate();

  // const agency = agent?.agency || 'ag_tY71LfQm';
  // const agency = agent?.agency || 'ag_Hq92aLsK';

  // get domain name from url
  const url = window.location.href;

  useEffect(() => {
    if (url.includes('fearless')) {
      setAgency('ag_Hq92aLsK');
    } else {
      setAgency('ag_tY71LfQm');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/clients');
    } catch (error) {
      console.error(error);
      let message = 'Login failed. Please try again.';
      if (error.code === 'auth/user-not-found') message = 'User not found.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component={Paper}
      elevation={0}
      sx={{
        maxWidth: 400,
        mx: 'auto',
        my: 4,
        p: 4,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'center',
      }}
    >
      <Box
        component='img'
        src={`${agency}_logo.png`}
        sx={{ maxHeight: '200px', alignSelf: 'center', justifySelf: 'center' }}
      />
      <Typography variant='h5' gutterBottom fontWeight={600}>
        Login
      </Typography>

      <form onSubmit={handleLogin}>
        <TextField
          label='Email'
          type='email'
          fullWidth
          margin='normal'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <TextField
          label='Password'
          type='password'
          fullWidth
          margin='normal'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {errorMsg && (
          <Alert severity='error' sx={{ mt: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <Button
          type='submit'
          variant='contained'
          color='primary'
          fullWidth
          sx={{ mt: 3 }}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Login'}
        </Button>
        <Typography sx={{ mt: 2 }} textAlign='center'>
          Don't have an account?{' '}
          <Link href='/signup' underline='hover'>
            Sign Up
          </Link>
        </Typography>
      </form>
    </Box>
  );
};

export default Login;
