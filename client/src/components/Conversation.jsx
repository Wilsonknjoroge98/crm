import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getMessages, sendMessage } from '../utils/query';
import { toE164, stringToColor } from '../utils/helpers';
import { supabase } from '../utils/supabase';
import { INBOX_QUERY_KEY, useMarkThreadRead } from '../hooks/useInbox';

export const SERIF = '"Libre Baskerville", serif';
export const SANS = '"Inter", sans-serif';
export const MONO = '"JetBrains Mono", monospace';
export const INK = '#051118';
export const SLATE_NAVY = '#1E293B';
export const SLATE_BLUE = '#2F4E6F';
export const SLATE_FILL = '#F1F5F9';
export const RULE = '#E0E0E0';
export const BORDER = '#E2E8F0';

export const displayPhone = (phone) => {
  const e164 = toE164(phone);
  if (!e164) return phone || '';
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

export const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

export const eyebrowSx = {
  fontFamily: SANS,
  fontSize: '0.68rem',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: 'text.secondary',
};

// Neutral slate capsule for volume counts (unread, totals)
export const countPillSx = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: 22,
  height: 20,
  px: 0.75,
  borderRadius: '999px',
  bgcolor: SLATE_FILL,
  color: SLATE_NAVY,
  border: `1px solid ${BORDER}`,
  fontFamily: MONO,
  fontSize: '0.68rem',
  fontWeight: 600,
};

export const iconButtonSx = {
  color: 'text.secondary',
  border: `1px solid ${BORDER}`,
  borderRadius: '8px',
  p: 0.5,
  '&:hover': { bgcolor: SLATE_FILL },
};

const rowToMessage = (row) => ({
  id: row.message_handle,
  content: row.content ?? '',
  outbound: Boolean(row.is_outbound),
  status: row.status ?? null,
  sentAt: row.sent_at,
  error: row.error_message || null,
});

const upsertMessage = (list, message) =>
  list.some((m) => m.id === message.id)
    ? list.map((m) => (m.id === message.id ? message : m))
    : [...list, message];

const statusLabel = (message) => {
  if (!message.outbound) return null;
  if (message.status === 'DELIVERED') return 'Delivered';
  if (message.status === 'SENT') return 'Sent';
  if (message.status === 'ERROR' || message.status === 'DECLINED') {
    return message.error ? `Failed: ${message.error}` : 'Failed';
  }
  return 'Sending…';
};

const dayLabel = (value) => {
  const day = dayjs(value);
  if (day.isSame(dayjs(), 'day')) return 'Today';
  if (day.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return day.format('MMM D, YYYY');
};

const withDaySeparators = (messages) => {
  const items = [];
  let lastDay = null;
  for (const message of messages) {
    const day = message.sentAt
      ? dayjs(message.sentAt).format('YYYY-MM-DD')
      : null;
    if (day && day !== lastDay) {
      items.push({
        type: 'day',
        key: `day-${day}`,
        label: dayLabel(message.sentAt),
      });
      lastDay = day;
    }
    items.push({ type: 'message', key: message.id, message });
  }
  return items;
};

const Bubble = ({ message }) => {
  const outbound = message.outbound;
  const failed = message.status === 'ERROR' || message.status === 'DECLINED';
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: outbound ? 'flex-end' : 'flex-start',
        mb: 1,
      }}
    >
      <Box
        sx={{
          maxWidth: '82%',
          px: 1.75,
          py: 1,
          bgcolor: outbound ? SLATE_NAVY : '#FFFFFF',
          color: outbound ? '#FFFFFF' : 'text.primary',
          borderRadius: outbound ? '10px 10px 3px 10px' : '10px 10px 10px 3px',
          border: `1px solid ${outbound ? SLATE_NAVY : BORDER}`,
          opacity: message.optimistic ? 0.7 : 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: '0.875rem',
            lineHeight: 1.45,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </Typography>
      </Box>

      <Typography
        sx={{
          mt: 0.4,
          px: 0.25,
          fontFamily: MONO,
          fontSize: '0.65rem',
          color: failed ? 'error.main' : 'text.disabled',
        }}
      >
        {[
          statusLabel(message),
          message.sentAt ? dayjs(message.sentAt).format('h:mm A') : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Typography>
    </Box>
  );
};

const DayRule = ({ label }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, my: 2 }}>
    <Box sx={{ flex: 1, height: '1px', bgcolor: RULE }} />
    <Typography sx={{ ...eyebrowSx, fontSize: '0.65rem', color: 'text.disabled' }}>
      {label}
    </Typography>
    <Box sx={{ flex: 1, height: '1px', bgcolor: RULE }} />
  </Box>
);

const StatusChip = ({ isSale }) => (
  <Box
    component='span'
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 18,
      px: 0.875,
      borderRadius: '999px',
      bgcolor: isSale ? '#EAF4EE' : SLATE_FILL,
      color: isSale ? '#2E6B4F' : SLATE_NAVY,
      border: `1px solid ${isSale ? '#CFE3D7' : BORDER}`,
      fontFamily: SANS,
      fontSize: '0.6rem',
      fontWeight: 700,
      letterSpacing: '0.6px',
    }}
  >
    {isSale ? 'SALE' : 'LEAD'}
  </Box>
);

