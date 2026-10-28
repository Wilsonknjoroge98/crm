import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import dayjs from 'dayjs';
import Conversation, {
  BORDER,
  GOLD,
  INK,
  MONO,
  RULE,
  SANS,
  SERIF,
  SLATE_BLUE,
  SLATE_FILL,
  displayPhone,
  eyebrowSx,
  getInitials,
  formatUnread,
  iconButtonSx,
  unreadBadgeSx,
} from './Conversation';
import { stringToColor, toE164 } from '../utils/helpers';
import { useInboxContext, useInboxThreads } from '../hooks/useInbox';

const MUTED_SLATE = '#94A3B8';
const SEARCH_DEBOUNCE_MS = 300;
// right edge of the page's header band
const bandEndSx = { borderRight: `1px solid ${BORDER}` };

const threadFullName = (thread) =>
  [thread.firstName, thread.lastName].filter(Boolean).join(' ');

// Conversation takes the same person shape BusinessCard hands onText
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

// a sold lead is both, the client relationship wins
const ThreadStatusPill = ({ isClient }) => (
  <Box
    component='span'
    sx={{
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      height: 18,
      px: 0.875,
      borderRadius: '999px',
      bgcolor: isClient ? '#EAF4EE' : '#F1F5F9',
      color: isClient ? '#2E6B4F' : '#475569',
      fontFamily: SANS,
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.6px',
    }}
  >
    {isClient ? 'CLIENT' : 'LEAD'}
  </Box>
);

const OutboundMark = ({ status }) => {
  const sx = { fontSize: 14, mr: 0.5, verticalAlign: '-2px' };
  if (status === 'SENT' || status === 'DELIVERED') {
    return (
      <DoneAllRoundedIcon
        aria-label='Sent'
        sx={{ ...sx, color: MUTED_SLATE }}
      />
    );
  }
  if (status === 'ERROR' || status === 'DECLINED') {
    return (
      <WarningAmberRoundedIcon
        aria-label='Failed'
        sx={{ ...sx, color: 'error.main' }}
      />
    );
  }
  return (
    <ScheduleRoundedIcon
      aria-label='Sending'
      sx={{ ...sx, color: MUTED_SLATE }}
    />
  );
};

// Lead-in kept ahead of the hit, so a match deep in a long text still shows
const MATCH_LEAD_CHARS = 24;

// The matching message with the term marked, trimmed to start near the hit
const MatchSnippet = ({ content, term }) => {
  const at = content.toLowerCase().indexOf(term.toLowerCase());
  if (!term || at === -1) return content;
  const start = Math.max(0, at - MATCH_LEAD_CHARS);
  return (
    <>
      {start > 0 && '…'}
      {content.slice(start, at)}
      <Box
        component='mark'
        sx={{
          bgcolor: '#FFFBEB',
          color: INK,
          fontWeight: 700,
          borderRadius: '2px',
        }}
      >
        {content.slice(at, at + term.length)}
      </Box>
      {content.slice(at + term.length)}
    </>
  );
};

// compact rows, roughly a third more threads above the fold
const AVATAR_SIZE = 34;

