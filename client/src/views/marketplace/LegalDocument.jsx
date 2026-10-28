// LegalDocument.jsx
// Shared layout for the marketplace Terms of Service and Privacy Policy pages.
import { Typography, Box, Stack, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const G100 = '#f3f4f6';
const G400 = '#9ca3af';
const G500 = '#6b7280';
const G600 = '#4b5563';
const G900 = '#111827';

const footerLinkSx = {
  color: G400,
  fontSize: '0.875rem',
  '&:hover': { color: G600 },
  transition: 'color 0.15s',
};

function parseBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, j) =>
    j % 2 === 1 ? (
      <strong key={j} style={{ color: G900 }}>
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

// Body format: paragraphs separated by blank lines, "- " lines become bullets,
// **text** becomes bold.
function renderBody(text) {
  return text.split(/\n\s*\n/).map((block, i) => {
    const lines = block.split('\n');
    if (lines.every((l) => l.startsWith('- '))) {
      return (
        <Box component='ul' key={i} sx={{ pl: 3, my: 0 }}>
          {lines.map((l, j) => (
            <Box component='li' key={j} sx={{ mb: 0.5 }}>
              {parseBold(l.slice(2))}
            </Box>
          ))}
        </Box>
      );
    }
    return (
      <Typography
        key={i}
        component='p'
        sx={{ fontSize: '0.875rem', color: G500, lineHeight: 1.9 }}
      >
        {parseBold(lines.join(' '))}
      </Typography>
    );
  });
}

export default function LegalDocument({ title, effectiveDate, sections }) {
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ maxWidth: 768, mx: 'auto', px: 3, pt: 4, pb: 8 }}>
        <Typography variant='h4' sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: '0.875rem', color: G500, mb: 6 }}>
          Final Expense Digital, LLC &middot; Effective date: {effectiveDate}
        </Typography>

        <Stack spacing={5}>
          {sections.map((section) => (
            <Box key={section.title} component='section'>
              <Typography
                component='h2'
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: G900,
                  mb: 1.5,
                }}
              >
                {section.title}
              </Typography>
              <Stack spacing={1.5}>{renderBody(section.body)}</Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      <Box
        component='footer'
        sx={{ borderTop: '1px solid', borderColor: G100, py: 4 }}
      >
        <Box
          sx={{
            maxWidth: 1152,
            mx: 'auto',
            px: 3,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Typography sx={{ color: G400, fontSize: '0.875rem' }}>
            &copy; {new Date().getFullYear()} Final Expense Digital, LLC
          </Typography>
          <Stack direction='row' spacing={3}>
            <Link
              href='mailto:info@fexdigital.com'
              underline='none'
              sx={footerLinkSx}
            >
              info@fexdigital.com
            </Link>
            <Link
              component={RouterLink}
              to='/terms-of-service'
              underline='none'
              sx={footerLinkSx}
            >
              Terms of Service
            </Link>
            <Link
              component={RouterLink}
              to='/privacy-policy'
              underline='none'
              sx={footerLinkSx}
            >
              Privacy Policy
            </Link>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
