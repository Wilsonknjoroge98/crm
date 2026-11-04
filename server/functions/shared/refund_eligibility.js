// Who can request a refund on a house lead. Shared by the refunds route (which
// enforces it) and the business list (which tells the card whether to offer
// Request Refund through refund_eligible).

// Brands whose unverified leads can be refunded. A refund credits the agent
// back in GSQ's lead ledger, and Keyley's pool (outstandingKeyley) has no
// credit path yet, so Keyley refunds are refused until it does (decided
// 2026-11-14). Every Keyley lead is verified today anyway.
const REFUNDABLE_BRANDS = Object.freeze(['gsq']);
const isRefundableBrand = (brand) => REFUNDABLE_BRANDS.includes(brand);

// The refund flow only applies to leads generated on or after this date —
// leads that dripped in earlier were never sold as refund-eligible.
const REFUND_ELIGIBILITY_CUTOFF = new Date('2026-09-19T00:00:00Z');

// Terms of Service section 11(a): a refund must be requested within 14 days
// of delivery. Delivery is the crm row's created_at, when the lead landed in
// the agent's CRM.
const REFUND_WINDOW_DAYS = 14;
const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const isWithinRefundWindow = (createdAt, nowMs = Date.now()) =>
  nowMs - new Date(createdAt).getTime() <= REFUND_WINDOW_MS;

// The checks that only need the crm's own lead row: a lead of a refundable
// brand that is unverified (strict false, null means a lead that was never
// verified either way), unsold, generated on or after the cutoff, delivered
// within the refund window, and with no refund on record (every refund
// outcome is terminal).
const isRefundCandidate = (lead) =>
  isRefundableBrand(lead.brand) &&
  lead.verified === false &&
  !lead.sold &&
  !lead.refund_status &&
  new Date(lead.created_at) >= REFUND_ELIGIBILITY_CUTOFF &&
  isWithinRefundWindow(lead.created_at);

// Aged and banked leads bought on GSQ's lead marketplace are final sale.
// True once the marketplace has sold the GSQ lead doc. An aged sale appends
// the buyer to redistributedTo; a banked sale keeps marketplaceSegment and
// clears the reservation hold. A checkout still holding the lead
// (marketplaceReservedUntil set) is not a sale yet.
const isMarketplaceSale = (gsqLead) =>
  [].concat(gsqLead?.redistributedTo ?? []).length > 0 ||
  Boolean(gsqLead?.marketplaceSegment && !gsqLead.marketplaceReservedUntil);

module.exports = {
  REFUNDABLE_BRANDS,
  isRefundableBrand,
  REFUND_ELIGIBILITY_CUTOFF,
  REFUND_WINDOW_DAYS,
  isWithinRefundWindow,
  isRefundCandidate,
  isMarketplaceSale,
};
