import {
  Card,
  Container,
  Divider,
  Link,
  Typography,
  CardContent,
  Stack,
} from '@mui/material';
import { useEffect } from 'react';

const Purchase = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/buy-button.js';
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

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

      <Stack direction='row' spacing={3} flexWrap='wrap'>
        <Card variant='outlined' sx={{ width: 320, boxShadow: 0, padding: 1 }}>
          <CardContent>
            <Stack spacing={0.5} mb={3}>
              <Typography variant='subtitle1' fontWeight={600}>
                Weekly Lead Pack
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

            <stripe-buy-button
              buy-button-id='buy_btn_1Stg0ZDVQvSJ0t4H3fOuyl2W'
              publishable-key='pk_live_51RpmeeDVQvSJ0t4HVg9ghYU26STvozS3ERYrTZ9t026K6n08q1tX0ofLLr9WMa1W409qibMZqc2tDMaVjB4pwmPT001zoitAkW'
            ></stripe-buy-button>
          </CardContent>
        </Card>

        <Card variant='outlined' sx={{ width: 320, boxShadow: 0, padding: 1 }}>
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

            <stripe-buy-button
              buy-button-id='buy_btn_1Stg5mDVQvSJ0t4HJzlmDNPd'
              publishable-key='pk_live_51RpmeeDVQvSJ0t4HVg9ghYU26STvozS3ERYrTZ9t026K6n08q1tX0ofLLr9WMa1W409qibMZqc2tDMaVjB4pwmPT001zoitAkW'
            ></stripe-buy-button>
          </CardContent>
        </Card>
      </Stack>

      <Stack spacing={0.5} mt={4}>
        <Typography variant='body2' color='text.secondary'>
          Get <strong>1 free lead</strong> when your clients leave a review{' '}
          <Link
            href='https://g.page/r/Cae_g-5KWKUtEAI/review'
            target='_blank'
            rel='noopener noreferrer'
          >
            here
          </Link>
          .
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Manage your subscription{' '}
          <Link
            href='https://billing.stripe.com/p/login/14AdR909SfQz0KedGJ6Ri00'
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
