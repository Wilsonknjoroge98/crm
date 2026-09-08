// Pill.jsx
// Standard clickable pill shape (icon + label) used for quiet, secondary
// actions — e.g. the Navbar's Offers/Invite Agent actions and a client's
// policy reference on BusinessCard. Shape (radius/padding/colors) is
// shared; typography of the label is left to the caller since content
// varies (UI copy vs. a monospaced policy number).
import { ButtonBase, Stack } from '@mui/material';

export const pillSx = {
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 1.5,
  px: 1,
  py: 0.5,
  bgcolor: 'grey.100',
  color: 'text.secondary',
  border: '1px solid',
  borderColor: 'divider',
  transition: 'all 0.15s ease',
  '&:hover': {
    bgcolor: 'grey.200',
    color: 'text.primary',
  },
};

export default function Pill({ icon, children, onClick, sx, ...props }) {
  return (
    <ButtonBase onClick={onClick} sx={{ ...pillSx, ...sx }} {...props}>
      <Stack direction='row' spacing={0.75} alignItems='center'>
        {icon}
        {children}
      </Stack>
    </ButtonBase>
  );
}
