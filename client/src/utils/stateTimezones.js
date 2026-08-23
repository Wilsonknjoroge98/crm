// Predominant IANA timezone per US state, for the lead card's local-time
// display. Split-timezone states use the zone covering most of the
// population. Keys cover both full names and USPS codes.
const STATE_TIMEZONES = {
  alabama: 'America/Chicago',
  alaska: 'America/Anchorage',
  arizona: 'America/Phoenix',
  arkansas: 'America/Chicago',
  california: 'America/Los_Angeles',
  colorado: 'America/Denver',
  connecticut: 'America/New_York',
  delaware: 'America/New_York',
  'district of columbia': 'America/New_York',
  florida: 'America/New_York',
  georgia: 'America/New_York',
  hawaii: 'Pacific/Honolulu',
  idaho: 'America/Denver',
  illinois: 'America/Chicago',
  indiana: 'America/New_York',
  iowa: 'America/Chicago',
  kansas: 'America/Chicago',
  kentucky: 'America/New_York',
  louisiana: 'America/Chicago',
  maine: 'America/New_York',
  maryland: 'America/New_York',
  massachusetts: 'America/New_York',
  michigan: 'America/New_York',
  minnesota: 'America/Chicago',
  mississippi: 'America/Chicago',
  missouri: 'America/Chicago',
  montana: 'America/Denver',
  nebraska: 'America/Chicago',
  nevada: 'America/Los_Angeles',
  'new hampshire': 'America/New_York',
  'new jersey': 'America/New_York',
  'new mexico': 'America/Denver',
  'new york': 'America/New_York',
  'north carolina': 'America/New_York',
  'north dakota': 'America/Chicago',
  ohio: 'America/New_York',
  oklahoma: 'America/Chicago',
  oregon: 'America/Los_Angeles',
  pennsylvania: 'America/New_York',
  'rhode island': 'America/New_York',
  'south carolina': 'America/New_York',
  'south dakota': 'America/Chicago',
  tennessee: 'America/Chicago',
  texas: 'America/Chicago',
  utah: 'America/Denver',
  vermont: 'America/New_York',
  virginia: 'America/New_York',
  washington: 'America/Los_Angeles',
  'west virginia': 'America/New_York',
  wisconsin: 'America/Chicago',
  wyoming: 'America/Denver',
};

const STATE_CODES = {
  al: 'alabama', ak: 'alaska', az: 'arizona', ar: 'arkansas',
  ca: 'california', co: 'colorado', ct: 'connecticut', de: 'delaware',
  dc: 'district of columbia', fl: 'florida', ga: 'georgia', hi: 'hawaii',
  id: 'idaho', il: 'illinois', in: 'indiana', ia: 'iowa', ks: 'kansas',
  ky: 'kentucky', la: 'louisiana', me: 'maine', md: 'maryland',
  ma: 'massachusetts', mi: 'michigan', mn: 'minnesota', ms: 'mississippi',
  mo: 'missouri', mt: 'montana', ne: 'nebraska', nv: 'nevada',
  nh: 'new hampshire', nj: 'new jersey', nm: 'new mexico', ny: 'new york',
  nc: 'north carolina', nd: 'north dakota', oh: 'ohio', ok: 'oklahoma',
  or: 'oregon', pa: 'pennsylvania', ri: 'rhode island', sc: 'south carolina',
  sd: 'south dakota', tn: 'tennessee', tx: 'texas', ut: 'utah',
  vt: 'vermont', va: 'virginia', wa: 'washington', wv: 'west virginia',
  wi: 'wisconsin', wy: 'wyoming',
};

export const getStateTimezone = (state) => {
  const normalized = String(state || '').trim().toLowerCase();
  if (!normalized) return null;
  const fullName = STATE_CODES[normalized] || normalized;
  return STATE_TIMEZONES[fullName] || null;
};

export const formatLocalTime = (state, now = new Date()) => {
  const timeZone = getStateTimezone(state);
  if (!timeZone) return null;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(now);
};
