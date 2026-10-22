import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Drawer,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import dayjs from 'dayjs';
import Conversation, {
  BORDER,
  INK,
  MONO,
  RULE,
  SANS,
  SERIF,
  SLATE_BLUE,
  SLATE_FILL,
  countPillSx,
  displayPhone,
  eyebrowSx,
  getInitials,
  iconButtonSx,
} from './Conversation';
import { stringToColor } from '../utils/helpers';

const LIST_WIDTH = 340;

const threadName = (thread) =>
  [thread.firstName, thread.lastName].filter(Boolean).join(' ') ||
  displayPhone(thread.phone);

// Conversation takes the same person shape BusinessCard hands MessagesDrawer
const threadToPerson = (thread) => ({
  phone: thread.phone,
  first_name: thread.firstName,
  last_name: thread.lastName,
  lifecycle_status: thread.clientId ? 'SALE' : 'LEAD',
});

const shortTime = (value) => {
  if (!value) return '';
  const at = dayjs(value);
  if (at.isSame(dayjs(), 'day')) return at.format('h:mm A');
  if (at.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  if (at.isSame(dayjs(), 'year')) return at.format('MMM D');
  return at.format('M/D/YY');
};

const ThreadRow = ({ thread, selected, onSelect }) => {
  const name = threadName(thread);
  const unread = thread.unreadCount > 0;
  const { lastMessage } = thread;
  return (
    <ButtonBase
      onClick={() => onSelect(thread.phone)}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        px: 2.5,
        py: 1.5,
        textAlign: 'left',
        borderBottom: `1px solid ${BORDER}`,
        // unread rows carry a slate-blue rule on the scan line
        boxShadow: unread ? `inset 2px 0 0 ${SLATE_BLUE}` : 'none',
        bgcolor: selected ? SLATE_FILL : '#FFFFFF',
        transition: 'background-color 0.15s ease',
        '&:hover': { bgcolor: SLATE_FILL },
      }}
    >
      <Avatar
        sx={{
          width: 34,
          height: 34,
          mt: 0.25,
          fontSize: '0.75rem',
          fontWeight: 700,
          fontFamily: SANS,
          bgcolor: stringToColor(name),
        }}
      >
        {getInitials(name)}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction='row' alignItems='baseline' spacing={1}>
          <Typography
            noWrap
            sx={{
              flex: 1,
              fontFamily: SANS,
              fontSize: '0.875rem',
              fontWeight: unread ? 700 : 500,
              color: 'text.primary',
            }}
          >
            {name}
          </Typography>
          <Typography
            sx={{
              flexShrink: 0,
              fontFamily: MONO,
              fontSize: '0.68rem',
              color: unread ? SLATE_BLUE : 'text.disabled',
              fontWeight: unread ? 600 : 400,
            }}
          >
            {shortTime(lastMessage.sentAt)}
          </Typography>
        </Stack>
        <Stack
          direction='row'
          alignItems='center'
          spacing={1}
          sx={{ mt: 0.25 }}
        >
          <Typography
            noWrap
            sx={{
              flex: 1,
              fontFamily: SANS,
              fontSize: '0.8rem',
              color: unread ? 'text.primary' : 'text.secondary',
            }}
          >
            {lastMessage.outbound && (
              <Box component='span' sx={{ color: 'text.disabled' }}>
                You:{' '}
              </Box>
            )}
            {lastMessage.content || 'Attachment'}
          </Typography>
          {unread && (
            <Box
              component='span'
              aria-label={`${thread.unreadCount} unread`}
              sx={countPillSx}
            >
              {thread.unreadCount}
            </Box>
          )}
        </Stack>
      </Box>
    </ButtonBase>
  );
};

