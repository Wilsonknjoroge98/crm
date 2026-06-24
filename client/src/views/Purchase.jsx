import {
  Card,
  Container,
  Divider,
  Link,
  Typography,
  CardContent,
  Stack,
  Button,
} from '@mui/material';

const Purchase = () => {
  return (
    <Container sx={{ mt: 4 }}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        mb={3}
      >
        <Typography variant='h4'>Marketplace</Typography>
      </Stack>

      <Stack direction='column' spacing={3}>
        <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
          <Card
            variant='outlined'
            sx={{ width: 320, boxShadow: 0, padding: 1 }}
          >
            <CardContent>
              <Stack spacing={0.5} mb={3}>
                <Typography variant='subtitle1' fontWeight={600}>
                  Fresh Leads
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  FEX web leads delivered daily
                </Typography>
              </Stack>

              <Stack spacing={0.5} mb={3}>
                <Typography variant='h4'>$39</Typography>
                <Typography variant='caption' color='text.secondary'>
                  per qualified lead
                </Typography>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Button
                variant='contained'
                fullWidth
                href='https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p'
                target='_blank'
                rel='noopener noreferrer'
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#222' },
                }}
              >
                Buy
              </Button>
            </CardContent>
          </Card>

          <Card
            variant='outlined'
            sx={{ width: 320, boxShadow: 0, padding: 1 }}
          >
            <CardContent>
              <Stack spacing={0.5} mb={3}>
                <Typography variant='subtitle1' fontWeight={600}>
                  Fresh Leads Subscription
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  FEX web leads delivered daily
                </Typography>
              </Stack>

              <Stack spacing={0.5} mb={3}>
                <Typography variant='h4'>$390 </Typography>
                <Typography variant='caption' color='text.secondary'>
                  per week
                </Typography>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Button
                variant='contained'
                fullWidth
                href='https://buy.stripe.com/8x24gzg8Q9sb64y7il6Ri0e'
                target='_blank'
                rel='noopener noreferrer'
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#222' },
                }}
              >
                Subscribe
              </Button>
            </CardContent>
          </Card>
        </Stack>

        <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
          <Card
            variant='outlined'
            sx={{ width: 320, boxShadow: 0, padding: 1 }}
          >
            <CardContent>
              <Stack spacing={0.5} mb={3}>
                <Typography variant='subtitle1' fontWeight={600}>
                  Live Transfer Leads
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Charged only if call lasts 90+ seconds
                </Typography>
              </Stack>

              <Stack spacing={0.5} mb={3}>
                <Typography variant='h4'>$60</Typography>
                <Typography variant='caption' color='text.secondary'>
                  per qualified transfer
                </Typography>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Button
                variant='contained'
                fullWidth
                href='https://buy.stripe.com/dRm00j7CkgUDdx01Y16Ri0b'
                target='_blank'
                rel='noopener noreferrer'
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#222' },
                }}
              >
                Buy
              </Button>
            </CardContent>
          </Card>

          <Card
            variant='outlined'
            sx={{ width: 320, boxShadow: 0, padding: 1 }}
          >
            <CardContent>
              <Stack spacing={0.5} mb={3}>
                <Typography variant='subtitle1' fontWeight={600}>
                  Banked Leads
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Submitted within the last 72 Hours
                </Typography>
              </Stack>

              <Stack spacing={0.5} mb={3}>
                <Typography variant='h4'>$15–$40</Typography>
                <Typography variant='caption' color='text.secondary'>
                  per qualified lead
                </Typography>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Button
                variant='contained'
                fullWidth
                href='https://fexdigital.com/fresh/store'
                target='_blank'
                rel='noopener noreferrer'
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#222' },
                }}
              >
                Shop
              </Button>
            </CardContent>
          </Card>

          <Card
            variant='outlined'
            sx={{ width: 320, boxShadow: 0, padding: 1 }}
          >
            <CardContent>
              <Stack spacing={0.5} mb={3}>
                <Typography variant='subtitle1' fontWeight={600}>
                  Aged Leads
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Submitted 30–180 Days Ago
                </Typography>
              </Stack>

              <Stack spacing={0.5} mb={3}>
                <Typography variant='h4'>$2–$6</Typography>
                <Typography variant='caption' color='text.secondary'>
                  per lead
                </Typography>
              </Stack>

              <Divider sx={{ mb: 3 }} />

              <Button
                variant='contained'
                fullWidth
                href='https://fexdigital.com/aged/store'
                target='_blank'
                rel='noopener noreferrer'
                sx={{
                  backgroundColor: '#000',
                  color: '#fff',
                  fontWeight: 600,
                  '&:hover': { backgroundColor: '#222' },
                }}
              >
                Shop
              </Button>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <Stack spacing={0.5} mt={4}>
        <Typography variant='body2' color='text.secondary'>
          Get <strong>2 free leads</strong> when your clients leave a review{' '}
          <Link
            href='https://g.page/r/Cae_g-5KWKUtEAI/review'
            target='_blank'
            rel='noopener noreferrer'
          >
            here
          </Link>
          .
        </Typography>
      </Stack>
    </Container>
  );
};

export default Purchase;
