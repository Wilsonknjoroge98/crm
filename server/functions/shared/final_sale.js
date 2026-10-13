// Aged and banked leads bought on GSQ's lead marketplace are final sale, so
// they can't be refunded. Shared by the refunds route (which enforces it) and
// the business list (which hides the card's Request Refund link).

// True once the marketplace has sold the GSQ lead doc. An aged sale appends
// the buyer to redistributedTo; a banked sale keeps marketplaceSegment and
// clears the reservation hold. A checkout still holding the lead
// (marketplaceReservedUntil set) is not a sale yet.
const isMarketplaceSale = (gsqLead) =>
  [].concat(gsqLead?.redistributedTo ?? []).length > 0 ||
  Boolean(gsqLead?.marketplaceSegment && !gsqLead.marketplaceReservedUntil);

module.exports = { isMarketplaceSale };
