import {
  Box,
  Typography,
  Stack,
  Container,
  Avatar,
  Skeleton,
  Grid,
  Paper,
  Card,
  Chip,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { getPremiumLeaderboard } from '../utils/query';
import { useAgent } from '../hooks/useAgent';
import DateSelector from '../components/DateSelector';
import { stringToColor } from '../utils/helpers';
import dayjs from 'dayjs';
import { useState } from 'react';

const SERIF = '"Libre Baskerville", serif';
const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const WinnerCard = ({ label, chipSx, tint, watermark, champion, isLoading }) => (
  <Paper
    elevation={0}
    variant='outlined'
    sx={{
      p: 2.5,
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 3,
      bgcolor: tint,
    }}
  >
    <EmojiEventsIcon
      sx={{
        display: { xs: 'none', sm: 'block' },
        position: 'absolute',
        right: 32,
        top: '50%',
        transform: 'translateY(-50%)',
        fontSize: 110,
        color: watermark,
        opacity: 0.18,
      }}
    />
    <Chip
      label={label}
      size='small'
      sx={{ ...chipSx, fontWeight: 700, fontFamily: SANS }}
    />
    {isLoading ? (
      <Stack direction='row' spacing={2} alignItems='center' mt={2}>
        <Skeleton variant='circular' width={48} height={48} />
        <Skeleton variant='rounded' width={180} height={40} />
      </Stack>
    ) : champion ? (
      <Stack direction='row' spacing={2} alignItems='center' mt={2}>
        <Avatar
          sx={{
            width: 48,
            height: 48,
            fontWeight: 700,
            bgcolor: stringToColor(champion.name),
          }}
        >
          {getInitials(champion.name)}
        </Avatar>
        <Box>
          <Typography
            fontFamily={SERIF}
            fontWeight={700}
            fontSize='1.1rem'
            color='text.primary'
          >
            {champion.name}
          </Typography>
          <Typography
            fontFamily={MONO}
            fontWeight={700}
            variant='subtitle1'
            color='success.contrastText'
          >
            {currency.format(champion.premiumAmount)}
          </Typography>
          <Typography
            fontFamily={SANS}
            variant='caption'
            color='text.secondary'
          >
            {champion.count} {champion.count === 1 ? 'sale' : 'sales'}
          </Typography>
        </Box>
      </Stack>
    ) : (
      <Typography
        fontFamily={SANS}
        variant='body2'
        color='text.secondary'
        mt={2}
      >
        No sales recorded for this period.
      </Typography>
    )}
  </Paper>
);

const PODIUM_STYLES = {
  1: {
    borderColor: 'action.main',
    elevation: 4,
    avatarSx: { bgcolor: 'action.main', color: 'action.contrastText' },
    trophy: true,
  },
  2: {
    borderColor: 'grey.400',
    elevation: 1,
    avatarSx: { bgcolor: 'grey.300', color: 'text.primary' },
    trophy: false,
  },
  3: {
    borderColor: 'warning.main',
    elevation: 1,
    avatarSx: { bgcolor: 'warning.light', color: 'text.primary' },
    trophy: false,
  },
};

const PodiumCard = ({ row, rank }) => {
  const style = PODIUM_STYLES[rank];

  return (
    <Card
      elevation={style.elevation}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 3,
        borderTop: 4,
        borderColor: style.borderColor,
        boxShadow: (theme) =>
          `${
            rank === 1
              ? '0 5px 14px rgba(0, 0, 0, 0.06)'
              : '0 1px 4px rgba(0, 0, 0, 0.03)'
          }, 0 0 0 1px ${theme.palette.divider}`,
        p: 3,
        pt: rank === 1 ? 4.5 : 3,
        pb: rank === 1 ? 4 : 3,
        mt: rank === 1 ? 0 : { xs: 0, md: 3 },
        height: rank === 1 ? '100%' : 'auto',
        textAlign: 'center',
      }}
    >
      {style.trophy && (
        <EmojiEventsIcon
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: 'action.main',
          }}
        />
      )}
      <Stack spacing={1.5} alignItems='center'>
        <Avatar
          sx={{
            width: rank === 1 ? 68 : 56,
            height: rank === 1 ? 68 : 56,
            fontWeight: 700,
            fontSize: rank === 1 ? 28 : 24,
            fontFamily: MONO,
            boxShadow: 2,
            ...style.avatarSx,
          }}
        >
          {rank}
        </Avatar>
        <Typography variant='h6' fontFamily={SERIF} fontWeight={700}>
          {row.name}
        </Typography>
        <Typography
          variant='h5'
          fontFamily={MONO}
          fontWeight={700}
          color='success.main'
        >
          {currency.format(row.premiumAmount)}
        </Typography>
        <Chip
          label={`${row.count} ${row.count === 1 ? 'Sale' : 'Sales'}`}
          size='small'
          sx={{
            bgcolor: 'success.light',
            color: 'success.contrastText',
            fontFamily: SANS,
          }}
        />
      </Stack>
    </Card>
  );
};

