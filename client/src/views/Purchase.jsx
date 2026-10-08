// Marketplace hub, in three tiers by how agents buy: real-time campaigns
// (per-lead Stripe payment links), the Sendblue software suite (monthly
// Stripe subscriptions), and the on-demand inventory storefront (aged +
// banked).
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
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { storePath, useMarketplaceInventory } from './marketplace/cartState.js';
import {
  BORDER,
  GOLD,
  INK,
  MONO,
  SLATE,
  MarketplaceHeader,
  formatMoney,
  labelSx,
} from './marketplace/ui.jsx';

// Real-time products, in order of sales volume. Fresh Leads is the flagship,
// so it alone gets the gold stripe and gold CTA.
const CAMPAIGNS = [
  {
    title: 'Funnel Leads',
    badge: '★ Popular',
    accent: GOLD,
    price: 39,
    unit: 'lead',
    description: 'High-intent leads generated on GetSeniorQuotes',
    cta: 'Order Funnel Leads',
    ctaColor: 'action',
    href: 'https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p',
  },
  {
    title: 'Instant Form Leads',
    accent: BORDER,
    price: 25,
    unit: 'lead',
    description: 'GSQ branded Meta instant form leads. ',
    cta: 'Order Instant Form Leads',
    href: 'https://buy.stripe.com/3cIdR92i033NboS4696Ri0A',
  },
  {
    title: 'Live Transfers',
    accent: BORDER,
    price: 60,
    unit: 'transfer',
    description:
      'Live inbound calls from the GSQ web funnel. Charged only if the call lasts 90+ seconds.',
    cta: 'Order Live Transfers',
    href: 'https://buy.stripe.com/dRm00j7CkgUDdx01Y16Ri0b',
  },
];

// Monthly subscriptions. The Bot texts from the Line, so they sit side by
// side as a pair.
const SUBSCRIPTIONS = [
  {
    title: 'Sendblue Line',
    // badge: 'Monthly Line',
    accent: INK,
    price: 155,
    unit: 'month',
    description:
      'Boost response rates, drive customer engagement, and convert more leads. ',
    cta: 'Subscribe to Line',
    href: 'https://buy.stripe.com/eVq7sL8GodIrakO4696Ri0v',
  },
  {
    title: 'Sendblue Bot',
    // badge: 'Add-on',
    accent: INK,
    price: 35,
    unit: 'month',
    description:
      'AI-powered assistant that handles lead follow-up and appointment booking in sendblue.',
    cta: 'Add Bot Automation',
    ctaVariant: 'outlined',
    href: 'https://buy.stripe.com/bJedR97Ck0VF1Oi0TX6Ri0B',
  },
];

// Stripe payment link locked to the agent's CRM email. Buying under any
// other email leaves the purchase unmatched to their account and stalls
// onboarding.
const withCrmEmail = (href, email) => {
  if (!email) return href;
  const url = new URL(href);
  url.searchParams.set('locked_prefilled_email', email);
  return url.toString();
};

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

// White cards lifted off the tinted page by a hairline shadow rather than a
// heavy elevation, to keep the flat editorial look.
const cardSx = (accent) => ({
  flex: 1,
  p: 3,
  borderRadius: 2,
  bgcolor: '#FFFFFF',
  borderColor: BORDER,
  borderTop: `3px solid ${accent}`,
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)',
    transform: 'translateY(-1px)',
  },
});

/**
 * Section label with a rule running to the right edge, styled like the
 * dialogs' SectionHeader.
 */
function SectionLabel({ children }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
      <Typography
        variant='subtitle2'
        color='primary'
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {children}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: BORDER }} />
    </Box>
  );
}

// Card badges, styled like BusinessCard's lifecycle status chip.
const badgeSx = {
  bgcolor: '#F0F4F8',
  color: 'secondary.main',
  border: '1px solid',
  borderColor: 'divider',
  fontWeight: 700,
  fontSize: '0.675rem',
  flexShrink: 0,
};

/**
 * Hero card for a product sold through a Stripe payment link: a real-time
 * campaign or a monthly subscription. CTAs are ink unless `ctaColor` says
 * otherwise (gold is reserved for the flagship). `badge` renders as a chip
 * top-right.
 */
