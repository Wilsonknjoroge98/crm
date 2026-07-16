import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CallOutlinedIcon from '@mui/icons-material/CallOutlined';

const STORAGE_KEY = 'producer_page_intro_seen';

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

const AgentCardIntroDialog = ({ open, setOpen }) => {
  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth>
      <DialogTitle>Meet Your Producer Page</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 0.5 }}>
          <Section
            icon={<PersonOutlineIcon />}
            title="You're the face of the quote"
            description="Right after a lead picks a quote and verifies their phone number, they'll see your photo, name, and bio as a personal introduction."
          />

          <Section
            icon={<CallOutlinedIcon />}
            title='One tap to reach you'
            description='A prominent "Call Now" button sits right alongside your photo, so a warmed-up lead can call you instantly, no digging for a phone number.'
          />

          <Section
            icon={<PushPinOutlinedIcon />}
            title='You stay with them'
            description="If that same lead comes back to look at more quotes, your photo is pinned to the top of the page so they immediately recognize who's helping them."
          />

          <Typography variant='body2' color='text.secondary'>
            Upload a clear photo and a short bio below so your Producer Page is
            ready to greet your next lead.
          </Typography>
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
export default AgentCardIntroDialog;
