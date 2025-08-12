import ConstructionIcon from '@mui/icons-material/Construction';
import Stack from '@mui/material/Stack';

const Maintenance = () => {
  return (
    <Stack
      sx={{
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <h1>The System is Currently Down For Maintenance</h1>
      <ConstructionIcon color='action' sx={{ fontSize: 200 }} />
    </Stack>
  );
};

export default Maintenance;
