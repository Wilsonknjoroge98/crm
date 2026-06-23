import {
  Alert,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import AccountDetails from '../components/AccountDetails';
import { getAccount } from '../utils/query';

const Profile = () => {
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['account', user?.email, isAuthenticated],
    queryFn: () => getAccount({ email: user?.email }),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    enabled: !!user?.email && isAuthenticated,
  });

  return (
    <Container sx={{ mt: 4 }}>
      <Stack spacing={0.5} mb={3}>
        <Typography variant='h4'>Agent Profile</Typography>
      </Stack>

      {isLoading && (
        <Stack alignItems='center' sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      )}
      {isError && error?.response?.status !== 404 && (
        <Alert severity='error'>
          Failed to load your account. Please refresh or try again later.
        </Alert>
      )}
      {!isLoading && (!isError || error?.response?.status === 404) && (
        <AccountDetails data={data} />
      )}
    </Container>
  );
};

export default Profile;
