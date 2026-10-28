import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import InboxSplit from '../components/InboxSplit';
import { eyebrowSx } from '../components/Conversation';
import { useInboxContext } from '../hooks/useInbox';

const LIST_WIDTH = 380;
// NavBar sits in flow (64px), App pads the outlet another 64px on top and
// 48px below. The page fills what's left so only the thread list scrolls.
const APP_CHROME_HEIGHT = 64 + 64 + 48;

// Full-page inbox from the sidebar. The open thread lives in ?phone= so it
// survives a refresh and can be linked to.
const Inbox = () => {
  const inbox = useInboxContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPhone = searchParams.get('phone');

  const handleSelect = (phone) =>
    setSearchParams(phone ? { phone } : {}, { replace: true });

  return (
    // same shell as Business: xl container, h4 header, then the content
    <Container
      maxWidth='xl'
      sx={{
        py: 3,
        px: { xs: 2, md: 3 },
        height: `calc(100vh - ${APP_CHROME_HEIGHT}px)`,
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
    </Container>
  );
};

export default Inbox;