// One thread: header, message stream, composer. Used by MessagesDrawer
// (opened from a card) and InboxDrawer. Marks the thread read while open.
const Conversation = ({ open, person, onClose, onBack }) => {
  const phone = person?.phone;
  const name =
    [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
    'Unknown Lead';
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const queryKey = ['messages', phone];
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState(null);
  const { mutate: markRead } = useMarkThreadRead();

  useEffect(() => {
    setDraft('');
    setSendError(null);
  }, [phone]);

  const { mutate: send, isPending: isSending } = useMutation({
    mutationFn: sendMessage,
    onMutate: async ({ content }) => {
      await queryClient.cancelQueries({ queryKey });
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        content,
        outbound: true,
        status: 'SENDING',
        sentAt: new Date().toISOString(),
        optimistic: true,
      };
      queryClient.setQueryData(queryKey, (old = []) => [...old, optimistic]);
      setDraft('');
      setSendError(null);
      return { optimisticId: optimistic.id, content };
    },
    onSuccess: (created, variables, context) => {
      queryClient.setQueryData(queryKey, (old = []) =>
        upsertMessage(
          old.filter((m) => m.id !== context.optimisticId),
          created,
        ),
      );
      queryClient.invalidateQueries({ queryKey });
      // the server marks the thread read on send
      queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(queryKey, (old = []) =>
        old.filter((m) => m.id !== context?.optimisticId),
      );
      setDraft((current) => current || context?.content || '');
      setSendError(error?.response?.data?.error || "Couldn't send, try again");
    },
  });

  const handleSend = () => {
    const content = draft.trim();
    if (!content || isSending) return;
    send({ phone, content });
  };

  const {
    data: messages = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => getMessages({ phone }),
    enabled: open && Boolean(phone),
    refetchOnWindowFocus: !isSending,
  });

  useEffect(() => {
    const number = toE164(phone);
    if (!open || !number) return undefined;
    const channel = supabase
      .channel(`messages:${number}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `number=eq.${number}`,
        },
        (payload) => {
          if (!payload.new?.message_handle) return;
          queryClient.setQueryData(queryKey, (old = []) =>
            upsertMessage(old, rowToMessage(payload.new)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone]);

  // Read on open, and again whenever a new inbound message lands while open
  const latestInboundId = useMemo(
    () => messages.findLast((m) => !m.outbound)?.id ?? null,
    [messages],
  );
  useEffect(() => {
    if (!open || !phone || isLoading || isError) return;
    markRead({ phone: toE164(phone) || phone });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phone, latestInboundId, isLoading, isError]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, open]);

  const items = withDaySeparators(messages);

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#FBFBFA',
      }}
    >
      <Box
        sx={{
          height: 64,
          flexShrink: 0,
          px: 2.5,
          bgcolor: '#FFFFFF',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction='row' spacing={1.5} alignItems='center' minWidth={0}>
          {onBack && (
            <IconButton
              size='small'
              onClick={onBack}
              aria-label='Back to inbox'
              // the list sits beside the thread from md up
              sx={{ ...iconButtonSx, display: { md: 'none' } }}
            >
              <ArrowBackRoundedIcon fontSize='small' />
            </IconButton>
          )}
          <Avatar
            sx={{
              width: 36,
              height: 36,
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: SANS,
              bgcolor: stringToColor(name),
            }}
          >
            {getInitials(name)}
          </Avatar>
          <Box minWidth={0}>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Typography
                noWrap
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 700,
                  fontSize: '0.98rem',
                  color: 'text.primary',
                  lineHeight: 1.2,
                }}
              >
                {name}
              </Typography>
              <StatusChip isSale={person?.lifecycle_status === 'SALE'} />
            </Stack>
            <Typography
              sx={{
                mt: 0.25,
                fontFamily: MONO,
                fontSize: '0.72rem',
                color: 'text.secondary',
              }}
            >
              {displayPhone(phone)}
            </Typography>
          </Box>
        </Stack>

        {onClose && (
          <IconButton
            size='small'
            onClick={onClose}
            aria-label='Close messages'
            sx={iconButtonSx}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2.5, py: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={22} sx={{ color: 'text.secondary' }} />
          </Box>
        ) : isError ? (
          <Stack spacing={1.5} alignItems='center' sx={{ py: 6 }}>
            <Typography variant='body2' color='error'>
              {error?.response?.data?.error || "Couldn't load conversation"}
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
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ ...eyebrowSx, mb: 0.75 }}>
              No messages yet
            </Typography>
            <Typography variant='body2' sx={{ color: 'text.secondary' }}>
              Send a text to start the conversation.
            </Typography>
          </Box>
        ) : (
          <Box>
            {items.map((item) =>
              item.type === 'day' ? (
                <DayRule key={item.key} label={item.label} />
              ) : (
                <Bubble key={item.key} message={item.message} />
              ),
            )}
            <div ref={bottomRef} />
          </Box>
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          p: 2,
          bgcolor: '#FFFFFF',
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <TextField
          fullWidth
          size='small'
          multiline
          maxRows={4}
          placeholder='Type a message… (Enter to send)'
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#FFFFFF',
              borderRadius: '8px',
              pr: 0.75,
              fontFamily: SANS,
              fontSize: '0.875rem',
              '& fieldset': { borderColor: BORDER },
              '&:hover fieldset': { borderColor: '#CBD5E1' },
              '&.Mui-focused fieldset': { borderColor: INK, borderWidth: 1 },
            },
          }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position='end'>
                  <IconButton
                    size='small'
                    onClick={handleSend}
                    disabled={!draft.trim() || isSending}
                    aria-label='Send message'
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '8px',
                      bgcolor: draft.trim() ? INK : 'transparent',
                      color: draft.trim() ? '#FFFFFF' : 'text.disabled',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: draft.trim() ? SLATE_NAVY : 'transparent',
                      },
                      '&.Mui-disabled': {
                        color: 'text.disabled',
                      },
                    }}
                  >
                    <ArrowUpwardRoundedIcon fontSize='small' />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {sendError && (
          <Typography
            variant='caption'
            color='error'
            sx={{ display: 'block', mt: 0.75, ml: 0.5 }}
          >
            {sendError}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default Conversation;
