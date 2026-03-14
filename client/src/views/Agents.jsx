import {
  Container,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Avatar,
  Switch,
  Select,
  MenuItem,
  Chip,
  Paper,
  TableContainer,
  Snackbar,
  Alert,
} from '@mui/material';
import { useState } from 'react';
import { stringToColor } from '../utils/helpers';
import StyledSnackBar from '../components/StyledSnackBar';

const LEVELS = Array.from({ length: 13 }, (_, i) => 80 + i * 5); // 80–140

const MOCK_AGENTS = [
  {
    id: 1,
    email: 'sarah.johnson@example.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    npn: '10234567',
    level: 120,
    upline_agent_id: null,
    active: true,
  },
  {
    id: 2,
    email: 'mike.torres@example.com',
    first_name: 'Mike',
    last_name: 'Torres',
    npn: '10345678',
    level: 105,
    upline_agent_id: 1,
    active: true,
  },
  {
    id: 3,
    email: 'linda.wu@example.com',
    first_name: 'Linda',
    last_name: 'Wu',
    npn: '10456789',
    level: 95,
    upline_agent_id: 2,
    active: true,
  },
  {
    id: 4,
    email: 'alex.thomas@example.com',
    first_name: 'Alex',
    last_name: 'Thomas',
    npn: '10567890',
    level: 90,
    upline_agent_id: 1,
    active: false,
  },
  {
    id: 5,
    email: 'carmen.reyes@example.com',
    first_name: 'Carmen',
    last_name: 'Reyes',
    npn: '10678901',
    level: 100,
    upline_agent_id: 2,
    active: true,
  },
];

const Agents = () => {
  const [agents, setAgents] = useState(MOCK_AGENTS);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const handleUpdate = (id, field, value) => {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
    setToast({ open: true, severity: 'success', message: 'Agent updated' });
  };

  const getAgentName = (uplineId) => {
    const match = agents.find((a) => a.id === uplineId);
    return match ? `${match.first_name} ${match.last_name}` : null;
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Stack direction='row' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>Agents</Typography>
        <Typography variant='body2' color='text.secondary'>
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      <TableContainer component={Paper} variant='outlined' sx={{ borderRadius: 2 }}>
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
            {agents.map((agent) => {
              const fullName = `${agent.first_name} ${agent.last_name}`;
              const avatarColor = stringToColor(fullName);
              const initials = `${agent.first_name[0]}${agent.last_name[0]}`;
              const uplineName = getAgentName(agent.upline_agent_id);

              return (
                <TableRow key={agent.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  {/* Agent */}
                  <TableCell>
                    <Stack direction='row' alignItems='center' spacing={1.5}>
                      <Avatar
                        sx={{ width: 34, height: 34, fontSize: '.8rem', bgcolor: avatarColor }}
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
                      onChange={(e) => handleUpdate(agent.id, 'level', e.target.value)}
                      sx={{ minWidth: 100 }}
                    >
                      {LEVELS.map((l) => (
                        <MenuItem key={l} value={l}>
                          {l}
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
                        handleUpdate(agent.id, 'upline_agent_id', e.target.value || null)
                      }
                      sx={{ minWidth: 160 }}
                      renderValue={(val) =>
                        val ? (
                          uplineName
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
                        .filter((a) => a.id !== agent.id)
                        .map((a) => (
                          <MenuItem key={a.id} value={a.id}>
                            {`${a.first_name} ${a.last_name}`}
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
                        onChange={(e) => handleUpdate(agent.id, 'active', e.target.checked)}
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
      </TableContainer>

      <StyledSnackBar
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ open: false, message: '', severity: 'success' })}
      />
    </Container>
  );
};

export default Agents;
