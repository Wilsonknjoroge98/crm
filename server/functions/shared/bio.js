// Server copy of client/src/utils/bio.js. Keep the two in sync (a test checks they agree).
/* eslint-disable max-len */
// Producer Page bio: 4 preset bios plus a custom option.
// One bio per agent, shown on every producer page (GSQ and Keyley), so the
// presets stay brand-neutral and fit both lead types.
// Keep in sync with client/src/utils/bio.js.

const BIO_MAX = 200;
const CUSTOM_BIO_MIN = 60;

const BIO_PRESETS = [
  {
    id: 'family-first',
    label: 'Family first',
    text: "I help families protect the people they love most. I'll compare plans from multiple companies to find coverage that fits your budget.",
  },
  {
    id: 'straight-talk',
    label: 'Straight talk',
    text: "No pressure and no jargon. I'll explain your options in plain English, compare rates from multiple companies and let you decide what's right for your family.",
  },
  {
    id: 'experienced-guide',
    label: 'Experienced guide',
    text: "I've helped many families put the right protection in place. I'll walk you through your options, compare multiple companies and help you choose with confidence.",
  },
  {
    id: 'why-i-do-this',
    label: 'Why I do this',
    text: 'I got into this work after seeing what a family goes through without a plan. Now I help people get the right coverage at a price that makes sense.',
  },
];

const COMPANY_REASON = 'Leave out company names (ours or any insurance company).';

// Our brands, matched with spaces, dots and dashes removed ("FEX-Digital", "GetSeniorQuotes.com").
const OUR_BRANDS = ['getseniorquotes', 'fexdigital', 'finalexpensedigital', 'keyley'];
const BRAND_SQUASHED = /\bg\W?s\W?q\b/i; // GSQ, G.S.Q, G S Q

// Phrases a custom bio may not contain, with the reason shown to the agent.
// Carrier names are written in the form that cannot be an everyday word
// ("nationwide life", not "nationwide").
const BLOCKED = [
  {
    reason: COMPANY_REASON,
    words: [
      'mutual of omaha', 'transamerica', 'americo', 'aetna', 'aig', 'corebridge',
      'royal neighbors', 'foresters financial', 'liberty bankers', 'gerber life',
      'prosperity life', 'ethos life', 'lincoln financial', 'banner life',
      'protective life insurance company', 'prudential', 'john hancock',
      'american amicable', 'sbli', 'baltimore life', 'cica life', 'f&g',
      'fidelity & guaranty', 'columbian mutual', 'sagicor', 'north american company',
      'nationwide life', 'nationwide insurance', 'pacific life', 'securian', 'assurity',
      'trinity life', 'great western insurance', 'senior life insurance company',
      'occidental life', 'united home life', 'kemper', 'state farm', 'new york life',
      'globe life', 'colonial penn', 'aflac', 'foresters', 'gerber', 'metlife', 'cigna',
      'humana', 'fidelity life', 'mutual omaha', 'lincoln life', 'lincoln heritage',
    ],
  },
  {
    reason: "Leave out promises about price or approval (like 'guaranteed', 'lowest', 'best rate', 'free').",
    words: [
      'guarantee', 'guaranteed', 'guarantees', 'lowest', 'cheapest', 'best rate',
      'best rates', 'best price', 'best prices', 'best deal', 'approval', 'approvals',
      'get approved', 'gets approved', 'be approved', 'getting approved', 'always approved',
      'everyone approved', 'everyone is approved', 'approved fast', 'approved instantly',
      'approved in minutes', 'approved today', 'instant approval',
      'free', 'no cost',
    ],
  },
  {
    reason: "Leave out health or exam claims (like 'no exam').",
    words: [
      'no exam', 'no exams', 'no medical', 'no health exam', 'no health questions',
      'no questions asked', 'no physical', 'no blood work', 'no needles',
      'without an exam', 'without a medical exam', 'without a physical',
    ],
  },
  {
    reason: 'Leave out banks, lenders and loans.',
    words: ['bank', 'banks', 'lender', 'lenders', 'loan', 'loans', 'mortgage company'],
  },
];

// Everyday phrases that contain a blocked word but promise nothing.
const HARMLESS = [/feel free/gi, /free time/gi, /\b[a-z]+-free\b/gi, /break(ing|s)? the bank/gi, /outer banks/gi];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BLOCKED_RES = BLOCKED.map(({ reason, words }) => ({
  reason,
  re: new RegExp(`(^|[^a-z0-9&])(${words.map(escape).join('|')})(?=$|[^a-z0-9])`, 'i'),
}));

const LINK = /https?:|www\.|@|\b[a-z0-9-]+\.(com|net|org|co|us|io|info|biz|me|ly|app|site|page|link|life|insurance|agency)\b/i;
// Phone shapes only, so years and counts ("since 2012. 300 families", "800 families") pass.
const PHONE = /(\+?\b1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b|\b\d{3}[.-]\d{4}\b|(\b1\W?|\()8(00|33|44|55|66|77|88)\)?[\s.-]?[a-z]{4,}|\b8(00|33|44|55|66|77|88)[.-][a-z]{4,}/i;

const normalize = (text) =>
  String(text ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeBio = normalize;

// The preset this bio matches exactly, or null (a custom bio).
const presetFor = (bio) => {
  const text = normalize(bio);
  return BIO_PRESETS.find((p) => p.text === text) || null;
};

// null when the bio may be saved, else the first problem to show the agent.
const bioProblem = (bio) => {
  const text = normalize(bio);
  if (!text) {
    return null; // an empty bio clears it (the page shows its default line)
  }
  if (text.length > BIO_MAX) {
    return `Keep it to ${BIO_MAX} characters or fewer.`;
  }
  if (presetFor(text)) {
    return null;
  }
  if (text.length < CUSTOM_BIO_MIN) {
    return `Write at least ${CUSTOM_BIO_MIN} characters, or pick one of the bios above.`;
  }
  const squashed = text.toLowerCase().replace(/[^a-z]/g, '');
  if (OUR_BRANDS.some((b) => squashed.includes(b)) || BRAND_SQUASHED.test(text)) {
    return COMPANY_REASON;
  }
  if (LINK.test(text)) {
    return 'Leave out links and e-mail addresses.';
  }
  if (PHONE.test(text)) {
    return 'Leave out phone numbers.';
  }
  let scan = text;
  for (const re of HARMLESS) {
    scan = scan.replace(re, ' ');
  }
  scan = scan.replace(/-/g, ' '); // "no-exam" reads as "no exam"
  const hit = BLOCKED_RES.find(({ re }) => re.test(scan));
  return hit ? hit.reason : null;
};

module.exports = {
  BIO_MAX,
  CUSTOM_BIO_MIN,
  BIO_PRESETS,
  normalizeBio,
  presetFor,
  bioProblem,
};