const MentionRow = ({ row, rank }) => (
  <Paper
    elevation={0}
    variant='outlined'
    sx={{
      mb: 1.5,
      py: 1.5,
      px: 2,
      display: 'flex',
      alignItems: 'center',
      borderRadius: 2,
      '&:hover': {
        boxShadow: (theme) => theme.shadows[2],
        transform: 'translateY(-2px)',
        transition: 'all 0.2s ease-in-out',
      },
    }}
  >
    <Typography
      fontFamily={MONO}
      fontWeight={700}
      color='text.secondary'
      sx={{ width: 32 }}
    >
      {rank}
    </Typography>
    <Stack
      direction='row'
      alignItems='center'
      spacing={1.5}
      sx={{ flexGrow: 1 }}
    >
      <Avatar
        sx={{
          width: 34,
          height: 34,
          fontSize: '0.75rem',
          fontWeight: 700,
          bgcolor: stringToColor(row.name),
        }}
      >
        {getInitials(row.name)}
      </Avatar>
      <Box>
        <Typography fontFamily={SERIF} variant='subtitle2'>
          {row.name}
        </Typography>
        <Typography
          fontFamily={SANS}
          variant='caption'
          color='text.secondary'
        >
          {row.count} {row.count === 1 ? 'Sale' : 'Sales'}
        </Typography>
      </Box>
    </Stack>
    <Typography
      fontFamily={MONO}
      variant='subtitle1'
      fontWeight={700}
      color='text.primary'
      align='right'
    >
      {currency.format(row.premiumAmount)}
    </Typography>
  </Paper>
);

