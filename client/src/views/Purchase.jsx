// Marketplace landing: the agent picks what they're looking for, and the next
// page shows what that category offers.
import { Box, Stack, Typography } from '@mui/material';
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
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
            icon={BoltOutlinedIcon}
            title='Fresh Leads'
            description='New leads and live calls sent to you as they come in.'
            meta={`From ${formatPrice(LOWEST_FRESH_PRICE)} per lead`}
          />
          <ProductTile
            to={AGED_BANKED_PATH}
            icon={Inventory2OutlinedIcon}
            title='Aged & Banked Leads'
            description='Leads you can buy right now, by state, at a lower price.'
            highlight={
              inventory.available > 0
                ? `${inventory.available.toLocaleString()} available`
                : null
            }
            meta={
              inventory.price == null
                ? 'Lower-priced leads'
                : `From ${formatPrice(inventory.price)} per lead`
            }
          />
          <ProductTile
            to={SOFTWARE_PATH}
            icon={ChatBubbleOutlineIcon}
            title='Software'
            description='Your own texting line, and an AI assistant that follows up and books calls.'
            meta={`From ${formatPrice(LOWEST_SOFTWARE_PRICE)} per month`}
          />
        </Box>
      </Stack>
    </PageContainer>
  );
};

export default Purchase;
