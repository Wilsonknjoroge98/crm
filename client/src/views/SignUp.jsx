// SignUp.jsx

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
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { postAgent } from '../utils/query';
import { enqueueSnackbar } from 'notistack';

export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { mutate: createAgent } = useMutation({
    mutationFn: postAgent,
    onSuccess: () => {
      enqueueSnackbar('Account created successfully!', {
        variant: 'success',
        style: {
          fontWeight: 'bold',
          fontFamily: `"Libre Baskerville", serif`,
          fontSize: '1rem',
        },
        autoHideDuration: 5000,
        anchorOrigin: {
          vertical: 'bottom',
          horizontal: 'right',
        },
      });
    },
    onError: (error) => {
      console.error('Error creating agent:', error);
      setErrorMsg('Failed to create account. Please try again.');
    },
  });

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPass) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const user = await createUserWithEmailAndPassword(auth, email, password);
      createAgent({
        agent: { name, email, uid: user.user.uid, role: 'agent' },
      });
      navigate('/clients');
    } catch (error) {
      console.error(error);
      let message = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use')
        message = 'Email is already in use.';
      if (error.code === 'auth/invalid-email')
        message = 'Invalid email address.';
      if (error.code === 'auth/weak-password')
        message = 'Password should be at least 6 characters.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      component={Paper}
      elevation={4}
      sx={{
        maxWidth: 400,
        mx: 'auto',
        my: 8,
        p: 4,
        borderRadius: 2,
      }}
    >
      <Typography variant='h5' gutterBottom fontWeight={600}>
        Sign Up
      </Typography>

      <form onSubmit={handleSignUp}>
        <TextField
          label='Name'
          type='text'
          fullWidth
          margin='normal'
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

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

        <TextField
          label='Confirm Password'
          type='password'
          fullWidth
          margin='normal'
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
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
          {loading ? <CircularProgress size={24} /> : 'Sign Up'}
        </Button>
        <Typography sx={{ mt: 2 }} textAlign='center'>
          Already have an account?{' '}
          <Link href='/login' underline='hover'>
            Log In
          </Link>
        </Typography>
      </form>
    </Box>
  );
}