function CampaignCard({
  title,
  badge,
  accent,
  price,
  unit,
  description,
  cta,
  ctaColor = 'primary',
  ctaVariant = 'contained',
  href,
}) {
  return (
    <Paper variant='outlined' sx={cardSx(accent)}>
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        spacing={1}
      >
        <Typography sx={labelSx}>{title}</Typography>
        {badge && <Chip size='small' label={badge} sx={badgeSx} />}
      </Stack>

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
        variant={ctaVariant}
        color={ctaColor}
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        sx={{
          mt: 'auto',
          alignSelf: 'flex-start',
          fontWeight: 700,
          ...(ctaVariant === 'outlined' && { borderColor: BORDER }),
        }}
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
  showCountInCta = true,
  to,
  emptyMessage,
}) {
  const empty = available === 0;
  const count = available == null ? null : available.toLocaleString();
  return (
    <Paper
      variant='outlined'
      sx={{
        ...cardSx(empty ? BORDER : accent),
        bgcolor: empty ? '#FAFAFA' : '#FFFFFF',
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
              sx={{ ...badgeSx, ...(empty && { color: 'text.disabled' }) }}
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
          variant='outlined'
          color='primary'
          component={RouterLink}
          to={to}
          endIcon={<ArrowForwardIcon />}
          sx={{
            mt: 'auto',
            alignSelf: 'flex-start',
            borderColor: BORDER,
          }}
        >
          {cta}
        </Button>
      )}
    </Paper>
  );
}

const Purchase = () => {
  const email = useSelector((state) => state.user.user?.email);
  // Shares its cache with the store pages, so opening a store after the hub
  // reuses this inventory.
  const inventory = useMarketplaceInventory();
  const {
    banked,
    aged_second: agedSecond,
    aged_third: agedThird,
  } = inventory.bySegment;

  const agedLoading = agedSecond.isLoading || agedThird.isLoading;
  const agedAvailable =
    agedSecond.data || agedThird.data
      ? countAvailable(agedSecond.data) + countAvailable(agedThird.data)
      : null;
  // null (not 0) when the lookup failed, so the card stays clickable and the
  // agent can open the store and retry there.
  const bankedAvailable = banked.data ? countAvailable(banked.data) : null;

  return (
    // The tinted canvas behind the cards comes from App's layout.
    // Capped at lg (1200px) so the card rows don't stretch on wide screens.
    <Container maxWidth='lg' sx={{ py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={4}>
        <MarketplaceHeader />

        <Box>
          <SectionLabel>Fresh Leads</SectionLabel>
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2}>
            {CAMPAIGNS.map((campaign) => (
              <CampaignCard
                key={campaign.title}
                {...campaign}
                href={withCrmEmail(campaign.href, email)}
              />
            ))}
          </Stack>
        </Box>

        <Box>
          <SectionLabel>Software & Automation</SectionLabel>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {SUBSCRIPTIONS.map((subscription) => (
              <CampaignCard
                key={subscription.title}
                {...subscription}
                href={withCrmEmail(subscription.href, email)}
              />
            ))}
          </Stack>
        </Box>

        <Box>
          <SectionLabel>On-Demand Inventory</SectionLabel>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <InventoryCard
              title='Aged Leads'
              accent={SLATE}
              price={lowestPrice([agedSecond.data, agedThird.data])}
              available={agedAvailable}
              loading={agedLoading}
              description='GSQ at a fraction of the price. Available in 31–90 and 91–180 day age windows'
              cta='Browse Inventory'
              showCountInCta={false}
              to={storePath('aged_second')}
              emptyMessage='No aged leads are available right now.'
            />

            {/* Banked is greyed out when nothing is banked */}
            <InventoryCard
              title='Banked Leads'
              accent={SLATE}
              price={lowestPrice([banked.data])}
              available={bankedAvailable}
              loading={banked.isLoading}
              description='Fresh leads from the last 72 hours that were never issued to an agent.'
              cta='Browse Inventory'
              to={storePath('banked')}
              emptyMessage='No fresh leads are banked right now.'
            />
          </Stack>
        </Box>
      </Stack>
    </Container>
  );
};

export default Purchase;
