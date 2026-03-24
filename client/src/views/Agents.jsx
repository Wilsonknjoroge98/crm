import {
  Container,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Switch,
  Select,
  MenuItem,
  Chip,
  Paper,
  TableContainer,
  CircularProgress,
  Alert,
} from '@mui/material';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgents, patchAgent } from '../utils/query';
import { stringToColor } from '../utils/helpers';
import { enqueueSnackbar } from 'notistack';
import {
  SNACKBAR_ERROR_OPTIONS,
  SNACKBAR_SUCCESS_OPTIONS,
} from '../utils/constants';

const LEVELS = Array.from({ length: 13 }, (_, i) => 80 + i * 5); // 80–140

const Agents = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const queryClient = useQueryClient();

  const {
    data: agents = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['agents'],
    queryFn: getAgents,
  });

  const { mutate: updateAgent } = useMutation({
    mutationFn: patchAgent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      enqueueSnackbar('Agent updated', SNACKBAR_SUCCESS_OPTIONS);
    },
    onError: (err) => {
      const message = err?.response?.data?.error || 'Failed to update agent';
      enqueueSnackbar(message, SNACKBAR_ERROR_OPTIONS);
    },
  });

  const handleUpdate = (agentId, field, value) => {
    updateAgent({ agentId, agent: { [field]: value } });
  };

  const getAgentName = (uplineId) => {
    const match = agents.find((a) => a.id === uplineId);
    return match ? `${match.first_name} ${match.last_name}` : null;
  };

  if (isLoading) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (isError) {
    return (
      <Stack alignItems='center' justifyContent='center' sx={{ py: 4 }}>
        <Alert severity='error'>
          Failed to load agents. Please refresh or try again later.
        </Alert>
      </Stack>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4'>Agents</Typography>
        <Typography variant='body2' color='text.secondary'>
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      <TableContainer
        component={Paper}
        variant='outlined'
        sx={{ boxShadow: 0, border: 'none', backgroundColor: 'transparent' }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {['AGENT', 'NPN', 'LEVEL', 'UPLINE', 'STATUS'].map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontWeight: 600,
                    color: 'text.secondary',
                    fontSize: '.75rem',
                    letterSpacing: 1,
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {agents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((agent) => {
              const fullName = `${agent.first_name} ${agent.last_name}`;
              const avatarColor = stringToColor(fullName);
              const initials = `${agent.first_name[0]}${agent.last_name[0]}`;
              const uplineName = getAgentName(agent.upline_agent_id);

              return (
                <TableRow
                  key={agent.id}
                  hover
                  sx={{ '&:last-child td': { border: 0 } }}
                >
                  {/* Agent */}
                  <TableCell>
                    <Stack direction='row' alignItems='center' spacing={1.5}>
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: '.8rem',
                          bgcolor: avatarColor,
                        }}
                      >
                        {initials}
                      </Avatar>
                      <Stack>
                        <Typography variant='body2' fontWeight={600}>
                          {fullName}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {agent.email}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>

                  {/* NPN */}
                  <TableCell>
                    <Typography variant='body2' color='text.secondary'>
                      {agent.npn}
                    </Typography>
                  </TableCell>

                  {/* Level */}
                  <TableCell>
                    <Select
                      size='small'
                      value={agent.level}
                      onChange={(e) =>
                        handleUpdate(agent.id, 'level', e.target.value)
                      }
                      sx={{ minWidth: 100 }}
                    >
                      {LEVELS.map((l) => (
                        <MenuItem key={l} value={l}>
                          <Typography variant='caption'>{l}</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>

                  {/* Upline */}
                  <TableCell>
                    <Select
                      size='small'
                      value={agent.upline_agent_id ?? ''}
                      displayEmpty
                      onChange={(e) =>
                        handleUpdate(
                          agent.id,
                          'upline_agent_id',
                          e.target.value || null,
                        )
                      }
                      sx={{ minWidth: 160 }}
                      renderValue={(val) =>
                        val ? (
                          <Typography variant='caption'>
                            {uplineName}
                          </Typography>
                        ) : (
                          <Typography variant='caption' color='text.disabled'>
                            No upline
                          </Typography>
                        )
                      }
                    >
                      <MenuItem value=''>
                        <Typography variant='caption' color='text.secondary'>
                          No upline
                        </Typography>
                      </MenuItem>
                      {agents
                        .filter(
                          (a) =>
                            a.id !== agent.id &&
                            a.active &&
                            a?.level > agent.level,
                        )
                        .map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              {`${a.first_name} ${a.last_name}`}
                            </Typography>
                          </MenuItem>
                        ))}
                    </Select>
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <Stack direction='row' alignItems='center' spacing={1}>
                      <Switch
                        size='small'
                        checked={agent.active}
                        onChange={(e) =>
                          handleUpdate(agent.id, 'active', e.target.checked)
                        }
                        color='success'
                      />
                      <Chip
                        label={agent.active ? 'Active' : 'Inactive'}
                        size='small'
                        color={agent.active ? 'success' : 'default'}
                        variant='outlined'
                        sx={{ fontSize: '.7rem' }}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <TablePagination
          component='div'
          count={agents.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </TableContainer>
    </Container>
  );
};

export default Agents;
