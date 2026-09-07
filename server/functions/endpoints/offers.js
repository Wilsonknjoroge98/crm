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

// Storefront per lead type. fresh_lead splits by qualifier (Mixed vs
// Verified go to different Stripe payment links); every other type sells
// verified/unverified from the same storefront, so it's a single URL.
const LEAD_TYPE_URLS = {
  fresh_lead: {
    null: 'https://buy.stripe.com/8x24gz9KsgUD9gKeKN6Ri0p', // Mixed
    Verified: 'https://buy.stripe.com/00w4gzcWE33NgJc8mp6Ri0u',
  },
  live_transfer: 'https://buy.stripe.com/dRm00j7CkgUDdx01Y16Ri0b',
  banked_lead: 'https://fexdigital.com/fresh/store',
  aged_lead: 'https://fexdigital.com/aged/store?tier=second', // 31-90 days
  aged_lead_91_180: 'https://fexdigital.com/aged/store?tier=third', // 91+ days
};

const describeProduct = (productId) => {
  const entry = PRODUCT_LEAD_TYPES[productId];
  if (!entry) return null;
  const [type, qualifier] = entry;
  const label = LEAD_TYPE_LABELS[type] || type;
  return qualifier ? `${label} - ${qualifier}` : label;
};

const getProductUrl = (productId) => {
  const entry = PRODUCT_LEAD_TYPES[productId];
  if (!entry) return null;
  const [type, qualifier] = entry;
  const urls = LEAD_TYPE_URLS[type];
  if (!urls) return null;
  return typeof urls === 'string' ? urls : urls[qualifier || 'null'] || null;
};

const describeCoupon = (coupon) => {
  const productIds = coupon?.applies_to?.products;
  logger.log('Describing coupon for product IDs:', productIds);
  if (!productIds?.length) return null;
  const labels = [...new Set(productIds.map(describeProduct).filter(Boolean))];
  return labels.length ? labels.join(', ') : null;
};

// Only surface a "Shop" link when every product the coupon applies to
// shares the same storefront — a mixed-storefront coupon has no single
// correct link to send the agent to.
const getCouponUrl = (coupon) => {
  const productIds = coupon?.applies_to?.products;
  if (!productIds?.length) return null;
  const urls = [...new Set(productIds.map(getProductUrl).filter(Boolean))];
  if (urls.length > 1) {
    logger.warn(
      'Coupon applies to products across multiple storefronts — no single Shop link can be shown. Split it into per-product promotion codes in Stripe.',
      { couponId: coupon?.id, productIds, urls },
    );
    return null;
  }
  return urls.length === 1 ? urls[0] : null;
};

// Stripe is the source of truth for discounts — a Promotion Code carries the
// customer-facing code/expiration, and its Coupon carries the percent/amount
// off. Only promotion codes opted in via metadata { show: "true" } (set on
// the Promotion Code itself, not the Coupon) are surfaced here, so
// private/internal codes stay hidden without a second data store.
offersRouter.get('/', async (req, res) => {
  logger.log('Fetching offers', {
    route: '/offers',
    method: 'GET',
    requesterId: req.agent?.id,
  });

  try {
    const promotionCodes = [];
    let hasMore = true;
    let startingAfter;
    let page = 0;

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

      page += 1;
      logger.log('Fetched promotion codes page from Stripe', {
        route: '/offers',
        page,
        pageCount: response.data.data.length,
        hasMore: response.data.has_more,
      });

      promotionCodes.push(...response.data.data);
      hasMore = response.data.has_more;
      if (hasMore) {
        startingAfter = promotionCodes[promotionCodes.length - 1].id;
      }
    }

    const now = dayjs();

    const eligiblePromotionCodes = promotionCodes.filter((promo) => {
      const notExpired =
        !promo.expires_at || dayjs.unix(promo.expires_at).isAfter(now);
      const isEligible =
        !!promo.coupon?.valid && promo.metadata?.show === 'true' && notExpired;

      if (!isEligible) {
        logger.log('Excluding promotion code from offers', {
          route: '/offers',
          promotionCodeId: promo.id,
          code: promo.code,
          couponId: promo.coupon?.id,
          couponValid: !!promo.coupon?.valid,
          couponMetadata: promo.coupon?.metadata ?? null,
          promotionCodeMetadata: promo.metadata ?? null,
          expiresAt: promo.expires_at
            ? dayjs.unix(promo.expires_at).toISOString()
            : null,
          notExpired,
        });
      }

      return isEligible;
    });

    const offers = eligiblePromotionCodes
      .map((promo) => ({
        id: promo.id,
        title: formatCouponTitle(promo.coupon),
        description: describeCoupon(promo.coupon),
        code: promo.code,
        linkUrl: getCouponUrl(promo.coupon),
        linkLabel: 'Shop',
        starts_at: dayjs.unix(promo.created).toISOString(),
        expires_at: promo.expires_at
          ? dayjs.unix(promo.expires_at).toISOString()
          : null,
        is_active: true,
      }))
      .sort((a, b) => new Date(b.starts_at) - new Date(a.starts_at));

    logger.log('Fetched offers successfully', {
      route: '/offers',
      method: 'GET',
      requesterId: req.agent?.id,
      promotionCodesFetched: promotionCodes.length,
      offersReturned: offers.length,
    });

    return res.status(200).json(offers);
  } catch (error) {
    logger.error('Error fetching offers from Stripe in endpoints/offers.js', {
      route: '/offers',
      method: 'GET',
      requesterId: req.agent?.id,
      error: error.response?.data || error.message,
    });
    return res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

module.exports = offersRouter;
