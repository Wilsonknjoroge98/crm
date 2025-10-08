import { Stack, Box, Divider, Chip, Typography, Button } from '@mui/material';
import dayjs from 'dayjs';

const AccountDetails = ({ data }) => {
  const formattedDate = data?.lastIssuedDate?._seconds
    ? dayjs.unix(data?.lastIssuedDate._seconds).format('MMM D, YYYY')
    : 'N/A';

  return (
    <>
      <Stack spacing={1}>
        <Stack direction='row' justifyContent='space-between'>
          <Typography variant='body2' color='text.secondary'>
            Outstanding Leads:
          </Typography>
          <Typography variant='body2' fontWeight='bold'>
            {data?.outstandingLeads}
          </Typography>
        </Stack>

        <Divider flexItem />

        <Stack spacing={1}>
          <Typography variant='body2' color='text.secondary'>
            States:
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.5,
            }}
          >
            {data?.states?.map((state) => (
              <Chip key={state} size='small' label={state} />
            ))}
          </Box>
        </Stack>

        <Divider flexItem />

        <Stack direction='row' justifyContent='space-between'>
          <Typography variant='body2' color='text.secondary'>
            Delivering:
          </Typography>
          <Typography variant='body2'>{data?.deliver ? 'Yes' : 'No'}</Typography>
        </Stack>
        <Divider flexItem />

        <Stack direction='row' justifyContent='space-between'>
          <Typography variant='body2' color='text.secondary'>
            Last Issued:
          </Typography>
          <Typography variant='body2'>{formattedDate}</Typography>
        </Stack>
      </Stack>
    </>
  );
};

export default AccountDetails;
