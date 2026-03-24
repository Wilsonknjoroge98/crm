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
  TablePagination,
  Skeleton,
  IconButton,
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTeamLeaderboard } from '../utils/query';
import { stringToColor } from '../utils/helpers';

const TeamLeaderboard = ({
  startDate,
  endDate,
  setSelectedAgent,
  setDrawerOpen,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['teamLeaderboard', startDate, endDate],
    queryFn: () => getTeamLeaderboard({ startDate, endDate }),
    enabled: !!startDate && !!endDate,
  });

  const handleRowClick = (agent) => {
    setSelectedAgent(agent);
    setDrawerOpen(true);
  };

  const fmtNum = (n) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(
      Number(n || 0),
    );

  const fmtMoney = (n) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(n || 0));

  return (
    <>
      {/* <Typography variant='h6' mb={2}>
        Team
      </Typography> */}

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
                <TableCell>Agent</TableCell>
                <TableCell>Premium</TableCell>
                <TableCell>Clients</TableCell>
                <TableCell>Policies</TableCell>
                <TableCell>Avg Premium</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                <TableRow key={row.agentId}>
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
                      <Typography variant='body2'>{row.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {row.premium > 0 ? fmtMoney(row.premium) : '—'}
                  </TableCell>
                  <TableCell>
                    {row.clients > 0 ? fmtNum(row.clients) : '—'}
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' alignItems='center' spacing={0.5}>
                      <Typography>
                        {row.policies > 0 ? fmtNum(row.policies) : '—'}
                      </Typography>
                      {row.policies > 0 && (
                        <IconButton
                          size='small'
                          color='primary'
                          onClick={() => handleRowClick(row)}
                        >
                          <LaunchIcon fontSize='small' />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {row.avgPremium > 0 ? fmtMoney(row.avgPremium) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component='div'
            count={rows.length}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          />
        </Box>
      )}
    </>
  );
};

export default TeamLeaderboard;
