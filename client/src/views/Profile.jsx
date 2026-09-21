import { useState } from 'react';
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
import AgentCardIntroDialog, {
  STORAGE_KEY as AGENT_CARD_INTRO_STORAGE_KEY,
} from '../components/AgentCardIntroDialog';
import { useAgent } from '../hooks/useAgent';
import { getAccount } from '../utils/query';

const PRODUCER_PAGE_TAB_INDEX = 3;

const Profile = () => {
  const { user, isAuthenticated } = useSelector((state) => state.user);
  const agent = useAgent();
  const displayName = agent?.name?.trim();
  const [introOpen, setIntroOpen] = useState(
    () => localStorage.getItem(AGENT_CARD_INTRO_STORAGE_KEY) !== 'true',
  );
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['account', user?.email, isAuthenticated],
    queryFn: () => getAccount({ email: user?.email }),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    enabled: !!user?.email && isAuthenticated,
  });

  return (
    <Container sx={{ mt: 4 }}>
      <AgentCardIntroDialog open={introOpen} setOpen={setIntroOpen} />
      <Stack spacing={0.25} mb={3}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          {displayName || user?.email || 'Agent Profile'}
        </Typography>
        {displayName && user?.email && (
          <Typography variant='body2' color='text.secondary'>
            {user.email}
          </Typography>
        )}
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
        <AccountDetails
          data={data}
          defaultTab={introOpen ? PRODUCER_PAGE_TAB_INDEX : undefined}
        />
      )}
    </Container>
  );
};

export default Profile;
