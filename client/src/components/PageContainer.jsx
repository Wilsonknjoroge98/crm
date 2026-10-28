import { Container } from '@mui/material';

// What the outlet has to fill: the viewport less the NavBar (64px) and the
// bottom padding App puts under every page (48px)
export const PAGE_FILL_HEIGHT = 'calc(100vh - 112px)';

// The one page shell, so every view starts its title at the same spot.
// Only the width varies: xl for working views (lists, boards, the inbox),
// lg for forms, settings and the store.
const PageContainer = ({ width = 'lg', sx, children }) => (
  <Container maxWidth={width} sx={{ py: 3, px: { xs: 2, md: 3 }, ...sx }}>
    {children}
  </Container>
);

export default PageContainer;
