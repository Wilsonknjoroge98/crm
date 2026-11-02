// catalog.js — products sold through Stripe payment links, shared by the
// Marketplace hub (/purchase-leads) and the public landing page (/), so a
// price or payment link changes in one place.
import { BORDER, GOLD, INK } from './ui.jsx';

// Real-time products, in order of sales volume. Fresh Leads is the flagship,
// so it alone gets the gold stripe and gold CTA.
export const CAMPAIGNS = [
  {
    title: 'Website Leads',
    badge: '★ Popular',
    accent: GOLD,
    price: 39,
    unit: 'lead',
    description: 'High-intent leads generated on GetSeniorQuotes',
    cta: 'Order Website Leads',
    ctaColor: 'action',
    href: 'https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p',
  },
  {
    title: 'Instant Form Leads',
    accent: BORDER,
    price: 25,
    unit: 'lead',
    description: 'GSQ branded Meta instant form leads. ',
    cta: 'Order Instant Form Leads',
    href: 'https://buy.stripe.com/3cIdR92i033NboS4696Ri0A',
  },
  {
    title: 'Live Transfers',
    accent: BORDER,
    price: 60,
    unit: 'transfer',
    description:
      'Live inbound calls from the GSQ website. Charged only if the call lasts 90+ seconds.',
    cta: 'Order Live Transfers',
    href: 'https://buy.stripe.com/dRm00j7CkgUDdx01Y16Ri0b',
  },
];

// Monthly subscriptions. The Bot texts from the Line, so they sit side by
// side as a pair.
export const SUBSCRIPTIONS = [
  {
    title: 'Sendblue Line',
    accent: INK,
    price: 155,
    unit: 'month',
    description:
      'Boost response rates, drive customer engagement, and convert more leads. ',
    cta: 'Subscribe to Line',
    href: 'https://buy.stripe.com/eVq7sL8GodIrakO4696Ri0v',
  },
  {
    title: 'Sendblue Bot',
    accent: INK,
    price: 35,
    unit: 'month',
    description:
      'AI-powered assistant that handles lead follow-up and appointment booking in sendblue.',
    cta: 'Add Bot Automation',
    ctaVariant: 'outlined',
    href: 'https://buy.stripe.com/bJedR97Ck0VF1Oi0TX6Ri0B',
  },
];

export const catalogItem = (title) =>
  [...CAMPAIGNS, ...SUBSCRIPTIONS].find((item) => item.title === title);
