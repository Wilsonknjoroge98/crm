// TermsOfService.jsx
import { ThemeProvider, Typography, Box, Stack, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import theme from './theme.js';
import { MARKETPLACE_PATH } from './api.js';

const BLUE = '#233dff';
const G100 = '#f3f4f6';
const G200 = '#e5e7eb';
const G400 = '#9ca3af';
const G500 = '#6b7280';
const G600 = '#4b5563';
const G900 = '#111827';

const sections = [
  {
    title: '1) Nature of Leads',
    body: `The Company generates and sells consumer leads consisting of contact information and expressed interest data from individuals who have voluntarily submitted inquiries regarding life insurance products ("Leads"). Agent acknowledges and agrees that:\n\n- Leads are sold on an as-is basis and represent consumer-expressed interest only, not a guarantee of purchase intent, eligibility, or insurability.\n- The Company makes no representation or warranty regarding the accuracy, completeness, fitness for purpose, or exclusivity of any Lead.\n- Lead quality, contact rates, and conversion outcomes may vary and are not guaranteed.\n- Leads may be sold to multiple agents.`,
  },
  {
    title: '2) Payment & Purchase Terms',
    body: `Agent agrees to the following payment terms:\n\nAll Lead purchases are processed through Stripe. By completing a transaction, Agent agrees to the applicable per-lead or subscription pricing displayed at the time of purchase.\n\nAgent authorizes the Company to charge the payment method on file for all Lead purchases initiated by Agent.`,
  },
  {
    title: '3) Refund & Replacement Policy',
    body: `**Lead Types.** The Company offers two lead types:\n\n**Text-Verified Leads:** Leads that have been confirmed via text message prior to delivery. Text-verified leads are final sale and are not eligible for refund or replacement under any circumstances.\n\n**Non-Text-Verified Leads:** Leads that have not been text-verified prior to delivery. Non-text-verified leads may be eligible for a non-cash replacement subject to the conditions set forth in this Section 3.\n\n**Replacement Schedule.** Lead replacements for non-text-verified leads are processed on Wednesdays and Sundays only. To be considered for replacement, a lead must be marked as bad within the same calendar week it was received (Sunday through Saturday) and prior to the applicable processing day. \n\n**Eligibility Criteria.** A non-text-verified lead is eligible for replacement only if it meets one or more of the following conditions and is properly documented in the Notes section of the Agent's Ringy CRM account:\n\n- The lead is clearly fictitious (e.g., submitted under an obviously fake name such as "John Doe," "Mickey Mouse," or similar);\n- The phone number provided belongs to a business or to an individual with no apparent connection to the lead record; or\n- The phone number is disconnected, and Agent can demonstrate that a reasonable effort was made to locate an alternate number using a skip-tracing tool such as TruePeopleSearch, FastPeopleSearch, or a comparable service. Documentation must include the alternative numbers identified and confirmation that each was attempted, all recorded in the Ringy Notes field.`,
  },
  {
    title: '4) Limitation of Liability & Disclaimer',
    body: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:\n\nFINAL EXPENSE DIGITAL, LLC SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED TO AGENT'S USE OF LEADS OR AGENT'S INTERACTIONS WITH PROSPECTS OR CLIENTS.\n\nThe Company bears no responsibility for any regulatory complaints, fines, penalties, or legal actions arising from Agent's conduct in connection with Leads.\n\nThe Company's total aggregate liability to Agent under this Agreement, regardless of the cause of action or theory of liability, shall not exceed the greater of (a) the amount actually paid by Agent for the specific Lead(s) directly giving rise to the claim, or (b) one hundred dollars ($100.00).\n\nThe Company provides no warranties, express or implied, including any implied warranties of merchantability or fitness for a particular purpose, with respect to the Leads.`,
  },
  {
    title: '5) Indemnification',
    body: `Agent agrees to indemnify, defend, and hold harmless Final Expense Digital, LLC, its owners, officers, employees, contractors, and affiliates from and against any and all claims, demands, losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:\n\n- Agent's use of Leads purchased under this Agreement;\n- Agent's communications or interactions with any prospect or client;\n- Agent's violation of any applicable law, regulation, or licensing requirement;\n- Any misrepresentation made by Agent to a prospect or client; or\n- Agent's breach of any term of this Agreement.`,
  },
  {
    title: '6) Compliance with TCPA & Applicable Laws',
    body: `Agent is solely responsible for evaluating, confirming, and maintaining compliance with the TCPA, applicable Do Not Call regulations, and all state and federal telemarketing laws in connection with Agent's outreach to Leads. The Company assumes no responsibility for Agent's contact practices or regulatory compliance.`,
  },
  {
    title: '7) Prohibited Conduct',
    body: `Agent agrees not to:\n\n- Harass, mislead, or engage in deceptive practices with any Lead or prospect;\n- Misrepresent the Company, or any insurance product to a prospect;\n- Use Lead data for any purpose inconsistent with this Agreement; or\n- Resell or redistribute Lead data to any third party.\n\nThe Company reserves the right to immediately terminate Agent's access to Lead purchasing upon discovery of any prohibited conduct, without refund.`,
  },
  {
    title: '8) Term & Termination',
    body: `This Agreement is effective upon Agent's first Lead purchase and continues until terminated. Either party may terminate this Agreement at any time upon written notice. Termination does not affect Agent's obligations with respect to Leads previously purchased or any payment obligations then due. Sections 4, 5, 6, and 9 survive termination.`,
  },
  {
    title: '9) Governing Law & Dispute Resolution',
    body: `This Agreement shall be governed by and construed in accordance with the laws of the State of Wyoming, without regard to its conflict of law principles. Any dispute arising under this Agreement shall be resolved by binding arbitration under the rules of the American Arbitration Association, and judgment on the award may be entered in any court of competent jurisdiction. The parties waive any right to a jury trial.`,
  },
  {
    title: '10) Entire Agreement',
    body: `This Agreement constitutes the entire agreement between the parties with respect to the purchase of Leads and supersedes all prior discussions, understandings, and agreements. This Agreement may be amended only by a written instrument signed by authorized representatives of both parties. If any provision of this Agreement is found unenforceable, the remaining provisions shall continue in full force and effect.`,
  },
];

function parseBold(line) {
  const parts = line.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return line;
  return parts.map((part, j) =>
    j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
  );
}

function renderBody(text) {
  const lines = text.split('\n');
  const segments = [];
  let bulletGroup = null;

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!bulletGroup) {
        bulletGroup = [];
        segments.push({ type: 'bullets', items: bulletGroup });
      }
      bulletGroup.push(line.slice(2));
    } else {
      bulletGroup = null;
      segments.push(
        line === '' ? { type: 'break' } : { type: 'text', content: line },
      );
    }
  }

  return segments.map((seg, i) => {
    if (seg.type === 'break') return <br key={i} />;
    if (seg.type === 'bullets') {
      return (
        <Box component='ul' key={i} sx={{ pl: 3, mt: 0.5, mb: 0.5 }}>
          {seg.items.map((item, j) => (
            <Box component='li' key={j} sx={{ mb: 0.5 }}>
              {parseBold(item)}
            </Box>
          ))}
        </Box>
      );
    }
    return <span key={i}>{parseBold(seg.content)}</span>;
  });
}

