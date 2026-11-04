// Our own lead brands (leads.brand). A lead with a brand is a house lead:
// kept for tracking (never deleted) and counted under House Leads. A lead an
// agent brought in has no brand and a lead vendor instead. Mirrors the
// server's shared/brands.js.
export const BRANDS = [
  { key: 'gsq', label: 'GSQ' },
  { key: 'keyley', label: 'Keyley' },
];

const LABELS = Object.fromEntries(BRANDS.map(({ key, label }) => [key, label]));

export const brandLabel = (brand) => LABELS[brand] ?? null;

export const isHouseLead = (person) => Boolean(LABELS[person?.brand]);

// One Lead Source dropdown covers both: the brands first, then the lead
// vendors. A brand's option value is prefixed so it can't collide with a
// vendor id.
const BRAND_PREFIX = 'brand:';

// GSQ's old vendor row is the GSQ brand now; it's hidden until
// sql/add_lead_brand_cleanup.sql deletes it.
const RETIRED_VENDOR_NAMES = new Set(['GetSeniorQuotes.com']);

export const sourceOptions = (leadVendors = []) => [
  ...BRANDS.map(({ key, label }) => ({
    value: `${BRAND_PREFIX}${key}`,
    label,
  })),
  ...leadVendors
    .filter(({ name }) => !RETIRED_VENDOR_NAMES.has(name))
    .map(({ id, name }) => ({ value: id, label: name })),
];

// Hand-keyed records default to GSQ, as they did when it was a vendor.
export const DEFAULT_SOURCE = `${BRAND_PREFIX}gsq`;

// The dropdown value for a lead or client form's brand / lead_vendor_id.
export const sourceValue = ({ brand, lead_vendor_id: leadVendorId } = {}) =>
  LABELS[brand] ? `${BRAND_PREFIX}${brand}` : leadVendorId || '';

// The dropdown value back to the two columns: exactly one is set.
export const sourceFields = (value) =>
  String(value || '').startsWith(BRAND_PREFIX)
    ? { brand: value.slice(BRAND_PREFIX.length), lead_vendor_id: null }
    : { brand: null, lead_vendor_id: value || null };