const Leaderboard = () => {
  const agent = useAgent();
  const [startDate, setStartDate] = useState(
    dayjs().add(-7, 'day').format('YYYY-MM-DD'),
  );
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));

  const {
    data: rows = [],
    isLoading,
    isPending,
    isSuccess,
    refetch,
  } = useQuery({
    queryKey: ['premiumLeaderboard', startDate, endDate, agent?.org_id],
    queryFn: () =>
      getPremiumLeaderboard({ agency: agent?.org_id, startDate, endDate }),
    enabled: !!agent?.org_id,
  });

  const lastMonthStart = dayjs()
    .subtract(1, 'month')
    .startOf('month')
    .format('YYYY-MM-DD');
  const lastMonthEnd = dayjs()
    .subtract(1, 'month')
    .endOf('month')
    .format('YYYY-MM-DD');
  const { data: lastMonthRows = [], isPending: lastMonthPending } = useQuery({
    queryKey: ['premiumLeaderboard', lastMonthStart, lastMonthEnd, agent?.org_id],
    queryFn: () =>
      getPremiumLeaderboard({
        agency: agent?.org_id,
        startDate: lastMonthStart,
        endDate: lastMonthEnd,
      }),
    enabled: !!agent?.org_id,
  });

  const lastWeekStart = dayjs()
    .subtract(1, 'week')
    .startOf('week')
    .format('YYYY-MM-DD');
  const lastWeekEnd = dayjs()
    .subtract(1, 'week')
    .endOf('week')
    .format('YYYY-MM-DD');
  const { data: lastWeekRows = [], isPending: lastWeekPending } = useQuery({
    queryKey: ['premiumLeaderboard', lastWeekStart, lastWeekEnd, agent?.org_id],
    queryFn: () =>
      getPremiumLeaderboard({
        agency: agent?.org_id,
        startDate: lastWeekStart,
        endDate: lastWeekEnd,
      }),
    enabled: !!agent?.org_id,
  });

  const handleStartChange = (val) =>
    setStartDate(val && dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : '');
  const handleEndChange = (val) =>
    setEndDate(val && dayjs(val).isValid() ? dayjs(val).format('YYYY-MM-DD') : '');

  const podium = [
    { row: rows[1], rank: 2 },
    { row: rows[0], rank: 1 },
    { row: rows[2], rank: 3 },
  ].filter(({ row }) => row);
  const mentions = rows.slice(3, 10);

  return (
    <Container sx={{ mt: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent='space-between'
        alignItems={{ sm: 'center' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography
            variant='h4'
            fontFamily={SERIF}
            sx={{ textTransform: 'none', letterSpacing: 0 }}
          >
            Leaderboard
          </Typography>
          <Typography
            fontFamily={SANS}
            variant='body2'
            color='text.secondary'
            mt={0.5}
          >
            Top performing agents, ranked by total premium
          </Typography>
        </Box>
        <DateSelector
          startDate={startDate}
          endDate={endDate}
          handleStartChange={handleStartChange}
          handleEndChange={handleEndChange}
          refetchFunction={refetch}
          isLoading={isLoading}
        />
      </Stack>

      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <WinnerCard
            label="LAST MONTH'S CHAMP"
            chipSx={{ bgcolor: 'primary.main', color: 'action.main' }}
            tint={(theme) => alpha(theme.palette.action.main, 0.08)}
            watermark='action.main'
            champion={lastMonthRows[0]}
            isLoading={lastMonthPending}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <WinnerCard
            label="LAST WEEK'S CHAMP"
            chipSx={{ bgcolor: 'info.alertBackground', color: 'secondary.main' }}
            tint={(theme) => alpha(theme.palette.info.alertIconColor, 0.06)}
            watermark='info.alertIconColor'
            champion={lastWeekRows[0]}
            isLoading={lastWeekPending}
          />
        </Grid>
      </Grid>

      {isPending && (
        <>
          <Grid container spacing={2} mb={4} alignItems='flex-start'>
            {[2, 1, 3].map((rank) => (
              <Grid key={rank} size={{ xs: 12, md: 4 }}>
                <Skeleton
                  variant='rounded'
                  height={rank === 1 ? 320 : 280}
                  sx={{
                    borderRadius: 3,
                    mt: rank === 1 ? 0 : { xs: 0, md: 3 },
                  }}
                />
              </Grid>
            ))}
          </Grid>
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {[...Array(5)].map((_, i) => (
              <Skeleton
                key={i}
                variant='rounded'
                height={64}
                sx={{ mb: 1.5, borderRadius: 2 }}
              />
            ))}
          </Box>
        </>
      )}

      {isSuccess && rows.length === 0 && (
        <Typography
          fontFamily={SANS}
          color='text.secondary'
          align='center'
          mt={6}
        >
          No sales in this period.
        </Typography>
      )}

      {isSuccess && podium.length > 0 && (
        <Grid container spacing={2} mb={4} alignItems='flex-start'>
          {podium.map(({ row, rank }) => (
            <Grid
              key={rank}
              size={{ xs: 12, md: 4 }}
              sx={{ order: { xs: rank, md: 0 } }}
            >
              <PodiumCard row={row} rank={rank} />
            </Grid>
          ))}
        </Grid>
      )}

      {isSuccess && mentions.length > 0 && (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          {mentions.map((row, index) => (
            <MentionRow key={row.name} row={row} rank={index + 4} />
          ))}
        </Box>
      )}
    </Container>
  );
};

export default Leaderboard;
