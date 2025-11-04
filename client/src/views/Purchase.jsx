import { Card, Container, Typography, CardContent, Paper, Button, Stack, Box } from '@mui/material';
import { useEffect } from 'react';

import theme from '../utils/theme';
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
    <Container sx={{ mt: 4 }}>
      <Stack alignItems='center' spacing={3}>
        <Typography variant='h5' fontWeight={700}>
          Weekly Lead Package
        </Typography>

        <Card
          variant='outlined'
          sx={{
            borderRadius: 3,
            width: 350,
            textAlign: 'center',
            transition: 'all 0.2s ease',
            p: 1,
          }}
        >
          <CardContent>
            <Stack></Stack>
            <Typography variant='body2' fontWeight={700}>
              10 - 14 Leads / Week @ $36 per lead
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant='body2' fontWeight={700}>
              15 - 29 Leads / Week @ $35 per lead
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant='body2' fontWeight={700}>
              30 - 44 Leads / Week @ $34 per lead
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant='body2' fontWeight={700}>
              45+ Leads / Week @ $33 per lead
            </Typography>
            <Box display='flex' justifyContent='center' sx={{ mt: 2 }}>
              <stripe-buy-button
                buy-button-id='buy_btn_1SPOupDVQvSJ0t4H61Od5kSK'
                publishable-key='pk_live_51RpmeeDVQvSJ0t4HVg9ghYU26STvozS3ERYrTZ9t026K6n08q1tX0ofLLr9WMa1W409qibMZqc2tDMaVjB4pwmPT001zoitAkW'
              ></stripe-buy-button>
            </Box>
          </CardContent>
        </Card>

        <Typography variant='caption' color='text.secondary' textAlign='center'>
          Secure payment powered by Stripe.
        </Typography>
      </Stack>
    </Container>
  );
};

export default Purchase;
