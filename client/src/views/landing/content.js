// content.js — copy for the public landing page. Every product claim here
// mirrors the Terms of Service (views/marketplace/legalContent.js): change a
// policy there and check this file too. Prices and payment links come from
// views/marketplace/catalog.js.

export const NAV_LINKS = [
  { label: 'Leads', href: '#leads' },
  { label: 'Verification', href: '#verified' },
  { label: 'Texting', href: '#texting' },
  { label: 'CRM', href: '#crm' },
  { label: 'FAQ', href: '#faq' },
];

// The hairline strip under the hero: one fact per cell, value in mono.
export const FACTS = [
  { value: '50–89', label: 'Consumer ages' },
  { value: '$5K–$500K', label: 'Coverage requested' },
  { value: '30 days', label: 'Exclusive to you' },
  { value: '6-digit', label: 'Text code verification' },
  { value: 'Real time', label: 'Delivery to CRM & dialer' },
];

// "Why agents switch": commodity lists vs FEX Digital, row by row.
export const COMPARISON = [
  {
    topic: 'Who else gets it',
    them: 'Often sold to several agents at once',
    us: 'One agent at a time, exclusive for 30 days',
  },
  {
    topic: 'Is the phone real',
    them: 'Rarely checked',
    us: 'Website leads confirm a 6-digit code texted to their cell',
  },
  {
    topic: 'What you know before dialing',
    them: 'Name and phone number',
    us: 'Up to 16 fields: age, height/weight, health, tobacco, budget, coverage, plan',
  },
  {
    topic: 'How fast it arrives',
    them: 'A spreadsheet, hours or days later',
    us: 'Pushed to your CRM and dialer the moment it comes in, plus a text alert',
  },
  {
    topic: 'If the number is bad',
    them: 'Your loss',
    us: 'Unverified Website leads with a bad number can be replaced within 7 days',
  },
  {
    topic: 'Follow-up',
    them: 'Manual',
    us: 'Optional AI assistant texts the lead and books the appointment',
  },
];

// The lead matrix. `catalog` points at a Stripe product in catalog.js;
// rows without one are sold from live inventory inside the CRM Marketplace.
export const LEAD_MATRIX = [
  {
    catalog: 'Website Leads',
    name: 'Website Leads',
    flagship: true,
    summary:
      'Seniors who requested a life insurance quote on GetSeniorQuotes.com.',
    fieldsLabel: '16 data fields included',
    fields: ['DOB', 'BMI', 'Health', 'Budget', 'Plan'],
    moreFields: 11,
    terms: 'Exclusive 30 days · Verified + Unverified mix',
  },
  {
    catalog: 'Instant Form Leads',
    name: 'Instant Form Leads',
    summary: 'GetSeniorQuotes-branded lead forms on Facebook and Instagram.',
    fieldsLabel: '5 basic fields',
    fields: ['Name', 'Email', 'Phone', 'State', 'Answers'],
    terms: 'Exclusive 30 days · All verified by Meta',
  },
  {
    catalog: 'Live Transfers',
    name: 'Live Transfers',
    summary:
      'Inbound callers from GetSeniorQuotes, connected straight to your phone.',
    fieldsLabel: 'Billed only on calls over 90 seconds',
    fields: [],
    terms: 'Offered to licensed agents in the caller’s state',
  },
  {
    name: 'Banked Leads',
    summary:
      'Website and Instant Form leads from the last 72 hours, never delivered to an agent.',
    fieldsLabel: 'Never issued',
    fields: [],
    terms: 'Exclusive · Final sale',
    inventory: 'Live inventory by state',
  },
  {
    name: 'Aged Leads',
    summary:
      'Website and Instant Form leads 31–90 or 91–180 days old, at a fraction of the fresh price.',
    fieldsLabel: 'Same data as fresh',
    fields: [],
    terms: 'Not exclusive · Final sale',
    inventory: 'Live inventory by state',
  },
];

// Website close rate by verification status. Source: sales recorded in the
// CRM for Website Leads issued Apr–Aug 2026 (agent_close_rates report).
export const VERIFIED_STATS = {
  verified: 12.1,
  unverified: 6.3,
  window:
    'Website Leads issued Apr–Aug 2026, sales recorded in the FEX Digital CRM',
};

export const STEPS = [
  {
    title: 'Order',
    body: 'Pick a lead type and pay securely through Stripe. No contract, no minimum term.',
  },
  {
    title: 'Set your states',
    body: 'Tell us where you are licensed and where leads should land: the FEX Digital CRM, Ringy, GHL, Sendblue or InsurDial.',
  },
  {
    title: 'Work leads live',
    body: 'Each lead arrives the moment it comes in, with a text alert to your cell. Your assistant can open the conversation for you.',
  },
  {
    title: 'Track and reorder',
    body: 'Mark sales, watch your rank on the leaderboard, and reorder or browse aged and banked inventory in the Marketplace.',
  },
];

export const CRM_FEATURES = [
  {
    key: 'leads',
    title: 'Leads',
    body: 'Every lead you buy, with its full quote details, ready to work. Request a replacement in one click when one qualifies.',
  },
  {
    key: 'inbox',
    title: 'Unified Inbox',
    body: 'Every text thread from your Sendblue line in one split view, unread first, so callbacks never slip.',
  },
  {
    key: 'business',
    title: 'Business & Policies',
    body: 'Clients, policies and premiums in one book, from first call to issued policy.',
  },
  {
    key: 'leaderboard',
    title: 'Leaderboards',
    body: 'Weekly and monthly champions, ranked on premium and sales.',
  },
  {
    key: 'insights',
    title: 'Insights & Cash Flow',
    body: 'See which lead sources become clients, and track income against expenses.',
  },
  {
    key: 'marketplace',
    title: 'Marketplace',
    body: 'Reorder fresh leads, or browse aged and banked inventory by state and age.',
  },
];

export const FAQ = [
  {
    q: 'What does “Verified” mean?',
    a: 'For Website Leads, the consumer entered a one-time code we texted to their cell when they asked for a quote. Instant Form Leads are verified through Meta’s instant form. Verification confirms the consumer controlled that phone at the time; it does not confirm identity, health or insurability.',
  },
  {
    q: 'Are the leads exclusive?',
    a: 'Website, Instant Form and Banked Leads go to one agent at a time. For 30 days after delivery we will not sell that lead to another agent. After 30 days a lead may be sold as an Aged Lead, and Aged Leads are not exclusive.',
  },
  {
    q: 'Which states can I buy?',
    a: 'Only the states where you hold an active life insurance license. Leads are routed by the licensed states on your account, and availability varies by state.',
  },
  {
    q: 'What if a lead has a bad number?',
    a: 'Unverified Website Leads with a fictitious, disconnected or unrelated number can be submitted for replacement from the CRM within 7 days. An approved request is credited as one replacement lead of the same type. Verified, Instant Form, Banked and Aged Leads and Live Transfers are final sale.',
  },
  {
    q: 'How are Live Transfers billed?',
    a: 'A transfer is offered to licensed agents with delivery turned on, and the first to accept is connected. One credit is used only when your connected call lasts more than 90 seconds. Calls you do not answer or accept are free.',
  },
  {
    q: 'Where do my leads go?',
    a: 'Straight to the FEX Digital CRM and to any Ringy, GHL, Sendblue or InsurDial account linked to your email, with a text alert to your cell.',
  },
  {
    q: 'Is there a contract?',
    a: 'No. Leads are bought per order. Sendblue Line and Bot subscriptions are monthly and can be cancelled any time, effective at the end of the billing period.',
  },
];
