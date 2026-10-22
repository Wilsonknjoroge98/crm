import { Drawer, alpha } from '@mui/material';
import Conversation, { BORDER, INK } from './Conversation';

// One lead's thread, opened from the Text action on a BusinessCard
const MessagesDrawer = ({ open, person, onClose }) => (
  <Drawer
    anchor='right'
    open={open}
    onClose={onClose}
    slotProps={{
      backdrop: {
        sx: { bgcolor: alpha(INK, 0.25), backdropFilter: 'blur(2px)' },
      },
      paper: {
        sx: {
          width: { xs: '100%', sm: 440 },
          borderLeft: `1px solid ${BORDER}`,
          boxShadow: '-8px 0 24px rgba(0,0,0,0.06)',
        },
      },
    }}
  >
    <Conversation open={open} person={person} onClose={onClose} />
  </Drawer>
);

export default MessagesDrawer;
