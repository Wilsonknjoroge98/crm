import { Box, Grid, Card, Typography, Stack, Avatar } from '@mui/material';

const KPIItem = ({ title, value, icon }) => (
  <Grid>
    <Card
      variant='outlined'
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'background.default',
        boxShadow: 0,
      }}
    >
      <Stack direction='row' spacing={2} alignItems='center'>
        <Avatar sx={{ bgcolor: 'primary.light', borderRadius: 2 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ fontWeight: 600, textTransform: 'uppercase' }}
          >
            {title}
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
      </Stack>
    </Card>
  </Grid>
);

export default KPIItem;
