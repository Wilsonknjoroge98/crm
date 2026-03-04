import {
  Box,
  Typography,
  Stack,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Skeleton,
  IconButton,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import { stringToColor } from '../utils/helpers';
const TeamLeaderboard = ({ setSelectedAgent, setDrawerOpen }) => {
  const TEAM_DATA = [
    { name: 'Sarah J.', clients: 20, premium: 45000, policies: 12 },
    { name: 'Mike R.', clients: 18, premium: 38000, policies: 10 },
    { name: 'Alex T.', clients: 15, premium: 32000, policies: 8 },
    { name: 'Jordan K.', clients: 12, premium: 28000, policies: 7 },
    { name: 'Linda W.', clients: 8, premium: 15000, policies: 4 },
  ];

  const PERSONAL_DATA = {
    clients: 42,
    policies: 41,
    premium: 158000,
  };

  const isLoading = false; // Replace with actual loading state

  const handleRowClick = (agent) => {
    setSelectedAgent(agent);
    setDrawerOpen(true);
  };

  const fmtNum = (n) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(n || 0));
  const fmtMoney0 = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const fmtMoney = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  const downlineRows = TEAM_DATA.map((agent, idx) => ({
    agentId: idx + 1,
    ...agent,
    avgPremium: agent.premium / agent.policies,
  }));
  return (
    <>
      <Typography variant='h6' mb={2}>
        Team Leaderboard
      </Typography>

      {isLoading ? (
        <Stack gap={1}>
          <Skeleton variant='rounded' height={44} />
          <Skeleton variant='rounded' height={44} />
          <Skeleton variant='rounded' height={44} />
          <Skeleton variant='rounded' height={44} />
        </Stack>
      ) : (
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell sx>Agent</TableCell>
                <TableCell sx>Premium</TableCell>
                <TableCell sx>Clients</TableCell>
                <TableCell sx>Policies</TableCell>
                <TableCell sx>Avg Premium</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton height={40} />
                      </TableCell>
                    </TableRow>
                  ))
                : downlineRows.map((row) => (
                    <TableRow key={row.agentId}>
                      {' '}
                      <TableCell>
                        <Stack direction='row' alignItems='center' spacing={1.5}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.875rem',
                              fontWeight: 700,
                              bgcolor: stringToColor(row.name),
                            }}
                          >
                            {row.name[0]}
                          </Avatar>
                          <Box>
                            <Typography variant='body2'>{row.name}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{fmtMoney(row.premium)}</TableCell>
                      <TableCell>
                        <Stack direction='row' alignItems='center' spacing={1.5}>
                          <Box>
                            <Typography variant='body2'>{row.clients}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction='row' alignItems='center' spacing={0.5}>
                          <Typography> {fmtNum(row.policies)} </Typography>
                          <IconButton
                            size='small'
                            color='primary'
                            onClick={() => handleRowClick(row)}
                          >
                            <LaunchIcon fontSize='small' />
                          </IconButton>
                        </Stack>
                      </TableCell>
                      <TableCell color='text.secondary'>{fmtMoney(row.avgPremium)}</TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </>
  );
};

export default TeamLeaderboard;
