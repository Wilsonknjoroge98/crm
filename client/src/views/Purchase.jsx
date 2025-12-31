import { Card, Container, Typography, CardContent, Paper, Button, Stack, Box } from '@mui/material';
import { useEffect } from 'react';

import Divider from '@mui/material/Divider';

const Purchase = () => {
  useEffect(() => {
    // Dynamically load Stripe script once
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/buy-button.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // optional cleanup
      document.body.removeChild(script);
    };
  }, []);

  const priceMap = [
    { count: '10 Leads / Week', price: '$36 per lead' },
    { count: '11 - 29 Leads / Week', price: '$35 per lead' },
    { count: '30 - 44 Leads / Week', price: '$34 per lead' },
    { count: '45+ Leads / Week', price: '$33 per lead' },
  ];

  return (
    <Container sx={{ mt: 6 }}>
      <Stack alignItems='center' spacing={4}>
        {/* Page Title */}
        <Stack spacing={0.5} alignItems='center'>
          <Typography variant='h4' fontWeight={700}>
            Weekly Lead Package
          </Typography>
        </Stack>

        {/* Pricing Card */}
        <Card
          variant='outlined'
          sx={{
            borderRadius: 4,
            width: 380,
            textAlign: 'center',
            p: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
          }}
        >
          <CardContent>
            {/* Card Header */}
            <Stack spacing={1.5} mb={3}>
              <Typography variant='h6' fontWeight={600}>
                Lead Volume Pricing
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Volume discounts applied automatically
              </Typography>
            </Stack>

            {/* Pricing Tiers */}
            <Stack spacing={1.5} mb={3}>
              <Stack direction='row' justifyContent='space-between'>
                <Typography variant='body2'>10–14 leads / week</Typography>
                <Typography variant='body2' fontWeight={600}>
                  $36 / lead
                </Typography>
              </Stack>

              <Stack direction='row' justifyContent='space-between'>
                <Typography variant='body2'>15–29 leads / week</Typography>
                <Typography variant='body2' fontWeight={600}>
                  $35 / lead
                </Typography>
              </Stack>

              <Stack direction='row' justifyContent='space-between'>
                <Typography variant='body2'>30–44 leads / week</Typography>
                <Typography variant='body2' fontWeight={600}>
                  $34 / lead
                </Typography>
              </Stack>

              <Stack direction='row' justifyContent='space-between'>
                <Typography variant='body2'>45+ leads / week</Typography>
                <Typography variant='body2' fontWeight={600}>
                  $33 / lead
                </Typography>
              </Stack>
            </Stack>

            {/* CTA */}
            <Box display='flex' justifyContent='center' mt={2}>
              <stripe-buy-button
                buy-button-id='buy_btn_1SPOupDVQvSJ0t4H61Od5kSK'
                publishable-key='pk_live_51RpmeeDVQvSJ0t4HVg9ghYU26STvozS3ERYrTZ9t026K6n08q1tX0ofLLr9WMa1W409qibMZqc2tDMaVjB4pwmPT001zoitAkW'
              />
            </Box>
          </CardContent>
        </Card>

        {/* Trust + Secondary Actions */}
        <Stack spacing={1} alignItems='center'>
          <Typography variant='body2'>
            Get <strong>2 free leads</strong> when your clients leave a review{' '}
            <a
              href='https://g.page/r/Cae_g-5KWKUtEAI/review'
              target='_blank'
              rel='noopener noreferrer'
            >
              here
            </a>
            .
          </Typography>

          <Typography variant='body2'>
            Manage your subscription{' '}
            <a
              href='https://billing.stripe.com/p/login/14AdR909SfQz0KedGJ6Ri00'
              target='_blank'
              rel='noopener noreferrer'
            >
              here
            </a>
            .
          </Typography>
        </Stack>
      </Stack>
    </Container>
  );
};

export default Purchase;
