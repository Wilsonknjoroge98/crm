// The Marketplace's category pages: what each tile on the landing page offers.
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import { MARKETPLACE_PATH } from './api.js';
import {
  AGED_BANKED_PATH,
  AGED_PATH,
  AGED_SEGMENTS,
  BANKED_PATH,
  BANKED_SEGMENTS,
  SEGMENT_BY_KEY,
  SOURCE_HELP,
  sellableCount,
  sellablePrices,
  storePath,
  summarizeSegments,
  useMarketplaceInventory,
} from './cartState.js';
import {
  BORDER,
  CartLink,
  ChoiceTile,
  LeadTypeChip,
  MarketplaceHeader,
  ProductTile,
  formatPrice,
} from './ui.jsx';
import PageContainer from '../../components/PageContainer';

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

export const LOWEST_FRESH_PRICE = Math.min(...CAMPAIGNS.map((p) => p.price));
export const LOWEST_SOFTWARE_PRICE = Math.min(
  ...SUBSCRIPTIONS.map((p) => p.price),
);

// Stripe payment link locked to the agent's CRM email. Buying under any
// other email leaves the purchase unmatched to their account and stalls
// onboarding.
const withCrmEmail = (href, email) => {
  if (!email) return href;
  const url = new URL(href);
  url.searchParams.set('locked_prefilled_email', email);
  return url.toString();
};

