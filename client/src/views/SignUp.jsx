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
  MenuItem,
  Stack,
} from '@mui/material';
import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { postAgent } from '../utils/query';
import { enqueueSnackbar } from 'notistack';
import { toTitleCase } from '../utils/helpers';
import { SNACKBAR_SUCCESS_OPTIONS } from '../utils/constants';
import { supabase } from '../utils/supabase';
export default function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [npn, setNpn] = useState('');
  const [name, setName] = useState('');
  const [agency, setAgency] = useState('');
  const [uplineEmail, setUplineEmail] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { mutate: createAgent } = useMutation({
    mutationFn: postAgent,
    onSuccess: () => {
      enqueueSnackbar('Account created successfully!', SNACKBAR_SUCCESS_OPTIONS);
    },
    onError: (error) => {
      console.error('Error creating agent:', error);
      setErrorMsg('Failed to create account. Please try again.');
    },
  });

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!agency) {
      setErrorMsg('Please select an agency.');
      return;
    }

    if (password !== confirmPass) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // create supabase account after email verification is disabled
      const { user } = await supabase.auth.signUp({
            email,
            password,
        }
      )
      console.log(user)


      createAgent({
        data: {
          name,
          email,
          agency,
          npn,
          uplineEmail,
          role: 'agent',
          level: 105,
        },
      });
      navigate('/clients');
    } catch (error) {
      console.error(error);
      let message = 'Sign up failed. Please try again.';
      if (error.code === 'auth/email-already-in-use') message = 'Email is already in use.';
      if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
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
      <Typography variant='h5' gutterBottom fontWeight={600}>
        Sign Up
      </Typography>

      <form onSubmit={handleSignUp}>
        <TextField
          label='Name'
          type='text'
          margin='normal'
          fullWidth
          value={name}
          onChange={(e) => setName(toTitleCase(e.target.value))}
        />

        <TextField
          label='Email'
          type='email'
          margin='normal'
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
          required
        />
        <TextField
          label='NPN'
          type='text'
          margin='normal'
          fullWidth
          value={npn}
          onChange={(e) => setNpn(e.target.value)}
          required
          />

        <TextField
          label='Password'
          type='password'
          margin='normal'
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <TextField
          label='Confirm Password'
          type='password'
          margin='normal'
          fullWidth
          value={confirmPass}
          onChange={(e) => setConfirmPass(e.target.value)}
          required
        />

        <TextField
          select
          fullWidth
          margin='normal'
          value={agency || ''}
          onChange={(e) => setAgency(e.target.value)}
          label='Select Agency'
        >
          <MenuItem value='Hourglass Life Group'>Hourglass Life Group</MenuItem>
          <MenuItem value='ag_Hq92aLsK'>Fearless Shepherds Financial</MenuItem>
        </TextField>

        <TextField
            select
            fullWidth
            margin='normal'
            value={uplineEmail   || ''}
            onChange={(e) => setUplineEmail(e.target.value)}
            label='Select upline email'
        >
          <MenuItem value='user1@example.com'>user1@example.com</MenuItem>
          <MenuItem value='user3@example.com'>user1@example.com</MenuItem>
        </TextField>

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
