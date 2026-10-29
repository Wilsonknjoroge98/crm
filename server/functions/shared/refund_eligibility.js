// Who can request a refund on a GSQ lead. Shared by the refunds route (which
// enforces it) and the business list (which tells the card whether to offer
// Request Refund through refund_eligible).

const GSQ_LEAD_VENDOR_ID = '1043bc55-a8cd-485f-bddc-46bcfc06d4ba';

// The refund flow only applies to leads generated on or after this date —
// leads that dripped in earlier were never sold as refund-eligible.
const REFUND_ELIGIBILITY_CUTOFF = new Date('2026-09-19T00:00:00Z');

// Terms of Service section 11(a): a refund must be requested within 7 days
// of delivery. Delivery is the crm row's created_at, when the lead landed in
// the agent's CRM.
const REFUND_WINDOW_DAYS = 7;
const REFUND_WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const isWithinRefundWindow = (createdAt, nowMs = Date.now()) =>
  nowMs - new Date(createdAt).getTime() <= REFUND_WINDOW_MS;

// The checks that only need the crm's own lead row: a GSQ lead that is
// unverified (strict false, null means a non-gsq lead that was never
// verified either way), unsold, generated on or after the cutoff, delivered
// within the refund window, and with no refund on record (every refund
// outcome is terminal).
const isRefundCandidate = (lead) =>
  lead.lead_vendor_id === GSQ_LEAD_VENDOR_ID &&
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
  GSQ_LEAD_VENDOR_ID,
  REFUND_ELIGIBILITY_CUTOFF,
  REFUND_WINDOW_DAYS,
  isWithinRefundWindow,
  isRefundCandidate,
  isMarketplaceSale,
};
