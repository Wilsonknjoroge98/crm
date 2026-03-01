import { Box, Typography, Divider } from '@mui/material';

const SectionHeader = ({ title }) => (
  <Box sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center' }}>
    <Typography
      variant='subtitle2'
      color='primary'
      sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}
    >
      {title}
    </Typography>
    <Divider sx={{ flexGrow: 1, ml: 2, bgcolor: 'primary.light', opacity: 0.2 }} />
  </Box>
);

export default SectionHeader;
