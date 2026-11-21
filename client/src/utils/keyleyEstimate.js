// Keyley estimate for agents: rebuilds the same PDF the lead downloaded on the
// Keyley site, from the fields the CRM already stores on the lead. Nothing is
// stored or emailed; the PDF is built in the agent's browser.
//
// The PDF code is a verbatim copy of the funnel's (src/vendor/keyley/snapshot.ts).
// This file only maps a CRM lead row to that code's input.
//
// COLUMN NAMES: the Keyley mortgage columns come from Wilson's
// add_lead_mortgage_columns migration (not in this repo yet). They are read
// below as the snake_case of what the funnel sends (keyley/crm.js mortgageFields),
// with the camelCase name as a fallback. If a column is named differently, fix it
// in COLUMNS only.

export const KEYLEY_CALL = { number: '+18338927535', digits: '1' }; // same as the funnel
export const SHOW_VALUE_MIN_CONFIDENCE = 70; // the funnel shows home value and equity only at or above this

const COLUMNS = {
  balance: ['mortgage_balance', 'mortgageBalance'],
  yearsLeft: ['mortgage_years_left', 'mortgageYearsLeft'],
  term: ['term_years', 'termYears'],
  street: ['street_address', 'streetAddress'],
  city: ['city'],
  zip: ['zip'],
  homeValue: ['home_value', 'homeValue'],
  valueConfidence: ['home_value_confidence', 'homeValueConfidence'],
  // The CRM's ingest (integrations/GSQ.js parsePremium) stores a "$119-$154" range as
  // premium_min / premium_max and leaves premium null.
  premiumLow: ['premium_min', 'premium_low', 'premiumLow'],
  premiumHigh: ['premium_max', 'premium_high', 'premiumHigh'],
};

const pick = (row, keys) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

const num = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};

const STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
export const stateAbbr = (state) => {
  const s = String(state || '').trim();
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();
  return STATES[s.toLowerCase()] || '';
};

const isKeyley = (value) => /keyley/i.test(String(value || ''));
/** A lead that came from the Keyley site (by vendor, brand or lead type). */
export const isKeyleyLead = (row) =>
  isKeyley(row?.lead_vendor_name) || isKeyley(row?.brand) || isKeyley(row?.lead_type);

// "$119-$154", "$119 - $154", "$119 – $154" or "$119" -> { low, high }
export const parsePremium = (premium) => {
  const parts = String(premium || '').match(/\d[\d,]*(\.\d+)?/g);
  if (!parts) return null;
  const [low, high = low] = parts.map((p) => Number(p.replace(/,/g, '')));
  return low > 0 && high >= low ? { low: Math.round(low), high: Math.round(high) } : null;
};

// "1974-03-02" -> { m: '03', d: '02', y: '1974' }
const dobParts = (dob) => {
  const match = String(dob || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return match ? { y: match[1], m: match[2], d: match[3] } : null;
};

const sexOf = (sex) => {
  const s = String(sex || '').toLowerCase();
  return s.startsWith('m') ? 'male' : s.startsWith('f') ? 'female' : null;
};

const yes = (value) => value === true || /^(true|yes|y|1)$/i.test(String(value ?? ''));

/**
 * The estimate for a lead, or null when the lead has no estimate: not a Keyley
 * lead, or a lead without the balance and term the PDF needs.
 *
 *   agent: { name, npn, photoDataUrl } of the lead's agent, or null
 */
export const estimateFromLead = (row, agent = null) => {
  if (!isKeyleyLead(row)) return null; // every Keyley lead, owner or not (one lead type, Shea 2026-11-06)

  const balance = num(pick(row, COLUMNS.balance));
  const term = num(pick(row, COLUMNS.term));
  if (balance === null || !term) return null;

  const coverage = num(row?.face_amount);
  const low = num(pick(row, COLUMNS.premiumLow));
  const high = num(pick(row, COLUMNS.premiumHigh));
  const range = low && high ? { low: Math.round(low), high: Math.round(high) } : parsePremium(row?.premium);

  const street = pick(row, COLUMNS.street);
  const city = pick(row, COLUMNS.city);
  const zip = pick(row, COLUMNS.zip);
  const st = stateAbbr(row?.state);
  const line2 = [city, [st, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  const homeValue = num(pick(row, COLUMNS.homeValue));
  const confidence = num(pick(row, COLUMNS.valueConfidence)) ?? 0;

  const sex = sexOf(row?.sex);
  const dob = dobParts(row?.date_of_birth);

  return {
    firstName: String(row?.first_name || '').trim(),
    lastName: String(row?.last_name || '').trim(),
    address: street ? { line1: String(street), line2 } : null,
    person: sex ? { sex, dob: dob || { m: '', d: '', y: '' }, tobacco: yes(row?.smoker) } : null, // a missing birth date is left off the line
    homeValue: homeValue !== null && confidence >= SHOW_VALUE_MIN_CONFIDENCE ? homeValue : null,
    balance,
    yearsLeft: num(pick(row, COLUMNS.yearsLeft)) ?? term,
    quote: range && coverage ? { low: range.low, high: range.high, term, coverage } : null,
    agent,
    callNumber: KEYLEY_CALL.number,
    callDigits: KEYLEY_CALL.digits,
    generatedAt: row?.created_at ? new Date(row.created_at) : new Date(),
  };
};
