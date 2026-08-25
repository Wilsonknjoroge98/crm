const express = require('express');
const axios = require('axios');
const logger = require('firebase-functions/logger');
const dayjs = require('dayjs');

// eslint-disable-next-line new-cap
const offersRouter = express.Router();

const formatCouponTitle = (coupon) => {
  if (!coupon) return 'Discount';
  if (coupon.percent_off) return `${coupon.percent_off}% Off`;
  if (coupon.amount_off) {
    const amount = coupon.amount_off / 100;
    return `${amount.toLocaleString('en-US', {
      style: 'currency',
      currency: coupon.currency || 'usd',
    })} Off`;
  }
  return coupon.name || 'Discount';
};

// [leadType, qualifier] per Stripe product ID, used to derive a short,
// single-line description instead of relying on the free-text coupon name.
// qualifier is null when the product isn't split into verified/unverified
// variants (e.g. flagship fresh lead is a mixed pool, not "unverified").
const PRODUCT_LEAD_TYPES = {
  prod_TCNU39BP1oYhFa: ['fresh_lead', null], // FRESH LEAD - MIXED (flagship)
  prod_TaMHDs2No6lsrg: ['fresh_lead', 'Verified'], // FRESH LEAD - VERIFIED
  prod_TisojhJAGRm5gz: ['live_transfer', null], // LIVE TRANSFER
  prod_UZPrZqQ5r9Ulxr: ['banked_lead', 'Verified'], // BANKED LEAD - VERIFIED
  prod_UZPsfeVsOiYLJV: ['banked_lead', 'Unverified'], // BANKED LEAD - UNVERIFIED
  prod_TrcBtjw3yCOPyu: ['aged_lead', 'Verified'], // 31+ Day Aged LEAD - VERIFIED
  prod_TrcCUyw2JjEZ7e: ['aged_lead', 'Unverified'], // 31+ Day Aged LEAD - UNVERIFIED
  prod_V7V3Ld6JNVrnxV: ['aged_lead_91_180', 'Verified'], // 91-180 Day Aged LEAD - VERIFIED
  prod_V7V2C48Cyk47vv: ['aged_lead_91_180', 'Unverified'], // 91-180 Day Aged LEAD - UNVERIFIED
};

const LEAD_TYPE_LABELS = {
  fresh_lead: 'Fresh Leads',
  live_transfer: 'Live Transfers',
  banked_lead: 'Banked Leads',
  aged_lead: '31+ Day Aged Leads',
  aged_lead_91_180: '91-180 Day Aged Leads',
};

const describeProduct = (productId) => {
  const entry = PRODUCT_LEAD_TYPES[productId];
  if (!entry) return null;
  const [type, qualifier] = entry;
  const label = LEAD_TYPE_LABELS[type] || type;
  return qualifier ? `${label} - ${qualifier}` : label;
};

const describeCoupon = (coupon) => {
  const productIds = coupon?.applies_to?.products;
  logger.log('Describing coupon for product IDs:', productIds);
  if (!productIds?.length) return null;
  const labels = [...new Set(productIds.map(describeProduct).filter(Boolean))];
  return labels.length ? labels.join(', ') : null;
};

// Stripe is the source of truth for discounts — a Promotion Code carries the
// customer-facing code/expiration, and its Coupon carries the percent/amount
// off. Only coupons opted in via metadata { show: "true" } are surfaced here,
// so private/internal codes stay hidden without a second data store.
offersRouter.get('/', async (req, res) => {
  try {
    const promotionCodes = [];
    let hasMore = true;
    let startingAfter;

    while (hasMore) {
      const params = new URLSearchParams();
      params.append('active', 'true');
      params.append('limit', '100');
      params.append('expand[]', 'data.coupon');
      params.append('expand[]', 'data.coupon.applies_to');
      if (startingAfter) params.append('starting_after', startingAfter);

      const response = await axios.get(
        'https://api.stripe.com/v1/promotion_codes',
        {
          headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          },
          params,
        },
      );

      promotionCodes.push(...response.data.data);
      hasMore = response.data.has_more;
      if (hasMore) {
        startingAfter = promotionCodes[promotionCodes.length - 1].id;
      }
    }

    const now = dayjs();

    const offers = promotionCodes
      .filter((promo) => promo.coupon?.valid)
      .filter((promo) => promo.coupon?.metadata?.show === 'true')
      .filter(
        (promo) =>
          !promo.expires_at || dayjs.unix(promo.expires_at).isAfter(now),
      )
      .map((promo) => ({
        id: promo.id,
        title: formatCouponTitle(promo.coupon),
        description: describeCoupon(promo.coupon),
        code: promo.code,
        starts_at: dayjs.unix(promo.created).toISOString(),
        expires_at: promo.expires_at
          ? dayjs.unix(promo.expires_at).toISOString()
          : null,
        is_active: true,
      }))
      .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

    return res.status(200).json(offers);
  } catch (error) {
    logger.error('Error fetching offers from Stripe in endpoints/offers.js', {
      error: error.response?.data || error.message,
    });
    return res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

module.exports = offersRouter;