const ListSkeleton = () =>
  [0, 1, 2, 3, 4].map((index) => (
    <Stack
      key={index}
      direction='row'
      spacing={1.5}
      sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${BORDER}` }}
    >
      <Skeleton variant='circular' width={34} height={34} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width='55%' />
        <Skeleton width='85%' />
      </Box>
    </Stack>
  ));

const EmptyPane = ({ title, body }) => (
  <Box
    sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      px: 4,
      gap: 1,
    }}
  >
    <ChatBubbleOutlineRoundedIcon sx={{ color: '#CBD5E1', fontSize: 28 }} />
    <Typography sx={eyebrowSx}>{title}</Typography>
    <Typography variant='body2' sx={{ color: 'text.secondary', maxWidth: 260 }}>
      {body}
    </Typography>
  </Box>
);

// Every lead/client thread on the agent's line. `inbox` comes from
// useInbox in the parent, which also drives the header badge.
const InboxDrawer = ({ open, onClose, inbox }) => {
  const [selectedPhone, setSelectedPhone] = useState(null);
  const {
    threads,
    unreadTotal,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = inbox;

  useEffect(() => {
    if (!open) setSelectedPhone(null);
  }, [open]);

  const selected = threads.find((thread) => thread.phone === selectedPhone);
  // keep the open thread up even if a refetch drops it off the loaded pages
  const [pinned, setPinned] = useState(null);
  useEffect(() => {
    if (selected) setPinned(selected);
    if (!selectedPhone) setPinned(null);
  }, [selected, selectedPhone]);
  const activeThread = selected || pinned;

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        backdrop: {
          sx: { bgcolor: alpha(INK, 0.25), backdropFilter: 'blur(2px)' },
        },
        paper: {
          sx: {
            width: { xs: '100%', md: 900 },
            maxWidth: '100%',
            borderLeft: `1px solid ${BORDER}`,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.06)',
            flexDirection: 'row',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Thread list. On phones it gives way to the open conversation. */}
      <Box
        sx={{
          width: { xs: '100%', md: LIST_WIDTH },
          flexShrink: 0,
          display: { xs: activeThread ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          borderRight: { md: `1px solid ${BORDER}` },
          bgcolor: '#FFFFFF',
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            height: 64,
            flexShrink: 0,
            px: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <Typography
            sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.15rem' }}
          >
            Inbox
          </Typography>
          <IconButton
            size='small'
            onClick={onClose}
            aria-label='Close inbox'
            sx={{ ...iconButtonSx, display: { md: 'none' } }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          <Typography sx={eyebrowSx}>Conversations</Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: RULE }} />
          <Typography
            sx={{ fontFamily: MONO, fontSize: '0.68rem', color: 'text.secondary' }}
          >
            {unreadTotal} unread
          </Typography>
        </Box>

        <Box
          sx={{ flex: 1, minHeight: 0, overflowY: 'auto', borderTop: `1px solid ${BORDER}` }}
        >
          {isLoading ? (
            <ListSkeleton />
          ) : isError ? (
            <Stack spacing={1.5} alignItems='center' sx={{ py: 6 }}>
              <Typography variant='body2' color='error'>
                Couldn&apos;t load your inbox
              </Typography>
              <Button
                size='small'
                variant='outlined'
                onClick={() => refetch()}
                sx={{ borderColor: INK, color: INK, borderRadius: '8px' }}
              >
                Retry
              </Button>
            </Stack>
          ) : threads.length === 0 ? (
            <EmptyPane
              title='No conversations yet'
              body='Texts with your leads and clients show up here as they come in.'
            />
          ) : (
            <>
              {threads.map((thread) => (
                <ThreadRow
                  key={thread.phone}
                  thread={thread}
                  selected={thread.phone === activeThread?.phone}
                  onSelect={setSelectedPhone}
                />
              ))}
              {hasNextPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                  <Button
                    size='small'
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    sx={{
                      color: INK,
                      textTransform: 'none',
                      fontFamily: SANS,
                      fontWeight: 600,
                      borderRadius: '8px',
                    }}
                  >
                    {isFetchingNextPage ? (
                      <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
                    ) : (
                      'Load older conversations'
                    )}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Box>

      {/* Open conversation */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: { xs: activeThread ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: '#FBFBFA',
        }}
      >
        {activeThread ? (
          <Conversation
            open={open}
            person={threadToPerson(activeThread)}
            onClose={onClose}
            onBack={() => setSelectedPhone(null)}
          />
        ) : (
          <>
            <Box
              sx={{
                height: 64,
                flexShrink: 0,
                px: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                bgcolor: '#FFFFFF',
                borderBottom: `1px solid ${BORDER}`,
              }}
            >
              <IconButton
                size='small'
                onClick={onClose}
                aria-label='Close inbox'
                sx={iconButtonSx}
              >
                <CloseIcon fontSize='small' />
              </IconButton>
            </Box>
            <EmptyPane
              title='Select a conversation'
              body='Pick a thread on the left to read and reply.'
            />
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default InboxDrawer;
