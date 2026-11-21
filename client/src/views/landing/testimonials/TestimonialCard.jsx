// TestimonialCard.jsx
// One agent review. Takes the review and nothing else: no sx, className or
// style, so its look always comes from testimonialStyles.js. Any disclosure
// sits above the footer, so footers line up across a row.
import { useState } from 'react';
import Box from '@mui/material/Box';
import { TESTIMONIAL_STYLES as S } from './testimonialStyles';
import { byline, initials, normalizeTestimonial } from './testimonials';

function Avatar({ name, photo }) {
  const [failed, setFailed] = useState(!photo);
  return (
    <Box sx={S.avatar} aria-hidden='true'>
      {failed ? (
        initials(name)
      ) : (
        <img
          src={photo}
          alt=''
          loading='lazy'
          onError={() => setFailed(true)}
        />
      )}
    </Box>
  );
}

export default function TestimonialCard({ testimonial }) {
  const t = normalizeTestimonial(testimonial);
  const sub = byline(t);
  return (
    <Box component='figure' sx={S.card}>
      <Box sx={S.mark} aria-hidden='true'>
        “
      </Box>
      <Box component='blockquote' sx={S.quote}>
        {t.quote}
      </Box>
      {t.disclosure && (
        <Box component='p' sx={S.disclosure}>
          {t.disclosure}
        </Box>
      )}
      <Box component='figcaption' sx={S.footer}>
        <Avatar name={t.name} photo={t.photo} />
        <Box>
          <Box component='cite' sx={{ ...S.name, display: 'block' }}>
            {t.name}
          </Box>
          {sub && <Box sx={S.byline}>{sub}</Box>}
        </Box>
      </Box>
    </Box>
  );
}
