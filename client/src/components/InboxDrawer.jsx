import { useEffect, useState } from 'react';
import { Drawer, alpha } from '@mui/material';
import { BORDER, INK } from './Conversation';
import InboxSplit from './InboxSplit';
import { toE164 } from '../utils/helpers';

const LIST_WIDTH = 360;
const THREAD_WIDTH = 500;

// Every lead/client thread on the agent's line. Opened from the Business
// header (no selection) or a card's Text action (`initialPerson` selected).
const InboxDrawer = ({ open, onClose, initialPerson }) => {
  const [selectedPhone, setSelectedPhone] = useState(null);

  useEffect(() => {
    setSelectedPhone(open ? toE164(initialPerson?.phone) : null);
  }, [open, initialPerson]);

  return (
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
            width: { xs: '100%', md: LIST_WIDTH + THREAD_WIDTH },
            maxWidth: '100%',
            borderLeft: `1px solid ${BORDER}`,
            boxShadow: '-8px 0 24px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <InboxSplit
        open={open}
        selectedPhone={selectedPhone}
        onSelect={setSelectedPhone}
        fallbackPerson={initialPerson}
        onClose={onClose}
        listWidth={LIST_WIDTH}
      />
    </Drawer>
  );
};

export default InboxDrawer;
