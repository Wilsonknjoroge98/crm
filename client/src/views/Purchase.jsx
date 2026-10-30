// Marketplace hub, in three lists by how agents buy: real-time campaigns
// (per-lead Stripe payment links), the Sendblue software suite (monthly
// Stripe subscriptions), and the on-demand inventory storefront (aged +
// banked).
import { Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { Link as RouterLink } from 'react-router-dom';
import { storePath, useMarketplaceInventory } from './marketplace/cartState.js';
import {
  BORDER,
  DIVIDER,
  LeadTypeChip,
  MarketplaceHeader,
  formatPrice,
  priceSx,
} from './marketplace/ui.jsx';
import PageContainer from '../components/PageContainer';

// Real-time products, in order of sales volume. Funnel Leads is the flagship,
// so it alone gets the gold button.
const CAMPAIGNS = [
  {
    title: 'Funnel Leads',
    badge: 'Popular',
    price: 39,
    unit: 'lead',
    description: 'High-intent leads generated on GetSeniorQuotes.',
    cta: 'Order',
    ctaColor: 'action',
    ctaVariant: 'contained',
    href: 'https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p',
  },
  {
    title: 'Instant Form Leads',
    price: 25,
    unit: 'lead',
    description: 'GSQ branded Meta instant form leads.',
    cta: 'Order',
    href: 'https://buy.stripe.com/3cIdR92i033NboS4696Ri0A',
  },
  {
    title: 'Live Transfers',
    price: 60,
    unit: 'transfer',
    description:
      'Live inbound calls from the GSQ web funnel. Charged only if the call lasts 90+ seconds.',
    cta: 'Order',
    href: 'https://buy.stripe.com/dRm00j7CkgUDdx01Y16Ri0b',
  },
];

// Monthly subscriptions. The Bot texts from the Line, so they sit together.
const SUBSCRIPTIONS = [
  {
    title: 'Sendblue Line',
    price: 155,
    unit: 'month',
    description:
      'Boost response rates, drive customer engagement, and convert more leads.',
    cta: 'Subscribe',
    href: 'https://buy.stripe.com/eVq7sL8GodIrakO4696Ri0v',
  },
  {
    title: 'Sendblue Bot',
    price: 35,
    unit: 'month',
    description:
      'AI-powered assistant that handles lead follow-up and appointment booking in Sendblue.',
    cta: 'Subscribe',
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

// One row's inventory across the segments it covers (quote funnel and
// instant forms). `available` is null (not 0) when every lookup failed, so
// the row stays clickable and the agent can open the store and retry there.
// `segmentKey` is the first segment with stock, so the row opens a store
// that has something to sell; `price` is the cheapest across all of them.
const summarize = (bySegment, keys) => {
  const loaded = keys.filter((key) => bySegment[key].data);
  const inventories = loaded.map((key) => bySegment[key].data);
  const withStock = loaded.find(
    (key) => countAvailable(bySegment[key].data) > 0,
  );
  return {
    available: loaded.length
      ? loaded.reduce(
          (sum, key) => sum + countAvailable(bySegment[key].data),
          0,
        )
      : null,
    loading: keys.some((key) => bySegment[key].isLoading),
    price: lowestPrice(inventories),
    segmentKey: withStock || keys[0],
  };
};

const actionSx = {
  justifySelf: { md: 'end' },
  width: { xs: 'auto', md: 116 },
  fontWeight: 600,
};

/**
 * One product in a list: name and description, then its price, then its
 * action, in columns that line up across every list on the page.
 */
function ProductRow({
  title,
  badge,
  note,
  description,
  price,
  pricePrefix,
  unit,
  loading,
  muted,
  action,
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr auto',
          md: 'minmax(0, 1fr) 120px 116px',
        },
        alignItems: 'center',
        columnGap: 3,
        rowGap: 1.5,
        px: 2.5,
        py: 2,
        '& + &': { borderTop: `1px solid ${DIVIDER}` },
      }}
    >
      <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, minWidth: 0 }}>
        <Stack
          direction='row'
          spacing={1}
          alignItems='center'
          useFlexGap
          flexWrap='wrap'
        >
          <Typography
            sx={{
              fontWeight: 600,
              color: muted ? 'text.disabled' : undefined,
            }}
          >
            {title}
          </Typography>
          {badge && <LeadTypeChip verified label={badge} />}
          {note && (
            <Typography variant='body2' color='text.secondary'>
              {note}
            </Typography>
          )}
        </Stack>
        <Typography
          variant='body2'
          color={muted ? 'text.disabled' : 'text.secondary'}
          sx={{ mt: 0.25 }}
        >
          {description}
        </Typography>
      </Box>

      <Box sx={{ textAlign: { md: 'right' } }}>
        {loading ? (
          <Skeleton width={72} height={28} sx={{ ml: { md: 'auto' } }} />
        ) : (
          <>
            <Typography
              sx={{ ...priceSx, color: muted ? 'text.disabled' : undefined }}
            >
              {pricePrefix && (
                <Typography
                  component='span'
                  variant='body2'
                  color='text.secondary'
                  sx={{ mr: 0.5 }}
                >
                  {pricePrefix}
                </Typography>
              )}
              {price == null ? '—' : formatPrice(price)}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              per {unit}
            </Typography>
          </>
        )}
      </Box>

      {action}
    </Box>
  );
}