const ThreadRow = ({ thread, search, selected, onSelect }) => {
  const fullName = threadFullName(thread);
  const phone = displayPhone(thread.phone);
  const unread = thread.unreadCount > 0;
  const { lastMessage, match } = thread;
  return (
    <ButtonBase
      onClick={() => onSelect(thread.phone)}
      sx={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.25,
        px: 1.5,
        py: 1,
        textAlign: 'left',
        borderBottom: `1px solid ${BORDER}`,
        // the open thread gets an ink edge, unread rows a slate-blue rule.
        // inset shadow, not a border, so the row content doesn't shift
        boxShadow: selected
          ? `inset 3px 0 0 ${INK}`
          : unread
            ? `inset 2px 0 0 ${SLATE_BLUE}`
            : 'none',
        bgcolor: selected ? SLATE_FILL : '#FFFFFF',
        transition: 'background-color 0.15s ease',
        '&:hover': { bgcolor: SLATE_FILL },
      }}
    >
      <Avatar
        sx={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          flexShrink: 0,
          fontSize: '0.75rem',
          fontWeight: 700,
          fontFamily: SANS,
          bgcolor: stringToColor(fullName || phone),
          boxShadow: unread ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${GOLD}` : 'none',
        }}
      >
        {getInitials(fullName) || '#'}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction='row' alignItems='center' spacing={1}>
          <Typography
            noWrap
            sx={{
              minWidth: 0,
              fontFamily: fullName ? SANS : MONO,
              fontSize: '0.8125rem',
              fontWeight: unread ? 800 : 600,
              color: 'text.primary',
            }}
          >
            {fullName || phone}
          </Typography>
          <ThreadStatusPill isClient={Boolean(thread.clientId)} />
          <Box sx={{ flex: 1 }} />
          <Typography
            sx={{
              flexShrink: 0,
              fontFamily: MONO,
              fontSize: '0.68rem',
              color: 'text.disabled',
            }}
          >
            {shortTime((match || lastMessage).sentAt)}
          </Typography>
        </Stack>
        {fullName && (
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: '0.75rem',
              color: 'text.secondary',
            }}
          >
            {phone}
          </Typography>
        )}
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
              fontSize: '0.75rem',
              color: unread ? 'text.primary' : 'text.secondary',
            }}
          >
            {match ? (
              <>
                {match.outbound && (
                  <Box component='span' sx={{ color: 'text.disabled' }}>
                    You:{' '}
                  </Box>
                )}
                <MatchSnippet content={match.content} term={search} />
              </>
            ) : (
              <>
                {lastMessage.outbound && (
                  <OutboundMark status={lastMessage.status} />
                )}
                {lastMessage.content || 'Attachment'}
              </>
            )}
          </Typography>
          {unread && (
            <Box
              component='span'
              aria-label={`${thread.unreadCount} unread`}
              sx={unreadBadgeSx}
            >
              {formatUnread(thread.unreadCount)}
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
      spacing={1.25}
      sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${BORDER}` }}
    >
      <Skeleton variant='circular' width={AVATAR_SIZE} height={AVATAR_SIZE} />
      <Box sx={{ flex: 1 }}>
        <Skeleton width='55%' />
        <Skeleton width='35%' />
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

// Pulls the next page (nextBefore cursor) once the end of the list scrolls
// within reach. Re-arms after each page, so a short page keeps loading.
const LoadMoreSentinel = ({ rootRef, fetchNextPage, isFetchingNextPage }) => {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || isFetchingNextPage) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) fetchNextPage();
      },
      { root: rootRef.current, rootMargin: '200px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [rootRef, fetchNextPage, isFetchingNextPage]);
  return (
    <Box
      ref={ref}
      sx={{ display: 'flex', justifyContent: 'center', py: 1.5, minHeight: 44 }}
    >
      {isFetchingNextPage && (
        <CircularProgress size={16} sx={{ color: 'text.secondary' }} />
      )}
    </Box>
  );
};

