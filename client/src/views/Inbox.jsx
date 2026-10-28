import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import InboxSplit from '../components/InboxSplit';
import PageContainer, { PAGE_FILL_HEIGHT } from '../components/PageContainer';
import { eyebrowSx } from '../components/Conversation';
import { useInboxContext } from '../hooks/useInbox';

const LIST_WIDTH = 380;

// Full-page inbox from the sidebar. The open thread lives in ?phone= so it
// survives a refresh and can be linked to.
const Inbox = () => {
  const inbox = useInboxContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPhone = searchParams.get('phone');

  const handleSelect = (phone) =>
    setSearchParams(phone ? { phone } : {}, { replace: true });

  return (
    // fills the page exactly so only the thread list scrolls
    <PageContainer
      width='xl'
      sx={{
        height: PAGE_FILL_HEIGHT,
        minHeight: 480,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack spacing={2.5} sx={{ flex: 1, minHeight: 0 }}>
        <Typography variant='h4'>Inbox</Typography>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
          }}
        >
          {inbox.textEnabled ? (
            <InboxSplit
              selectedPhone={selectedPhone}
              onSelect={handleSelect}
              listWidth={LIST_WIDTH}
              framedList
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                textAlign: 'center',
                px: 4,
              }}
            >
              {inbox.accountLoaded ? (
                <>
                  <Typography sx={eyebrowSx}>
                    Texting isn&apos;t set up
                  </Typography>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    Your inbox appears once a Sendblue number is connected to
                    your account.
                  </Typography>
                </>
              ) : (
                <CircularProgress size={22} sx={{ color: 'text.secondary' }} />
              )}
            </Box>
          )}
        </Box>
      </Stack>
    </PageContainer>
  );
};

export default Inbox;
