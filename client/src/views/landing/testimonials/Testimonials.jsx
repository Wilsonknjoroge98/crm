// Testimonials.jsx
// The reviews section: a heading, a grid of TestimonialCards and the results
// disclaimer, which always shows. Copy and reviews come in as data; the look
// comes from testimonialStyles.js only. With no reviews to show (production
// before any are approved) the section renders nothing.
import Box from '@mui/material/Box';
import { Section } from '../blocks';
import TestimonialCard from './TestimonialCard';
import { TESTIMONIAL_STYLES as S } from './testimonialStyles';
import {
  RESULTS_DISCLAIMER,
  TESTIMONIALS,
  visibleTestimonials,
} from './testimonials';

export default function Testimonials({
  id = 'testimonials',
  eyebrow = 'From agents on FEX Digital',
  title = 'In their own words',
  intro,
  testimonials = TESTIMONIALS,
}) {
  const shown = visibleTestimonials(testimonials, {
    includeDrafts: import.meta.env.DEV,
  });
  if (!shown.length) return null;

  return (
    <Box sx={S.band}>
      <Section id={id} eyebrow={eyebrow} title={title} intro={intro}>
        <Box component='ul' sx={S.grid}>
          {shown.map((t) => (
            <Box component='li' key={t.id}>
              <TestimonialCard testimonial={t} />
            </Box>
          ))}
        </Box>
        <Box component='p' sx={S.disclaimer}>
          {RESULTS_DISCLAIMER}
        </Box>
      </Section>
    </Box>
  );
}
