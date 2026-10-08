// PrivacyPolicy.jsx
import { Typography, Box, Stack, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { MARKETPLACE_PATH } from './api.js';

const G100 = '#f3f4f6';
const G400 = '#9ca3af';
const G500 = '#6b7280';
const G600 = '#4b5563';
const G900 = '#111827';

export default function PrivacyPolicy() {
  return (
    <>
      <Box sx={{ width: '100%' }}>
        {/* Content */}
        <Box sx={{ maxWidth: 768, mx: 'auto', px: 3, pt: 4, pb: 8 }}>
          <Typography variant='h4' sx={{ mb: 4 }}>
            Privacy Policy
          </Typography>

          <Stack spacing={3}>
            <Typography
              sx={{ fontSize: '0.875rem', color: G500, lineHeight: 1.9 }}
            >
              We value your privacy. When you voluntarily provide your name and
              phone number when purchasing leads, we use this information for
              the purpose of contacting you to discuss your lead requirements
              and to improve our services.
            </Typography>

            <Typography
              sx={{ fontSize: '0.875rem', color: G500, lineHeight: 1.9 }}
            >
              We do not share, sell, or rent your personal information to any
              third parties. Your contact information is stored securely and
              only accessible by authorized personnel.
            </Typography>

            <Typography
              sx={{ fontSize: '0.875rem', color: G500, lineHeight: 1.9 }}
            >
              You may request to update or delete your information at any time
              by contacting us. By submitting your contact details, you consent
              to receive communication regarding our services.
            </Typography>

            <Typography
              sx={{ fontSize: '0.875rem', color: G500, lineHeight: 1.9 }}
            >
              If you have any questions about this privacy policy, please
              contact us directly.
            </Typography>
          </Stack>
        </Box>

        {/* Footer */}
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
                sx={{
                  color: G400,
                  fontSize: '0.875rem',
                  '&:hover': { color: G600 },
                  transition: 'color 0.15s',
                }}
              >
                info@fexdigital.com
              </Link>
              <Link
                component={RouterLink}
                to={`${MARKETPLACE_PATH}/terms-of-service`}
                underline='none'
                sx={{
                  color: G400,
                  fontSize: '0.875rem',
                  '&:hover': { color: G600 },
                  transition: 'color 0.15s',
                }}
              >
                Terms of Service
              </Link>
              <Link
                component={RouterLink}
                to={`${MARKETPLACE_PATH}/privacy-policy`}
                underline='none'
                sx={{
                  color: G400,
                  fontSize: '0.875rem',
                  '&:hover': { color: G600 },
                  transition: 'color 0.15s',
                }}
              >
                Privacy Policy
              </Link>
            </Stack>
          </Box>
        </Box>
      </Box>
    </>
  );
}
