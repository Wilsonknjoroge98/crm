import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

const SERIF = '"Libre Baskerville", serif';
const SANS = '"Inter", sans-serif';
const MONO = '"JetBrains Mono", monospace';
const BORDER = '#E5E7EB';

export const FREE_LEAD_OFFERS = [
  {
    id: 'google-review-bounty',
    title: '2 Fresh Leads',
    badge: 'Review Bounty',
    description:
      'Earn 2 free verified leads when a client leaves a positive Google review.',
    actionLabel: 'Copy Review Link',
    url: 'https://g.page/r/Cae_g-5KWKUtEAE/review',
  },
];

const OffersPopover = ({ anchorEl, offers = [], onClose }) => {
  const [copiedCode, setCopiedCode] = useState(null);
  const open = Boolean(anchorEl);
  const totalCount = offers.length + FREE_LEAD_OFFERS.length;

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard write failed (blocked permission, insecure context, etc.) —
      // leave copiedCode untouched so the UI doesn't falsely claim success.
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: 360,
            p: 2,
            mt: 1,
            borderRadius: 3,
            bgcolor: '#FBFBFA',
            border: `1px solid ${BORDER}`,
            boxShadow:
              '0 12px 32px -4px rgba(5, 17, 24, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          },
        },
      }}
    >
      {/* Header */}
      <Stack
        direction='row'
        justifyContent='space-between'
        alignItems='center'
        mb={2}
      >
        <Stack direction='row' spacing={1} alignItems='center'>
          <LocalOfferOutlinedIcon
            sx={{ fontSize: '1.1rem', color: 'action.main' }}
          />
          <Typography
            fontFamily={SERIF}
            fontWeight={700}
            fontSize='0.95rem'
            color='primary.main'
          >
            Special Offers
          </Typography>
        </Stack>
        <Chip
          label={`${totalCount} Active`}
          size='small'
          sx={{
            height: 20,
            fontSize: '0.625rem',
            fontWeight: 700,
            bgcolor: 'success.light',
            color: 'success.main',
            borderRadius: 1,
          }}
        />
      </Stack>

      <Stack spacing={1.5}>
        {/* Dynamic Discount Offers */}
        {offers.length > 0 ? (
          offers.map((offer) => (
            <Card
              key={offer.id || offer.code}
              variant='outlined'
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#FFFFFF',
                borderColor: BORDER,
                borderTop: '3px solid #D4AF37',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              }}
            >
              <Typography
                variant='caption'
                sx={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: '0.65rem',
                  letterSpacing: '0.06em',
                  color: '#B78103',
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                {offer.badge || 'Discount'}
              </Typography>

              <Typography
                variant='h6'
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: 'primary.main',
                }}
              >
                {offer.title || (
                  <>
                    <Box component='span' sx={{ fontFamily: MONO, mr: 0.5 }}>
                      {offer.discount || '25%'}
                    </Box>
                    Off
                  </>
                )}
              </Typography>

              <Typography
                variant='caption'
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  my: 1,
                  whiteSpace: 'pre-line',
                }}
              >
                {offer.description ||
                  '91–180 Day Aged Leads (Verified & Unverified).'}
              </Typography>

              <Stack
                direction='row'
                justifyContent='space-between'
                alignItems='center'
                mt={1.5}
                pt={1.25}
                sx={{ borderTop: '1px solid #F0F0F0' }}
              >
                <Tooltip
                  title={
                    copiedCode === (offer.code || 'RAS25')
                      ? 'Copied!'
                      : 'Click to copy code'
                  }
                >
                  <Button
                    size='small'
                    variant='outlined'
                    onClick={() => handleCopy(offer.code || 'RAS25')}
                    endIcon={
                      copiedCode === (offer.code || 'RAS25') ? (
                        <CheckRoundedIcon
                          sx={{
                            fontSize: '0.75rem !important',
                            color: 'success.main',
                          }}
                        />
                      ) : (
                        <ContentCopyIcon
                          sx={{ fontSize: '0.75rem !important' }}
                        />
                      )
                    }
                    sx={{
                      py: 0.25,
                      px: 1,
                      fontSize: '0.75rem',
                      fontFamily: MONO,
                      fontWeight: 700,
                      color: 'primary.main',
                      bgcolor: '#FFFDF5',
                      borderColor:
                        copiedCode === (offer.code || 'RAS25')
                          ? 'success.main'
                          : 'rgba(212, 175, 55, 0.4)',
                      borderStyle: 'dashed',
                      borderRadius: 1,
                      '&:hover': {
                        borderColor: '#D4AF37',
                        bgcolor: '#FFF9E6',
                      },
                    }}
                  >
                    {offer.code || 'RAS25'}
                  </Button>
                </Tooltip>

                <Button
                  size='small'
                  disabled={!offer.linkUrl}
                  href={offer.linkUrl || undefined}
                  target='_blank'
                  rel='noopener noreferrer'
                  endIcon={
                    <ArrowForwardRoundedIcon
                      sx={{ fontSize: '0.85rem !important' }}
                    />
                  }
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'primary.main',
                    p: 0,
                    '&:hover': {
                      bgcolor: 'transparent',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {offer.linkLabel || 'Shop Leads'}
                </Button>
              </Stack>
            </Card>
          ))
        ) : (
          <Card
            variant='outlined'
            sx={{
              p: 3,
              borderRadius: 2,
              bgcolor: '#FFFFFF',
              borderColor: BORDER,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
              textAlign: 'center',
            }}
          >
            <Typography
              variant='body2'
              sx={{ color: 'text.secondary', fontStyle: 'italic' }}
            >
              No active discounts right now.
            </Typography>
          </Card>
        )}

        {/* Free Lead Offers */}
        {FREE_LEAD_OFFERS.map((freeOffer) => (
          <Card
            key={freeOffer.id}
            variant='outlined'
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: '#FFFFFF',
              borderColor: BORDER,
              borderTop: '3px solid #3F6F5B',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <Typography
              variant='caption'
              sx={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: '0.65rem',
                letterSpacing: '0.06em',
                color: 'success.main',
                textTransform: 'uppercase',
                display: 'block',
                mb: 0.5,
              }}
            >
              {freeOffer.badge}
            </Typography>

            <Typography
              variant='h6'
              sx={{
                fontFamily: SERIF,
                fontWeight: 700,
                lineHeight: 1.2,
                color: 'primary.main',
              }}
            >
              {freeOffer.title}
            </Typography>

            <Typography
              variant='caption'
              sx={{ color: 'text.secondary', display: 'block', my: 1 }}
            >
              {freeOffer.description}
            </Typography>

            <Button
              fullWidth
              size='small'
              variant='outlined'
              onClick={() => handleCopy(freeOffer.url)}
              endIcon={
                copiedCode === freeOffer.url ? (
                  <CheckRoundedIcon
                    sx={{
                      fontSize: '0.85rem !important',
                      color: 'success.main',
                    }}
                  />
                ) : (
                  <ContentCopyIcon sx={{ fontSize: '0.85rem !important' }} />
                )
              }
              sx={{
                mt: 1,
                py: 0.5,
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'primary.main',
                borderColor:
                  copiedCode === freeOffer.url ? 'success.main' : BORDER,
                bgcolor: '#F9FAFB',
                borderRadius: 1,
                '&:hover': { bgcolor: '#FFFFFF', borderColor: '#D1D5DB' },
              }}
            >
              {copiedCode === freeOffer.url ? 'Copied!' : freeOffer.actionLabel}
            </Button>
          </Card>
        ))}
      </Stack>
    </Popover>
  );
};

export default OffersPopover;
