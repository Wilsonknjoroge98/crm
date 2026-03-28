import PoliciesGrid from '../components/PoliciesGrid';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import { Drawer, Box, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getPolicies } from '../utils/query';

const PoliciesDrawer = ({ drawerOpen, setDrawerOpen, selectedAgent, startDate, endDate }) => {
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['policies', selectedAgent?.agentId, startDate, endDate],
    queryFn: () => getPolicies({ agentId: selectedAgent?.agentId, startDate, endDate }),
    enabled: drawerOpen && !!selectedAgent?.agentId,
  });

  return (
    <Drawer
      anchor='right'
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
    >
      <Box sx={{ p: 3, minWidth: 1200 }}>
        <Box
          display='flex'
          justifyContent='space-between'
          alignItems='center'
          mb={2}
        >
          <Typography variant='h6'>
            Policies for {selectedAgent?.name}
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>

        <PoliciesGrid
          agent={selectedAgent}
          policies={policies}
          policiesLoading={isLoading}
          handleUpdatePolicy={() => {}}
          setPolicy={() => {}}
          setDeletePolicyOpen={() => {}}
        />
      </Box>
    </Drawer>
  );
};

export default PoliciesDrawer;
