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
  Avatar,
  Chip,
  Divider,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { getMessages, sendMessage } from '../utils/query';
import { toE164, stringToColor } from '../utils/helpers';

const SERIF = '"Libre Baskerville", serif';
const SANS = '"Inter", sans-serif';
const BORDER = '#E5E7EB';
const POLL_MS = 8000;

const displayPhone = (phone) => {
  const e164 = toE164(phone);
  if (!e164) return phone || '';
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};

const getInitials = (name) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          px: 2,
          py: 1.25,
          bgcolor: outbound ? '#007AFF' : '#FFFFFF', // Iconic Sendblue iMessage Blue
          color: outbound ? '#FFFFFF' : '#1C1A17',
          borderRadius: outbound ? '16px 16px 3px 16px' : '16px 16px 16px 3px',
          border: outbound ? 'none' : `1px solid ${BORDER}`,
          boxShadow: outbound
            ? '0 2px 6px rgba(0, 122, 255, 0.25)' // Soft blue glow
            : '0 1px 3px rgba(0,0,0,0.03)',
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
          mt: 0.3,
          px: 0.5,
          fontSize: '0.675rem',
          fontFamily: SANS,
          color: 'text.disabled',
          letterSpacing: '0.02em',
        }}
      >
        {message.optimistic
          ? 'Delivering…'
          : message.sentAt
            ? dayjs(message.sentAt).format('h:mm A')
            : ''}
      </Typography>
    </Box>
  );
};
const MessagesDrawer = ({ open, person, onClose }) => {
  const phone = person?.phone;
  const name =
    [person?.first_name, person?.last_name].filter(Boolean).join(' ') ||
    'Unknown Lead';
  const bottomRef = useRef(null);
  const queryClient = useQueryClient();
  const queryKey = ['messages', phone];
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState(null);

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
        backdrop: {
          sx: { bgcolor: alpha('#051118', 0.25), backdropFilter: 'blur(2px)' },
        },
        paper: {
          sx: {
            width: { xs: '100%', sm: 440 },
            bgcolor: '#FBFBFA', // Editorial paper canvas
            borderLeft: `1px solid ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.06)',
          },
        },
      }}
    >
      {/* Editorial Header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          bgcolor: '#FFFFFF',
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction='row' spacing={1.75} alignItems='center'>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: '0.85rem',
              fontWeight: 700,
              fontFamily: SANS,
              bgcolor: stringToColor(name),
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          >
            {getInitials(name)}
          </Avatar>
          <Box>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Typography
                variant='subtitle1'
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.2,
                }}
              >
                {name}
              </Typography>
              <Chip
                label={person?.lifecycle_status || 'LEAD'}
                size='small'
                sx={{
                  height: 18,
                  bgcolor:
                    person?.lifecycle_status === 'SALE' ? '#E6F1EC' : '#F0F4F8',
                  color:
                    person?.lifecycle_status === 'SALE'
                      ? 'success.main'
                      : 'secondary.main',
                  border: '1px solid',
                  borderColor: 'divider',
                  fontWeight: 700,
                  fontSize: '0.625rem',
                }}
              />
            </Stack>
            <Typography
              variant='caption'
              sx={{
                color: 'text.secondary',
                fontFamily: SANS,
                mt: 0.25,
                display: 'block',
              }}
            >
              {displayPhone(phone)}
            </Typography>
          </Box>
        </Stack>

        <IconButton
          size='small'
          onClick={onClose}
          aria-label='Close drawer'
          sx={{
            color: 'text.secondary',
            border: `1px solid ${BORDER}`,
            borderRadius: 1.5,
            p: 0.5,
            '&:hover': { bgcolor: '#F3F4F6' },
          }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </Box>

      {/* Message Stream */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={24} sx={{ color: 'text.secondary' }} />
          </Box>
        ) : isError ? (
          <Stack spacing={1.5} alignItems='center' sx={{ py: 6 }}>
            <Typography variant='body2' color='error'>
              {error?.response?.data?.error || "Couldn't load conversation"}
            </Typography>
            <Button size='small' variant='outlined' onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography
              variant='body2'
              sx={{ color: 'text.disabled', mb: 0.5 }}
            >
              No messages exchanged yet.
            </Typography>
            <Typography variant='caption' sx={{ color: 'text.secondary' }}>
              Send an introductory SMS to initiate routing.
            </Typography>
          </Box>
        ) : (
          <Stack spacing={0.5}>
            {items.map((item) =>
              item.type === 'day' ? (
                <Box
                  key={item.key}
                  sx={{ display: 'flex', alignItems: 'center', my: 2 }}
                >
                  <Divider sx={{ flex: 1, borderColor: '#EAEAEA' }} />
                  <Typography
                    sx={{
                      px: 1.25,
                      py: 0.25,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'text.disabled',
                      bgcolor: '#EFEFEA',
                      borderRadius: 10,
                    }}
                  >
                    {item.label}
                  </Typography>
                  <Divider sx={{ flex: 1, borderColor: '#EAEAEA' }} />
                </Box>
              ) : (
                <Bubble key={item.key} message={item.message} />
              ),
            )}
            <div ref={bottomRef} />
          </Stack>
        )}
      </Box>

      {/* Modern Floating Action Input */}
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
              bgcolor: '#F9FAFB',
              borderRadius: 3,
              pr: 0.75,
              '& fieldset': { borderColor: BORDER },
              '&:hover fieldset': { borderColor: '#D1D5DB' },
              '&.Mui-focused fieldset': { borderColor: '#051118' },
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
                      bgcolor: draft.trim() ? 'action.main' : 'transparent',
                      color: draft.trim() ? '#000000' : 'text.disabled',
                      transition: 'all 0.15s ease-in-out',
                      width: 28,
                      height: 28,
                      '&:hover': {
                        bgcolor: draft.trim() ? '#C49F2B' : 'transparent',
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
    </Drawer>
  );
};

export default MessagesDrawer;
