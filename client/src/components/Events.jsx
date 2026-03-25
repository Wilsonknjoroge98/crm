import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useQuery } from '@tanstack/react-query';
import { getEvents } from '../utils/query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const ACTION_LABEL = {
  sale: 'Policy Sold',
  effective: 'Policy Effective',
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const CompactActivityItem = ({ agentName, action, date, premium }) => (
  <Box
    sx={{
      py: 1,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      borderBottom: '1px solid',
      borderColor: 'divider',
      '&:last-child': { border: 0, pb: 0 },
      '&:first-of-type': { pt: 0 },
    }}
  >
    <Box sx={{ pr: 1 }}>
      <Typography variant='caption' sx={{ display: 'block', lineHeight: 1.2 }}>
        <Box component='span' sx={{ fontWeight: 700, color: 'text.primary' }}>
          {agentName}
        </Box>{' '}
        <Box component='span' sx={{ color: 'text.secondary' }}>
          {action}
        </Box>
      </Typography>
      <Typography
        variant='caption'
        sx={{ color: 'text.disabled', fontSize: '0.65rem' }}
      >
        {dayjs(date).fromNow()}
      </Typography>
    </Box>

    <Typography
      variant='caption'
      sx={{
        fontWeight: 800,
        color: 'success.main',
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {formatCurrency(premium)}
    </Typography>
  </Box>
);

const Events = ({ limit = 3 }) => {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events', limit],
    queryFn: () => getEvents({ limit }),
  });

  return (
    <>
      <Typography
        variant='caption'
        color='text.secondary'
        fontWeight='bold'
        sx={{ mb: 1, display: 'block' }}
      >
        LATEST UPDATES
      </Typography>

      {isLoading ? (
        <Stack spacing={1}>
          <Skeleton variant='rounded' height={44} />
          <Skeleton variant='rounded' height={44} />
          <Skeleton variant='rounded' height={44} />
        </Stack>
      ) : (
        <Box sx={{ overflowY: 'auto', height: '100%' }}>
          {events.map((event, i) => (
            <CompactActivityItem
              key={`${event.type}-${event.date}-${i}`}
              agentName={event.agent_name}
              action={ACTION_LABEL[event.type]}
              date={event.date}
              premium={event.premium}
            />
          ))}
          {events.length === 0 && (
            <Typography variant='caption' color='text.disabled'>
              No recent activity.
            </Typography>
          )}
        </Box>
      )}
    </>
  );
};

export default Events;
