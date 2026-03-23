import { useQuery } from '@tanstack/react-query';
import { getTeamSummary } from '../utils/query';
import KPIItem from './KPIItem';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import MonetizationOnOutlinedIcon from '@mui/icons-material/MonetizationOnOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value ?? 0);

const TeamSummary = ({ startDate, endDate }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['teamSummary', startDate, endDate],
    queryFn: () => getTeamSummary({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  });

  if (isLoading) {
    return (
      <Stack direction='row' spacing={1} mb={2}>
        <Skeleton variant='rectangular' height={75} width={200} />
        <Skeleton variant='rectangular' height={75} width={200} />
        <Skeleton variant='rectangular' height={75} width={200} />
        <Skeleton variant='rectangular' height={75} width={200} />
      </Stack>
    );
  }

  return (
    <Stack direction='row' spacing={1} mb={2}>
      <KPIItem
        title='Clients'
        value={data.totalClients ? data.totalClients : '—'}
        icon={<PeopleAltOutlinedIcon />}
      />
      <KPIItem
        title='Policies'
        value={data.totalPolicies ? data.totalPolicies : '—'}
        icon={<ArticleOutlinedIcon />}
      />
      <KPIItem
        title='Total Premium'
        value={data?.totalPremium ? formatCurrency(data.totalPremium) : '—'}
        icon={<MonetizationOnOutlinedIcon />}
      />
      <KPIItem
        title='Avg Premium/Policy'
        value={data.avgPremium ? formatCurrency(data.avgPremium) : '—'}
        icon={<TrendingUpIcon />}
      />
    </Stack>
  );
};

export default TeamSummary;
