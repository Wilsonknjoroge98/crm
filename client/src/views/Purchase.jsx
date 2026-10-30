// Marketplace landing: the agent picks what they're looking for, and the next
// page shows what that category offers.
import { Box, Stack, Typography } from '@mui/material';
import {
  AGED_BANKED_PATH,
  AGED_SEGMENTS,
  BANKED_SEGMENTS,
  FRESH_LEADS_PATH,
  SOFTWARE_PATH,
  summarizeSegments,
  useMarketplaceInventory,
} from './marketplace/cartState.js';
import {
  CartLink,
  MarketplaceHeader,
  ProductTile,
  formatPrice,
} from './marketplace/ui.jsx';
import { LOWEST_FRESH_PRICE, LOWEST_SOFTWARE_PRICE } from './marketplace/Categories.jsx';
import PageContainer from '../components/PageContainer';

const Purchase = () => {
  // Shares its cache with the store pages, so opening a store after this page
  // reuses this inventory.
  const { bySegment } = useMarketplaceInventory();
  const inventory = summarizeSegments(bySegment, [
    ...AGED_SEGMENTS,
    ...BANKED_SEGMENTS,
  ]);

  return (
    // The tinted canvas behind the tiles comes from App's layout.
    <PageContainer>
      <Stack spacing={3}>
        <MarketplaceHeader actions={<CartLink />} />
        <Typography variant='h5' component='p' sx={{ fontWeight: 400 }}>
          Select the product you are looking for
        </Typography>
        <Box
          sx={{
            display: 'grid',
            // The CRM's side panel is always there, so three tiles need a wide screen
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          <ProductTile
            to={FRESH_LEADS_PATH}
            title='Fresh Leads'
            description='New leads and live calls sent to you as they come in.'
            figurePrefix='From'
            figure={formatPrice(LOWEST_FRESH_PRICE)}
            figureNote='per lead'
          />
          <ProductTile
            to={AGED_BANKED_PATH}
            title='Aged & Banked Leads'
            description='Leads you can buy right now, by state, at a lower price.'
            figurePrefix={inventory.price == null ? null : 'From'}
            figure={inventory.price == null ? null : formatPrice(inventory.price)}
            figureNote='per lead'
            highlight={
              inventory.available > 0
                ? `${inventory.available.toLocaleString()} available`
                : null
            }
          />
          <ProductTile
            to={SOFTWARE_PATH}
            title='Software'
            description='Your own texting line, and an AI assistant that follows up and books calls.'
            figurePrefix='From'
            figure={formatPrice(LOWEST_SOFTWARE_PRICE)}
            figureNote='per month'
          />
        </Box>
      </Stack>
    </PageContainer>
  );
};

export default Purchase;
