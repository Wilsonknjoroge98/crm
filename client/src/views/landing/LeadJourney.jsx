// LeadJourney.jsx
// "How it works": the lead's trip, in order. They pick a quote, you get the
// record, they meet you on your producer page, and we keep you posted. It
// opens the page, ahead of the fresh and aged numbers, because it answers
// "where are these coming from?" for both products.
import Box from '@mui/material/Box';
import { HAIRLINE } from './blocks';
import AfterTheLead from './AfterTheLead';
import ProducerPage from './ProducerPage';
import SampleLeadSection from './SampleLead';

const LEAD_CHIPS = [
  [
    'Age 50–89',
    'DOB',
    'BMI',
    'Health',
    'Budget',
    'Plan',
    'Goal: Funeral · Legacy · Mortgage',
  ],
  ['Text verified: Yes / No', 'Text alert + CRM push', 'Filter by state'],
];

export default function LeadJourney() {
  return (
    <Box
      id='how-it-works'
      sx={{ width: '100%', borderTop: `1px solid ${HAIRLINE}` }}
    >
      <SampleLeadSection
        eyebrow='Where your leads come from'
        title='A full quote record, not a name and number'
        intro='Your lead compares live rates, picks a plan and tells us why. You get all of it.'
        chipRows={LEAD_CHIPS}
      />
      <ProducerPage />
      <AfterTheLead />
    </Box>
  );
}
