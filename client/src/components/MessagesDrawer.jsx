import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getMessages, sendMessage } from '../utils/query';
import { toE164 } from '../utils/helpers';

const BORDER = '#E0E0E0';
const POLL_MS = 8000;

const displayPhone = (phone) => {
  const e164 = toE164(phone);
  if (!e164) return phone || '';
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const dayLabel = (value) => {
  const day = dayjs(value);
  if (day.isSame(dayjs(), 'day')) return 'Today';
  if (day.isSame(dayjs().subtract(1, 'day'), 'day')) return 'Yesterday';
  return day.format('MMM D, YYYY');
};

// messages come oldest first, drop a date label whenever the day changes
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
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: outbound ? 'flex-end' : 'flex-start',
      }}
    >
      <Box
        sx={{
          maxWidth: '80%',
          px: 1.5,
          py: 1,
          bgcolor: outbound ? 'primary.main' : '#FAFAFA',
          color: outbound ? 'primary.contrastText' : 'text.primary',
          border: outbound ? 'none' : `1px solid ${BORDER}`,
          borderRadius: outbound ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Inter", sans-serif',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: '0.675rem',
            textAlign: outbound ? 'right' : 'left',
            color: outbound ? 'rgba(255, 255, 255, 0.7)' : 'text.disabled',
          }}
        >
          {message.optimistic
            ? 'Sending…'
            : message.sentAt
              ? dayjs(message.sentAt).format('h:mm A')
              : ''}
        </Typography>
      </Box>
    </Box>
  );
};

const MessagesDrawer = ({ open, person, onClose }) => {
  const phone = person?.phone;
  const name =
    [person?.first_name, person?.last_name].filter(Boolean).join(' ') || '—';
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const queryKey = ['messages', phone];
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState(null);

  useEffect(() => {
    setDraft('');
    setSendError(null);
  }, [phone]);

  // optimistic bubble goes in right away, swapped for the real one on success, pulled and draft restored on failure
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
        old.map((m) => (m.id === context.optimisticId ? created : m)),
      );
      queryClient.invalidateQueries({ queryKey });
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

  // sendblue is the source of truth and theres no inbound webhook, so poll while open
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
    // pause polling mid send so a refetch cant wipe the optimistic bubble
    refetchInterval: open && !isSending ? POLL_MS : false,
    refetchOnWindowFocus: !isSending,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, open]);

  const items = withDaySeparators(messages);

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 420 },
            bgcolor: 'background.default',
            borderLeft: `1px solid ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box
        sx={{
          p: 2,
          bgcolor: '#FFFFFF',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant='h6' sx={{ color: 'primary.main' }}>
            {name}
          </Typography>
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            {displayPhone(phone)}
          </Typography>
        </Box>
        <IconButton size='small' onClick={onClose} aria-label='Close messages'>
          <CloseIcon fontSize='small' />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : isError ? (
          <Stack spacing={1} alignItems='center' sx={{ py: 4 }}>
            <Typography variant='body2' color='error'>
              {error?.response?.data?.error || "Couldn't load messages"}
            </Typography>
            <Button size='small' variant='outlined' onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : items.length === 0 ? (
          <Typography
            variant='body2'
            sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}
          >
            No messages yet
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {items.map((item) =>
              item.type === 'day' ? (
                <Typography
                  key={item.key}
                  variant='caption'
                  sx={{ color: 'text.disabled', textAlign: 'center' }}
                >
                  {item.label}
                </Typography>
              ) : (
                <Bubble key={item.key} message={item.message} />
              ),
            )}
            <div ref={bottomRef} />
          </Stack>
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          p: 1.5,
          bgcolor: '#FFFFFF',
          borderTop: `1px solid ${BORDER}`,
        }}
      >
        <TextField
          fullWidth
          size='small'
          multiline
          maxRows={4}
          placeholder='Type a message...'
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
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
                    sx={{ color: 'primary.main' }}
                  >
                    <SendIcon fontSize='small' />
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
            sx={{ display: 'block', mt: 0.5 }}
          >
            {sendError}
          </Typography>
        )}
      </Box>
    </Drawer>
  );
};

export default MessagesDrawer;
