import { LineChart } from '@mui/x-charts/LineChart';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { getMonthlyPremiums } from '../../utils/query';
import useAuth from '../../hooks/useAuth';
import dayjs from 'dayjs';
import { Typography } from '@mui/material';

const PremiumGrowthChart = () => {
  // const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  // const monthlyPremiums = [
  //   12000, 15000, 14000, 17000, 16000, 18000, 20000, 22000, 21000, 23000, 25000, 24000,
  // ];
  const theme = useTheme();
  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  const formatMonth = (value) => {
    const dateStr = value.toString();
    const date = dayjs(dateStr, 'YYYYMM');
    return date.format('MMM');
  };

  const { userToken, agent } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['monthlyPremiums'],
    queryFn: () => getMonthlyPremiums({ token: userToken, agency: agent?.agency }),
  });

  console.log('Monthly Premiums Data:', data, isLoading, error);

  const months = data ? data.map((item) => item.month) : [];
  const premiums = data ? data.map((item) => item.premium) : [];

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography>Error loading monthly premiums.</Typography>;
  }

  return (
    <LineChart
      xAxis={[
        {
          data: months,
          scaleType: 'band',
          // label: 'Month',
          valueFormatter: formatMonth,
          tickLabelStyle: {
            fill: theme.palette.text.secondary,
            fontSize: 12,
          },
        },
      ]}
      series={[
        {
          data: premiums,
          label: 'Premium',
          color: theme.palette.action.main,
          curve: 'linear',
        },
      ]}
      yAxis={[
        {
          valueFormatter: formatCurrency,
          width: 80,
        },
      ]}
      height={300}
      sx={{
        borderRadius: 2,
        // border: '1px solid #E0E0E0',
        p: 1,
      }}
    />
  );
};

export default PremiumGrowthChart;