/** A product bought through a Stripe payment link. */
function CampaignRow({
  cta,
  ctaColor = 'primary',
  ctaVariant = 'outlined',
  href,
  ...row
}) {
  return (
    <ProductRow
      {...row}
      action={
        <Button
          variant={ctaVariant}
          color={ctaColor}
          href={href}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={`${cta} ${row.title}`}
          sx={{
            ...actionSx,
            ...(ctaVariant === 'outlined' && { borderColor: BORDER }),
          }}
        >
          {cta}
        </Button>
      }
    />
  );
}

/**
 * A storefront product, with live availability beside its name. When
 * `available` is known to be 0 the row greys out and has nothing to open.
 */
function InventoryRow({ title, available, to, ...row }) {
  const empty = available === 0;
  return (
    <ProductRow
      {...row}
      title={title}
      muted={empty}
      pricePrefix='From'
      unit='lead'
      note={
        available > 0 && !row.loading
          ? `${available.toLocaleString()} available`
          : null
      }
      action={
        empty ? (
          <Typography
            variant='body2'
            color='text.disabled'
            sx={{ textAlign: { md: 'right' } }}
          >
            None right now
          </Typography>
        ) : (
          <Button
            variant='outlined'
            color='primary'
            component={RouterLink}
            to={to}
            aria-label={`Browse ${title}`}
            sx={{ ...actionSx, borderColor: BORDER }}
          >
            Browse
          </Button>
        )
      }
    />
  );
}

function ProductList({ title, children }) {
  return (
    <Box>
      <Typography variant='h6' component='h2' sx={{ mb: 1.5 }}>
        {title}
      </Typography>
      <Paper variant='outlined' sx={{ borderRadius: 2 }}>
        {children}
      </Paper>
    </Box>
  );
}

const Purchase = () => {
  const email = useSelector((state) => state.user.user?.email);
  // Shares its cache with the store pages, so opening a store after the hub
  // reuses this inventory.
  const inventory = useMarketplaceInventory();
  const aged = summarize(inventory.bySegment, [
    'aged_second',
    'aged_third',
    'instant_aged_second',
    'instant_aged_third',
  ]);
  const bankedSummary = summarize(inventory.bySegment, [
    'banked',
    'instant_banked',
  ]);

  return (
    // The tinted canvas behind the lists comes from App's layout.
    <PageContainer>
      <Stack spacing={4}>
        <MarketplaceHeader />

        <ProductList title='Fresh Leads'>
          {CAMPAIGNS.map((campaign) => (
            <CampaignRow
              key={campaign.title}
              {...campaign}
              href={withCrmEmail(campaign.href, email)}
            />
          ))}
        </ProductList>

        <ProductList title='Software & Automation'>
          {SUBSCRIPTIONS.map((subscription) => (
            <CampaignRow
              key={subscription.title}
              {...subscription}
              href={withCrmEmail(subscription.href, email)}
            />
          ))}
        </ProductList>

        <ProductList title='Aged & Banked Leads'>
          <InventoryRow
            title='Aged Leads'
            price={aged.price}
            available={aged.available}
            loading={aged.loading}
            description='Older GSQ leads at a fraction of the price, 31–90 or 91–180 days old.'
            to={storePath(aged.segmentKey)}
          />
          <InventoryRow
            title='Banked Leads'
            price={bankedSummary.price}
            available={bankedSummary.available}
            loading={bankedSummary.loading}
            description='Fresh leads from the last 72 hours that were never issued to an agent.'
            to={storePath(bankedSummary.segmentKey)}
          />
        </ProductList>
      </Stack>
    </PageContainer>
  );
};

export default Purchase;
