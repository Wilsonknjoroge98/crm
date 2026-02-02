import { Card, Container, Typography, CardContent, Stack, Box } from '@mui/material';
import { useEffect } from 'react';

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

  const accountDetail = {
    ringySid: 'iSjqib3bgrzvjbtf1bw8psqmzm7ct7za',
    ringyToken: 'gdlxpcd9ksrur96ja8rbrmeqysd7q6ms',
    states: [
      'AK',
      'AL',
      'AZ',
      'CA',
      'CO',
      'IA',
      'IN',
      'KY',
      'LA',
      'MD',
      'MI',
      'MO',
      'MS',
      'NC',
      'ND',
      'NM',
      'NV',
      'OH',
      'OK',
      'TN',
      'TX',
      'VA',
      'WA',
      'WI',
      'WV',
      'NJ',
      'IL',
      'VT',
      'SD',
      'HI',
      'MN',
      'NE',
      'MA',
      'OR',
      'ME',
      'PA',
      'UT',
      'KS',
      'ID',
      'RI',
      'AR',
      'CT',
      'DE',
      'MT',
      'NH',
      'SC',
      'WY',
    ],
    verified: true,
    unverified: false,
    name: 'Sam Atherton',
    deliver: true,
    leadCredits: 0,
    weight: 1,
    lastIssuedDate: { _seconds: 1769131512, _nanoseconds: 607000000 },
    outstandingLeads: 0,
  };

  return (
    <Container sx={{ mt: 6 }}>
      <Stack alignItems='center' spacing={4}>
        {/* Page Title */}
        <Stack spacing={0.5} alignItems='center'>
          <Typography variant='h4' fontWeight={700}>
            Purchase Leads
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
                Weekly Lead Package
              </Typography>
            </Stack>

            {/* Pricing Tiers */}
            <Stack spacing={0.5} mb={3}>
              <Typography variant='h3' fontWeight={700}>
                $39
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                per qualified lead
              </Typography>
            </Stack>

            {/* CTA */}
            <Box display='flex' justifyContent='center' mt={2}>
              <stripe-buy-button
                buy-button-id='buy_btn_1Stg0ZDVQvSJ0t4H3fOuyl2W'
                publishable-key='pk_live_51RpmeeDVQvSJ0t4HVg9ghYU26STvozS3ERYrTZ9t026K6n08q1tX0ofLLr9WMa1W409qibMZqc2tDMaVjB4pwmPT001zoitAkW'
              ></stripe-buy-button>
            </Box>
          </CardContent>
        </Card>

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
                Live Transfer Leads
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Charged <strong>only if call lasts 60+ seconds</strong>
              </Typography>
            </Stack>

            {/* Price */}
            <Stack spacing={0.5} mb={3}>
              <Typography variant='h3' fontWeight={700}>
                $60
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                per qualified transfer
              </Typography>
            </Stack>

            {/* CTA */}
            <Box display='flex' justifyContent='center' mt={2}>
              <stripe-buy-button
                buy-button-id='buy_btn_1Stg5mDVQvSJ0t4HJzlmDNPd'
                publishable-key='pk_live_51RpmeeDVQvSJ0t4HVg9ghYU26STvozS3ERYrTZ9t026K6n08q1tX0ofLLr9WMa1W409qibMZqc2tDMaVjB4pwmPT001zoitAkW'
              ></stripe-buy-button>
            </Box>
          </CardContent>
        </Card>

        {/* Trust + Secondary Actions */}
        <Stack spacing={1} alignItems='center'>
          <Typography variant='body2'>
            Get <strong>1 free lead</strong> when your clients leave a review{' '}
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
            Manage your weekly subscription{' '}
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
