import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
  Divider,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const STORAGE_KEY = 'production_intro_seen';

const Section = ({ icon, title, description }) => (
  <Stack direction='row' spacing={2} alignItems='flex-start'>
    <Box
      sx={{
        mt: 0.25,
        p: 1,
        borderRadius: 2,
        bgcolor: 'action.hover',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Stack spacing={0.5}>
      <Typography variant='subtitle2' fontWeight={700}>
        {title}
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        {description}
      </Typography>
    </Stack>
  </Stack>
);

const ProductionIntroDialog = ({ open, setOpen }) => {
  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Welcome to Production</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 0.5 }}>
          <Typography variant='body1'>
            This page gives you a full picture of your agency's activity. Use
            the date range at the top to filter everything by a time period,
            then explore the three tabs below.
          </Typography>

          <Section
            icon={<GroupsIcon />}
            title='Team'
            description='See a summary of your agency and a leaderboard ranking every agent under you for the selected date range.'
          />

          <Section
            icon={<PersonIcon />}
            title='Personal'
            description="This tab shows only your individual production for the period you've selected."
          />

          <Section
            icon={<AccountTreeIcon />}
            title='Hierarchy'
            description='A visual map of how your agency is structured, making it easy to understand your downline at a glance.'
          />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant='contained' onClick={handleClose}>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { STORAGE_KEY };
export default ProductionIntroDialog;
