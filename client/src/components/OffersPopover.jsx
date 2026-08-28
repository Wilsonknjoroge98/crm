import {
  Menu,
  Box,
  Stack,
  Typography,
  Divider,
  Chip,
  Link,
} from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

// Not a Stripe discount — a standing referral incentive, so it's hardcoded
// rather than fetched. Agents get 2 free fresh leads per positive Google
// review a client leaves for GetSeniorQuotes.com.
export const FREE_LEAD_OFFERS = [
  {
    id: 'free-leads-google-review',
    title: '2 Fresh Leads',
    description: 'When a client leaves a positive Google review',
    linkLabel: 'Here',
    linkUrl: 'https://g.page/r/Cae_g-5KWKUtEAE/review',
  },
];

const OfferItem = ({ offer }) => {
  const expiresEst = offer.expires_at
    ? dayjs(offer.expires_at).tz('America/New_York')
    : null;

  return (
    <Box sx={{ px: 2.5, py: 2 }}>
      <Stack spacing={0.75}>
        <Typography
          variant='subtitle1'
          sx={{
            fontFamily: '"Libre Baskerville", serif',
            fontWeight: 700,
            fontSize: '1rem',
            lineHeight: 1.25,
            color: 'text.primary',
          }}
        >
          {offer.title}
        </Typography>

        {offer.description && (
          <Typography
            variant='body2'
            noWrap
            sx={{
              color: 'text.secondary',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
            }}
          >
            {offer.description}
          </Typography>
        )}

        {(offer.code || offer.expires_at || offer.linkUrl) && (
          <Stack
            direction='row'
            spacing={1.25}
            alignItems='center'
            sx={{ pt: 0.75 }}
          >
            {offer.code && (
              <Chip
                label={offer.code}
                size='small'
                sx={{
                  fontFamily: 'ui-monospace, "SF Mono", monospace',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  borderRadius: '4px',
                  bgcolor: 'grey.50',
                  color: 'text.primary',
                  border: '1px solid',
                  borderColor: 'grey.300',
                  height: 22,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
            )}

            {offer.linkUrl && (
              <Link
                href={offer.linkUrl}
                target='_blank'
                rel='noopener noreferrer'
                underline='hover'
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  color: 'accent.main',
                }}
              >
                {offer.linkLabel || 'Learn More'}
                <NorthEastIcon sx={{ fontSize: '0.7rem' }} />
              </Link>
            )}

            {offer.expires_at && (
              <Typography
                variant='caption'
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.72rem',
                  letterSpacing: '0.02em',
                }}
              >
                Expires {expiresEst.format('MMM D, h:mm A')}{' '}
                {expiresEst.offsetName('short')}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>
    </Box>
  );
};

export default function OffersPopover({ anchorEl, offers = [], onClose }) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      PaperProps={{
        elevation: 4,
        sx: {
          width: 320,
          maxHeight: 420,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.06)',
          p: 0,
        },
      }}
    >
      {/* Discounts */}
      <Box sx={{ px: 2.5, py: 1.75 }}>
        <Typography
          variant='overline'
          sx={{
            letterSpacing: '0.14em',
            color: 'text.secondary',
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Discounts
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'grey.100' }} />

      <Stack divider={<Divider sx={{ borderColor: 'grey.100' }} />}>
        {offers.map((offer) => (
          <OfferItem key={offer.id} offer={offer} />
        ))}

        {offers.length === 0 && (
          <Box sx={{ px: 3, py: 4 }}>
            <Typography
              variant='body2'
              color='text.secondary'
              textAlign='center'
              sx={{ fontStyle: 'italic', fontSize: '0.85rem' }}
            >
              No active discounts right now.
            </Typography>
          </Box>
        )}
      </Stack>

      {/* Free Leads */}
      <Box sx={{ px: 2.5, py: 1.75 }}>
        <Typography
          variant='overline'
          sx={{
            letterSpacing: '0.14em',
            color: 'text.secondary',
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Free Leads
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'grey.100' }} />

      <Stack divider={<Divider sx={{ borderColor: 'grey.100' }} />}>
        {FREE_LEAD_OFFERS.map((offer) => (
          <OfferItem key={offer.id} offer={offer} />
        ))}
      </Stack>
    </Menu>
  );
}
