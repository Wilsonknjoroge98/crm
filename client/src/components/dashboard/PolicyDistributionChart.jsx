import { PieChart } from '@mui/x-charts/PieChart';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { getPolicyStatuses } from '../../utils/query';
import { useAgent } from '../../hooks/useAgent';
import { useEffect, useMemo, useState } from 'react';
import { Typography } from '@mui/material';

const PolicyDistributionChart = () => {
  const agent = useAgent();
  const theme = useTheme();
  const { data, isLoading, error } = useQuery({
    queryKey: ['policyStatuses'],
    queryFn: () => getPolicyStatuses({ agency: agent?.org_id }),
  });

  console.log('Policy Statuses Query:', data, isLoading, error);

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (data) {
      const formattedData = data.map((obj, index) => ({
        id: index,
        label: obj.label,
        value: obj.value,
        color:
          obj.label === 'Active'
            ? theme.palette.success.main
            : obj.label === 'Lapsed'
            ? theme.palette.error.main
            : obj.label === 'Pending'
            ? theme.palette.warning.main
            : theme.palette.grey[500],
      }));
      setChartData(formattedData);
    }
  }, [data]);

  if (isLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography>Error loading policy statuses.</Typography>;
  }

  console.log('Formatted Chart Data:', chartData);

  return (
    <PieChart
      series={[
        {
          data: chartData,
          innerRadius: 60,
        },
      ]}
    />
  );
};
export default PolicyDistributionChart;
