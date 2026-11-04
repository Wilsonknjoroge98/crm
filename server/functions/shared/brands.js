// Our own lead brands (leads.brand, sql/add_lead_brand.sql). A lead with a
// brand is a house lead: delivered by gsq, kept for tracking (never deleted),
// counted under House Leads, attributed through Hyros, and synced sold back to
// gsq's Firestore. A lead an agent brought in has no brand and a
// lead_vendor_id instead.
//
// leadCollections: the gsq Firestore collections that hold this brand's lead
// docs, the same split gsq's call control uses (gsq functions/index.js
// leadCollections). Keyley's own collections never mix with GSQ's.
// callBrandLabel: telnyx_calls.brandLabel for calls to the brand's number.
// pixelCollection: where a sale is matched to its lead doc for the brand's
// Meta Purchase event (integrations/pixel.js); GSQ only ever used funnel leads.
const BRANDS = Object.freeze({
  gsq: Object.freeze({
    label: 'GSQ',
    leadCollections: Object.freeze(['leads', 'instant_form_leads']),
    callBrandLabel: 'GSQ',
    pixelCollection: 'leads',
  }),
  keyley: Object.freeze({
    label: 'Keyley',
    leadCollections: Object.freeze(['keyley_leads']),
    callBrandLabel: 'Keyley',
    pixelCollection: 'keyley_leads',
  }),
});

const BRAND_KEYS = Object.freeze(Object.keys(BRANDS));

// Every gsq collection with a lead doc, across brands.
const ALL_LEAD_COLLECTIONS = Object.freeze(
  BRAND_KEYS.flatMap((brand) => BRANDS[brand].leadCollections),
);

const isBrand = (value) => BRAND_KEYS.includes(value);

const isHouseLead = (lead) => isBrand(lead?.brand);

// A lead's source is either a house brand or a lead vendor, never both
// (leads_source_check). Normalises what a create/edit form sent: a brand wins
// and clears the vendor, a vendor clears the brand. Returns { brand,
// lead_vendor_id }, only the keys that were supplied, or { error }.
const parseLeadSource = (input = {}) => {
  const hasBrand = Object.prototype.hasOwnProperty.call(input, 'brand');
  const hasVendor = Object.prototype.hasOwnProperty.call(
    input,
    'lead_vendor_id',
  );
  const brand = hasBrand ? input.brand || null : null;
  const vendor = hasVendor ? input.lead_vendor_id || null : null;

  if (brand !== null && !isBrand(brand)) return { error: 'Unknown brand' };
  if (brand) return { source: { brand, lead_vendor_id: null } };
  if (vendor) return { source: { brand: null, lead_vendor_id: vendor } };
  if (hasBrand || hasVendor) return { error: 'A brand or lead vendor is required' };
  return { source: {} };
};

module.exports = {
  BRANDS,
  BRAND_KEYS,
  ALL_LEAD_COLLECTIONS,
  isBrand,
  isHouseLead,
  parseLeadSource,
};