/** One product bought through a Stripe payment link. */
function ProductRow({
  title,
  badge,
  price,
  unit,
  description,
  cta,
  ctaColor = 'primary',
  ctaVariant = 'outlined',
  href,
}) {
  return (
    <Paper
      variant='outlined'
      sx={{
        p: 3,
        borderRadius: 2,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr auto',
          md: 'minmax(0, 1fr) auto 130px',
        },
        alignItems: 'center',
        columnGap: 3,
        rowGap: 2,
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
          <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
            {title}
          </Typography>
          {badge && <LeadTypeChip verified label={badge} />}
        </Stack>
        <Typography color='text.secondary' sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '1.75rem',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {formatPrice(price)}
        <Typography
          component='span'
          variant='body2'
          color='text.secondary'
          sx={{ ml: 0.75 }}
        >
          per {unit}
        </Typography>
      </Typography>
      <Button
        variant={ctaVariant}
        color={ctaColor}
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        aria-label={`${cta} ${title}`}
        sx={{
          width: { md: '100%' },
          py: 1.25,
          fontWeight: 600,
          ...(ctaVariant === 'outlined' && { borderColor: BORDER }),
        }}
      >
        {cta}
      </Button>
    </Paper>
  );
}

function ProductList({ title, intro, products }) {
  const email = useSelector((state) => state.user.user?.email);
  return (
    <PageContainer>
      <Stack spacing={3}>
        <MarketplaceHeader
          title={title}
          breadcrumb={{ label: 'Marketplace', to: MARKETPLACE_PATH }}
          actions={<CartLink />}
        />
        <Typography color='text.secondary'>{intro}</Typography>
        <Stack spacing={2}>
          {products.map((product) => (
            <ProductRow
              key={product.title}
              {...product}
              href={withCrmEmail(product.href, email)}
            />
          ))}
        </Stack>
      </Stack>
    </PageContainer>
  );
}

export const FreshLeads = () => (
  <ProductList
    title='Fresh Leads'
    intro='Leads sent to you as they come in. Pay per lead.'
    products={CAMPAIGNS}
  />
);

export const Software = () => (
  <ProductList
    title='Software'
    intro='Monthly subscriptions. The Bot texts your leads from your Sendblue Line.'
    products={SUBSCRIPTIONS}
  />
);

/** Aged or banked: how many are available, what they are, and what they cost. */
function InventoryTile({ summary, to, icon, title, description, emptyMessage }) {
  const { available, loading, price } = summary;
  const empty = available === 0;
  let highlight = null;
  if (empty) highlight = emptyMessage;
  else if (available > 0) highlight = `${available.toLocaleString()} available`;
  return (
    <ProductTile
      to={to}
      icon={icon}
      title={title}
      description={description}
      disabled={empty}
      highlight={loading ? 'Checking what’s available…' : highlight}
      meta={price == null ? '' : `From ${formatPrice(price)} per lead`}
    />
  );
}

export function AgedBanked() {
  const { bySegment } = useMarketplaceInventory();
  return (
    <PageContainer>
      <Stack spacing={3}>
        <MarketplaceHeader
          title='Aged & Banked Leads'
          breadcrumb={{ label: 'Marketplace', to: MARKETPLACE_PATH }}
          actions={<CartLink />}
        />
        <Typography variant='h5' component='p' sx={{ fontWeight: 400 }}>
          Which leads are you looking for?
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          <InventoryTile
            summary={summarizeSegments(bySegment, AGED_SEGMENTS)}
            to={AGED_PATH}
            icon={HistoryOutlinedIcon}
            title='Aged Leads'
            description='31–180 days old, at a lower price.'
            emptyMessage='No aged leads are available right now.'
          />
          <InventoryTile
            summary={summarizeSegments(bySegment, BANKED_SEGMENTS)}
            to={BANKED_PATH}
            icon={AccountBalanceOutlinedIcon}
            title='Banked Leads'
            description='Under 72 hours old, never issued to an agent.'
            emptyMessage='No fresh leads are banked right now.'
          />
        </Box>
      </Stack>
    </PageContainer>
  );
}

/** One age or source of leads: how many are left and what they cost. */
function SegmentTile({ segmentKey, title, note, bySegment }) {
  const segment = SEGMENT_BY_KEY[segmentKey];
  const { data, isLoading } = bySegment[segmentKey];
  // A failed lookup stays clickable, so the agent can open the store and retry.
  const count = data ? sellableCount(segment, data) : null;
  const prices = sellablePrices(segment, data);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  let highlight = '';
  if (isLoading) highlight = 'Checking what’s available…';
  else if (count === 0) highlight = 'None right now';
  else if (count > 0) highlight = `${count.toLocaleString()} left`;
  let meta = '';
  if (count > 0 && prices.length) {
    meta =
      low === high
        ? `${formatPrice(low)} each`
        : `${formatPrice(low)} to ${formatPrice(high)} each`;
  }
  return (
    <ChoiceTile
      to={storePath(segmentKey)}
      title={title}
      note={note}
      highlight={highlight}
      meta={meta}
      disabled={count === 0}
    />
  );
}

function SourceSection({ source, title, children }) {
  return (
    <Box>
      <Typography variant='h6' component='h2' sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography color='text.secondary' sx={{ mb: 1.5 }}>
        {SOURCE_HELP[source]}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function AgedLeads() {
  const { bySegment } = useMarketplaceInventory();
  return (
    <PageContainer>
      <Stack spacing={3}>
        <MarketplaceHeader
          title='Aged Leads'
          breadcrumb={{ label: 'Back', to: AGED_BANKED_PATH }}
          actions={<CartLink />}
        />
        <SourceSection source='funnel' title='Funnel'>
          <SegmentTile segmentKey='aged_second' title='31–90 days' bySegment={bySegment} />
          <SegmentTile segmentKey='aged_third' title='91–180 days' bySegment={bySegment} />
        </SourceSection>
        <SourceSection source='instant' title='Instant Form'>
          <SegmentTile segmentKey='instant_aged_second' title='31–90 days' bySegment={bySegment} />
          <SegmentTile segmentKey='instant_aged_third' title='91–180 days' bySegment={bySegment} />
        </SourceSection>
      </Stack>
    </PageContainer>
  );
}

export function BankedLeads() {
  const { bySegment } = useMarketplaceInventory();
  return (
    <PageContainer>
      <Stack spacing={3}>
        <MarketplaceHeader
          title='Banked Leads'
          breadcrumb={{ label: 'Back', to: AGED_BANKED_PATH }}
          actions={<CartLink />}
        />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          <SegmentTile
            segmentKey='banked'
            title='Funnel'
            note={SOURCE_HELP.funnel}
            bySegment={bySegment}
          />
          <SegmentTile
            segmentKey='instant_banked'
            title='Instant Form'
            note={SOURCE_HELP.instant}
            bySegment={bySegment}
          />
        </Box>
      </Stack>
    </PageContainer>
  );
}
