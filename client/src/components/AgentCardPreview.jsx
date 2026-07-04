import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

export default function AgentCardPreview({ onClose, open, slug }) {
  const previewUrl = slug
    ? `https://getseniorquotes.com/agents/${slug}`
    : '';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='lg'>
      <DialogTitle>Agent Card Preview</DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        {previewUrl ? (
          <Box
            component='iframe'
            src={previewUrl}
            title='Agent card preview'
            sx={{
              display: 'block',
              width: '100%',
              height: { xs: '72vh', md: '78vh' },
              border: 0,
            }}
          />
        ) : (
          <Typography color='text.secondary' sx={{ p: 3 }}>
            Preview unavailable.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
