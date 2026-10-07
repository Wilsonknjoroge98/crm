// Marketplace hub: every product we sell, ordered by sales volume.
// Real-time campaigns (Stripe payment links) lead; the on-demand inventory
// storefront (aged + banked) sits below as a supplementary source.
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useQueries } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { marketplaceFetch } from './marketplace/api.js';
import {
  BORDER,
  GOLD,
  MONO,
  SLATE,
  MarketplaceHeader,
  formatMoney,
  labelSx,
  segmentPath,
} from './marketplace/ui.jsx';

// Same query keys as the storefront pages, so opening a store after the
// hub reuses this inventory.
const INVENTORY_QUERIES = [
  { leadType: 'fresh', tier: 'second' },
  { leadType: 'aged', tier: 'second' },
  { leadType: 'aged', tier: 'third' },
];

// Real-time products, in order of sales volume.
const CAMPAIGNS = [
  {
    title: 'Fresh Leads',
    accent: GOLD,
    price: 39,
    unit: 'lead',
    description:
      'High-intent leads from the GSQ web funnel, delivered to you in real time as they come in.',
    cta: 'Order Fresh Leads',
    href: 'https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p',
  },
  {
    title: 'Instant Form Leads',
    accent: '#1C7EBB',
    price: 25,
    unit: 'lead',
    description:
      'Meta instant form leads delivered in real time, built for high-volume speed-to-lead.',
    cta: 'Order Instant Form Leads',
    href: 'https://buy.stripe.com/3cIdR92i033NboS4696Ri0A',
  },
  {
    title: 'Live Transfers',
    accent: '#3F6F5B',
    price: 60,
    unit: 'transfer',
    description:
      'Live inbound phone connections. Charged only if the call lasts 90+ seconds.',
    cta: 'Order Live Transfers',
    href: 'https://buy.stripe.com/dRm00j7CkgUDdx01Y16Ri0b',
  },
];

const countAvailable = (inventory) =>
  Object.values(inventory?.states || {}).reduce(
    (sum, s) => sum + s.verified + s.unverified,
    0,
  );

// Cheapest per-lead price across the given inventories, for "From $x".
const lowestPrice = (inventories) => {
  const prices = inventories
    .flatMap((inv) => [inv?.prices?.unverified, inv?.prices?.verified])
    .filter((p) => typeof p === 'number');
  return prices.length ? Math.min(...prices) : null;
};

const cardSx = (accent) => ({
  flex: 1,
  p: 3,
  borderRadius: 2,
  borderColor: BORDER,
  borderTop: `3px solid ${accent}`,
  display: 'flex',
  flexDirection: 'column',
  transition: 'box-shadow 0.2s ease-in-out',
  '&:hover': { boxShadow: (theme) => theme.shadows[1] },
});

/** Hero card for a real-time product sold through a Stripe payment link. */
function CampaignCard({ title, accent, price, unit, description, cta, href }) {
  return (
    <Paper variant='outlined' sx={cardSx(accent)}>
      <Typography sx={labelSx}>{title}</Typography>

      <Typography
        variant='h4'
        sx={{ fontFamily: MONO, fontWeight: 700, mt: 2 }}
      >
        {formatMoney(price)}
        <Typography
          component='span'
          variant='body2'
          color='text.secondary'
          sx={{ ml: 1 }}
        >
          / {unit}
        </Typography>
      </Typography>
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 1.5, mb: 3 }}
      >
        {description}
      </Typography>

      <Button
        variant='contained'
        color='action'
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        endIcon={<OpenInNewIcon sx={{ fontSize: '1rem !important' }} />}
        sx={{ mt: 'auto', alignSelf: 'flex-start', fontWeight: 700 }}
      >
        {cta}
      </Button>
    </Paper>
  );
}

/**
 * Storefront inventory card. Same anatomy as CampaignCard — label, price
 * anchor, description, CTA — with live availability as a badge top-right.
 * When `available` is known to be 0 the CTA gives way to `emptyMessage`.
 */