// Thread list beside the open conversation. The drawer and the /inbox page
// both render this; they own the selection. `fallbackPerson` covers opening
// a lead from its card before it has a thread. `onClose` is drawer-only.
// `framedList` (page) boxes the thread list, puts search + filters in one
// 64px header row level with the conversation header, and runs a top rule
// across both so the headers read as one band. It also turns on the
// conversation's link to the lead in Business. The band closes on a right
// edge, the conversation below it stays open to the page.
const InboxSplit = ({
  selectedPhone,
  onSelect,
  fallbackPerson,
  onClose,
  open = true,
  listWidth,
  framedList = false,
}) => {
  const listRef = useRef(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [unreadOnly, search]);

  // counts come off the provider's unfiltered list so they hold while filtering
  const { textEnabled, threadTotal, unreadThreads } = useInboxContext();
  const {
    threads,
    isLoading,
    isError,
    isPlaceholderData,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInboxThreads({ enabled: textEnabled, unreadOnly, search });

  const selected = threads.find((thread) => thread.phone === selectedPhone);
  // keep the open thread up even if a refetch or a filter drops it from the list
  const [pinned, setPinned] = useState(null);
  useEffect(() => {
    if (selected) setPinned(selected);
    if (!selectedPhone) setPinned(null);
  }, [selected, selectedPhone]);
  const activeThread =
    selected || (pinned?.phone === selectedPhone ? pinned : null);
  const activePerson = activeThread
    ? threadToPerson(activeThread)
    : selectedPhone && toE164(fallbackPerson?.phone) === selectedPhone
      ? fallbackPerson
      : null;

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 0, width: '100%' }}>
      {/* Thread list. On phones it gives way to the open conversation. */}
      <Box
        sx={{
          width: { xs: '100%', md: listWidth },
          flexShrink: 0,
          display: { xs: activePerson ? 'none' : 'flex', md: 'flex' },
          flexDirection: 'column',
          bgcolor: '#FFFFFF',
          ...(framedList
            ? {
                border: `1px solid ${BORDER}`,
                // top-right stays square where the band carries on
                borderRadius: '8px 0 0 8px',
                overflow: 'hidden',
              }
            : { borderRight: { md: `1px solid ${BORDER}` } }),
          minHeight: 0,
        }}
      >
        {/* Drawer only: the page has its own h4 title, and the Unread chip
            carries the count. Lines up with the conversation header beside it. */}
        {onClose && (
          <Box
            sx={{
              height: 64,
              flexShrink: 0,
              px: 2.5,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            <Typography
              sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: '1.15rem' }}
            >
              Inbox
            </Typography>
            <Box sx={{ flex: 1, height: '1px', bgcolor: RULE }} />
            <Typography
              sx={{
                fontFamily: MONO,
                fontSize: '0.68rem',
                color: 'text.secondary',
              }}
            >
              {unreadThreads} unread
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
        )}

        <Stack
          direction={framedList ? 'row' : 'column'}
          spacing={framedList ? 1 : 1.25}
          alignItems={framedList ? 'center' : 'stretch'}
          sx={{
            px: framedList ? 2 : 2.5,
            py: framedList ? 0 : 1.5,
            // same 64 as the conversation header, both sit under a 1px top rule
            height: framedList ? 64 : 'auto',
            flexShrink: 0,
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <TextField
            variant='outlined'
            size='small'
            fullWidth
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            // the one-row page header leaves no room for the long hint
            placeholder={
              framedList ? 'Search inbox' : 'Search names, numbers, or messages'
            }
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchOutlinedIcon fontSize='small' />
                  </InputAdornment>
                ),
              },
            }}
          />
          <ToggleButtonGroup
            sx={{ flexShrink: 0 }}
            value={unreadOnly ? 'unread' : 'all'}
            exclusive
            size='small'
            onChange={(event, value) => {
              if (!value) return;
              setUnreadOnly(value === 'unread');
            }}
          >
            <ToggleButton value='all'>All ({threadTotal})</ToggleButton>
            <ToggleButton value='unread'>Unread ({unreadThreads})</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Box
          ref={listRef}
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            // the last filter's list stays up, dimmed, until the new one lands
            opacity: isPlaceholderData ? 0.6 : 1,
            transition: 'opacity 0.15s ease',
          }}
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
            search ? (
              <EmptyPane
                title='No matches'
                body={`No contact, number, or message matches "${search}".`}
              />
            ) : unreadOnly ? (
              <EmptyPane
                title='All caught up'
                body='No threads are waiting on a reply.'
              />
            ) : (
              <EmptyPane
                title='No conversations yet'
                body='Texts with your leads and clients show up here as they come in.'
              />
            )
          ) : (
            <>
              {threads.map((thread) => (
                <ThreadRow
                  key={thread.phone}
                  thread={thread}
                  search={search}
                  selected={thread.phone === selectedPhone}
                  onSelect={onSelect}
                />
              ))}
              {hasNextPage && (
                <LoadMoreSentinel
                  rootRef={listRef}
                  fetchNextPage={fetchNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
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
          display: { xs: activePerson ? 'flex' : 'none', md: 'flex' },
          flexDirection: 'column',
          bgcolor: '#FBFBFA',
          // the band's top rule, carried on from the framed list
          ...(framedList && { borderTop: `1px solid ${BORDER}` }),
        }}
      >
        {activePerson ? (
          <Conversation
            open={open}
            person={activePerson}
            onClose={onClose}
            onBack={() => onSelect(null)}
            showLeadLink={framedList}
            headerSx={framedList ? bandEndSx : undefined}
          />
        ) : (
          <>
            {/* keeps the band whole on the page with nothing open */}
            {(onClose || framedList) && (
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
                  ...(framedList && bandEndSx),
                }}
              >
                {onClose && (
                  <IconButton
                    size='small'
                    onClick={onClose}
                    aria-label='Close inbox'
                    sx={iconButtonSx}
                  >
                    <CloseIcon fontSize='small' />
                  </IconButton>
                )}
              </Box>
            )}
            <EmptyPane
              title='Select a conversation'
              body='Pick a thread on the left to read and reply.'
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default InboxSplit;
