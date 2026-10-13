// Leads bought on the GSQ marketplace (banked or aged) are final sale, so
// they are never eligible for a refund. The CRM row doesn't record how a
// lead was acquired; GSQ's own Firestore lead doc does:
//   - banked: fulfillment stamps issuedTo on a lead reserved with
//     marketplaceSegment 'banked' (it was never issued before the sale)
//   - aged: fulfillment stamps redistributedTo and bumps
//     redistributionStage to 1 (31-90 day) or 2 (91-180 day)
// A lead that is only reserved (checkout still open) has neither, so it
// isn't treated as sold here.

/**
 * How a GSQ lead was bought on the marketplace, if it was.
 * @param {object|undefined|null} gsqLead GSQ Firestore leads/{gsq_id} data.
 * @return {'banked'|'aged'|null} The marketplace segment, or null.
 */
const marketplacePurchaseKind = (gsqLead) => {
  if (!gsqLead) return null;
  if (gsqLead.redistributedTo || Number(gsqLead.redistributionStage) > 0) {
    return 'aged';
  }
  if (gsqLead.marketplaceSegment === 'banked' && gsqLead.issuedTo) {
    return 'banked';
  }
  return null;
};

const MARKETPLACE_REFUND_ERROR = {
  banked: 'Banked leads are final sale and are not eligible for a refund',
  aged: 'Aged leads are final sale and are not eligible for a refund',
};

module.exports = { marketplacePurchaseKind, MARKETPLACE_REFUND_ERROR };