function InventoryCard({
  title,
  accent,
  price,
  available,
  loading,
  description,
  cta,
  ctaVariant,
  to,
  emptyMessage,
  sx,
}) {
  const empty = available === 0;
  const count = available == null ? null : available.toLocaleString();
  return (
    <Paper
      variant='outlined'
      sx={{
        ...cardSx(empty ? BORDER : accent),
        bgcolor: empty ? '#FAFAFA' : '#FFFFFF',
        ...sx,
      }}
    >
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        spacing={1}
      >
        <Typography sx={labelSx}>{title}</Typography>
        {loading ? (
          <Skeleton variant='rounded' width={96} height={24} />
        ) : (
          count != null && (
            <Chip
              size='small'
              label={
                <>
                  <Box component='span' sx={{ fontFamily: MONO }}>
                    {count}
                  </Box>{' '}
                  Available
                </>
              }
              sx={{
                bgcolor: empty ? '#F0F0F0' : '#F0F4F8',
                color: empty ? 'text.disabled' : 'text.secondary',
              }}
            />
          )
        )}
      </Stack>

      {loading ? (
        <Skeleton width={200} height={44} sx={{ mt: 1.5 }} />
      ) : (
        <Typography
          variant='h4'
          sx={{ fontFamily: MONO, fontWeight: 700, mt: 2 }}
        >
          <Typography
            component='span'
            variant='body2'
            color='text.secondary'
            sx={{ mr: 1 }}
          >
            From
          </Typography>
          {price == null ? '—' : formatMoney(price)}
          <Typography
            component='span'
            variant='body2'
            color='text.secondary'
            sx={{ ml: 1 }}
          >
            / lead
          </Typography>
        </Typography>
      )}
      <Typography
        variant='body2'
        color='text.secondary'
        sx={{ mt: 1.5, mb: 3 }}
      >
        {description}
      </Typography>

      {empty ? (
        <Typography variant='body2' color='text.disabled' sx={{ mt: 'auto' }}>
          {emptyMessage}
        </Typography>
      ) : (
        <Button
          variant={ctaVariant}
          color='primary'
          component={RouterLink}
          to={to}
          endIcon={<ArrowForwardIcon />}
          sx={{
            mt: 'auto',
            alignSelf: 'flex-start',
            ...(ctaVariant === 'outlined' && { borderColor: BORDER }),
          }}
        >
          {cta}
          {count != null && (
            <Box component='span' sx={{ fontFamily: MONO, ml: 0.75 }}>
              ({count})
            </Box>
          )}
        </Button>
      )}
    </Paper>
  );
}

const Purchase = () => {
  const [banked, agedSecond, agedThird] = useQueries({
    queries: INVENTORY_QUERIES.map(({ leadType, tier }) => ({
      queryKey: ['inventory', leadType, tier],
      queryFn: async () => {
        const url =
          leadType === 'fresh'
            ? `/inventoryReport?type=${leadType}`
            : `/inventoryReport?type=${leadType}&tier=${tier}`;
        const res = await marketplaceFetch(url);
        if (!res.ok) throw new Error('Failed to fetch inventory');
        return res.json();
      },
    })),
  });

  const agedLoading = agedSecond.isLoading || agedThird.isLoading;
  const agedAvailable =
    agedSecond.data || agedThird.data
      ? countAvailable(agedSecond.data) + countAvailable(agedThird.data)
      : null;
  // null (not 0) when the lookup failed, so the card stays clickable and the
  // agent can open the store and retry there.
  const bankedAvailable = banked.data ? countAvailable(banked.data) : null;

  return (
    <Container maxWidth={false} sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={4}>
        <MarketplaceHeader subtitle='Order real-time lead campaigns and browse on-demand inventory.' />

        <Box>
          <Typography sx={{ ...labelSx, mb: 1.5 }}>
            Real-Time Campaigns
          </Typography>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            {CAMPAIGNS.map((campaign) => (
              <CampaignCard key={campaign.title} {...campaign} />
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography sx={{ ...labelSx, mb: 1.5 }}>
            On-Demand Inventory
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {/* Aged: the larger shelf card */}
            <InventoryCard
              title='Aged Leads • 31–180 Days'
              accent={SLATE}
              price={lowestPrice([agedSecond.data, agedThird.data])}
              available={agedAvailable}
              loading={agedLoading}
              description='Aged GSQ funnel leads at a fraction of the price, in 31–90 and 91–180 day windows'
              cta='Browse State Inventory'
              ctaVariant='contained'
              to={segmentPath('aged', 'second', 'store')}
              emptyMessage='No aged leads are available right now.'
              sx={{ flex: 2 }}
            />

            {/* Banked: small overflow card, greyed out when nothing is banked */}
            <InventoryCard
              title='Banked Leads • 72-Hour Overflow'
              accent={GOLD}
              price={lowestPrice([banked.data])}
              available={bankedAvailable}
              loading={banked.isLoading}
              description='Fresh leads from the last 72 hours that were never issued to an agent.'
              cta='Browse Banked Leads'
              ctaVariant='outlined'
              to={segmentPath('fresh', null, 'store')}
              emptyMessage='No fresh leads are banked right now.'
            />
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
};

export default Purchase;