export default function TermsOfService() {
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: '100%', bgcolor: '#fff' }}>
        {/* Nav */}
        <Box
          component='header'
          sx={{
            borderBottom: '1px solid',
            borderColor: G100,
            position: 'sticky',
            top: 0,
            bgcolor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            zIndex: 50,
          }}
        >
          <Box
            sx={{
              maxWidth: 1152,
              mx: 'auto',
              px: 3,
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Link component={RouterLink} to={MARKETPLACE_PATH}>
              <Box
                component='img'
                src='/fexdigital-logo.svg'
                alt='Final Expense Digital'
                sx={{ height: 36 }}
              />
            </Link>
            <Link
              href='mailto:info@fexdigital.com'
              underline='none'
              sx={{
                color: G500,
                fontSize: '0.875rem',
                '&:hover': { color: G900 },
                transition: 'color 0.15s',
              }}
            >
              Contact Us
            </Link>
          </Box>
        </Box>

        {/* Content */}
        <Box sx={{ maxWidth: 768, mx: 'auto', px: 3, pt: 8, pb: 12 }}>
          <Typography
            sx={{
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 700,
              color: G900,
              mb: 1.5,
            }}
          >
            Lead Purchase Agreement
          </Typography>
          <Typography
            sx={{ fontSize: '0.875rem', color: G500, lineHeight: 1.8, mb: 6 }}
          >
            This Lead Purchase Agreement ("Agreement") is entered into between
            Final Expense Digital, LLC ("Company"), and the undersigned licensed
            insurance agent or agency ("Agent") who purchases leads through the
            Company's platform.
          </Typography>

          <Stack spacing={5}>
            {sections.map((section) => (
              <Box key={section.title}>
                <Typography
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: G900,
                    mb: 1.5,
                  }}
                >
                  {section.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.875rem',
                    color: G500,
                    lineHeight: 1.9,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {renderBody(section.body)}
                </Typography>
              </Box>
            ))}
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
    </ThemeProvider>
  );
}
