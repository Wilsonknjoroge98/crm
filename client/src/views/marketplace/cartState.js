// The storefront's segment model and the single shared cart. One cart holds
// leads from every segment and checks out as one order; GSQ reserves and
// fulfills each lead per its segment.
import { useCallback, useEffect, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { MARKETPLACE_PATH, marketplaceFetch } from './api.js';

export const CART_PATH = `${MARKETPLACE_PATH}/cart`;
export const CHECKOUT_PATH = `${MARKETPLACE_PATH}/checkout`;
export const FRESH_LEADS_PATH = `${MARKETPLACE_PATH}/fresh-leads`;
export const AGED_BANKED_PATH = `${MARKETPLACE_PATH}/aged-banked`;
export const SOFTWARE_PATH = `${MARKETPLACE_PATH}/software`;

// What the storefront sells, in order of sales volume. Keys match GSQ's
// segments. Banked leads are the API's `fresh` lead type; aged is split into
// two age windows (`tier`). `source` separates GSQ quote-funnel leads from
// Meta instant-form leads, which have their own stores and prices and are
// only sold verified.
export const SEGMENTS = [
  {
    key: 'aged_second',
    source: 'funnel',
    leadType: 'aged',
    tier: 'second',
    verifiedOnly: false,
    label: '31–90 Day Aged',
    unit: 'aged lead',
    window: 'Submitted 31–90 days ago',
  },
  {
    key: 'aged_third',
    source: 'funnel',
    leadType: 'aged',
    tier: 'third',
    verifiedOnly: false,
    label: '91–180 Day Aged',
    unit: 'aged lead',
    window: 'Submitted 91–180 days ago',
  },
  {
    key: 'banked',
    source: 'funnel',
    leadType: 'fresh',
    tier: null,
    verifiedOnly: false,
    label: 'Banked Leads',
    unit: 'banked lead',
    window: 'Submitted within the last 72 hours',
  },
  {
    key: 'instant_aged_second',
    source: 'instant',
    leadType: 'aged',
    tier: 'second',
    verifiedOnly: true,
    label: '31–90 Day Aged Instant Forms',
    unit: 'aged instant form lead',
    window: 'Submitted 31–90 days ago',
  },
  {
    key: 'instant_aged_third',
    source: 'instant',
    leadType: 'aged',
    tier: 'third',
    verifiedOnly: true,
    label: '91–180 Day Aged Instant Forms',
    unit: 'aged instant form lead',
    window: 'Submitted 91–180 days ago',
  },
  {
    key: 'instant_banked',
    source: 'instant',
    leadType: 'fresh',
    tier: null,
    verifiedOnly: true,
    label: 'Banked Instant Forms',
    unit: 'banked instant form lead',
    window: 'Submitted within the last 72 hours',
  },
];

export const SEGMENT_BY_KEY = Object.fromEntries(
  SEGMENTS.map((segment) => [segment.key, segment]),
);

/** The segment a store URL (/:leadType/store?tier=&source=) is showing. */
export const getSegment = (leadType, tier, source) =>
  SEGMENT_BY_KEY[
    (source === 'instant' ? 'instant_' : '') +
      (leadType === 'fresh'
        ? 'banked'
        : tier === 'third'
          ? 'aged_third'
          : 'aged_second')
  ];

export const storePath = (segmentKey) => {
  const { leadType, tier, source } = SEGMENT_BY_KEY[segmentKey];
  const params = new URLSearchParams();
  if (tier) params.set('tier', tier);
  if (source === 'instant') params.set('source', source);
  const query = params.toString();
  return `${MARKETPLACE_PATH}/${leadType}/store${query ? `?${query}` : ''}`;
};

// The store the agent last browsed this session, so "Continue Shopping" in
// the shared cart returns there rather than to the Marketplace hub.
const LAST_STORE_KEY = 'fex-last-store';

export const rememberStore = (segmentKey) => {
  try {
    sessionStorage.setItem(LAST_STORE_KEY, segmentKey);
  } catch {
    // storage unavailable; the fallback below still applies
  }
};

/**
 * Where "Continue Shopping" goes: the last store browsed, else the first
 * segment in the cart, else the first segment overall.
 * @param {object} cart The shared cart.
 * @return {string} A store path.
 */
export const continueShoppingPath = (cart) => {
  let last = null;
  try {
    last = sessionStorage.getItem(LAST_STORE_KEY);
  } catch {
    // ignore
  }
  const segmentKey =
    (last && SEGMENT_BY_KEY[last] && last) ||
    SEGMENTS.find(({ key }) => cart?.[key])?.key ||
    SEGMENTS[0].key;
  return storePath(segmentKey);
};

/**
 * Live inventory and prices for every segment, cached per segment and shared
 * across pages. Each report reads every unsold lead in its window, so results
 * stay fresh for a minute instead of refetching on every page or tab switch;
 * checkout reserves against live inventory regardless.
 * @return {{bySegment: object, prices: object, isLoading: boolean,
 *   isError: boolean, refetch: Function}}
 */
export function useMarketplaceInventory() {
  const queries = useQueries({
    queries: SEGMENTS.map(({ key, leadType, tier }) => ({
      queryKey: ['inventory', key],
      queryFn: async () => {
        // GSQ resolves `segment`; type/tier are what it read before
        // instant-form segments existed.
        const params = new URLSearchParams({ segment: key, type: leadType });
        if (tier) params.set('tier', tier);
        const res = await marketplaceFetch(`/inventoryReport?${params}`);
        if (!res.ok) throw new Error('Failed to fetch inventory');
        return res.json();
      },
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });
  const bySegment = Object.fromEntries(
    SEGMENTS.map((segment, i) => [segment.key, queries[i]]),
  );
  return {
    bySegment,
    prices: Object.fromEntries(
      SEGMENTS.map(({ key }) => [key, bySegment[key].data?.prices]),
    ),
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    refetch: () => Promise.all(queries.map((q) => q.refetch())),
  };
}

export const countAvailable = (inventory) =>
  Object.values(inventory?.states || {}).reduce(
    (sum, s) => sum + s.verified + s.unverified,
    0,
  );

// Cheapest per-lead price across the given inventories, for "From $x".
const lowestPrice = (inventories) => {
  const prices = inventories
    .flatMap((inv) => [inv?.prices?.unverified, inv?.prices?.verified])
    .filter((p) => typeof p === 'number');
  return prices.length ? Math.min(...prices) : null;
};

// One product's inventory across the segments it covers (quote funnel and
// instant forms). `available` is null (not 0) when every lookup failed, so
// its tile stays clickable and the agent can open the store and retry there.
// `segmentKey` is the first segment with stock, so the tile opens a store
// that has something to sell; `price` is the cheapest across all of them.
export const summarizeSegments = (bySegment, keys) => {
  const loaded = keys.filter((key) => bySegment[key].data);
  const inventories = loaded.map((key) => bySegment[key].data);
  const withStock = loaded.find(
    (key) => countAvailable(bySegment[key].data) > 0,
  );
  return {
    available: loaded.length
      ? loaded.reduce(
          (sum, key) => sum + countAvailable(bySegment[key].data),
          0,
        )
      : null,
    loading: keys.some((key) => bySegment[key].isLoading),
    price: lowestPrice(inventories),
    segmentKey: withStock || keys[0],
  };
};

export const AGED_SEGMENTS = [
  'aged_second',
  'aged_third',
  'instant_aged_second',
  'instant_aged_third',
];
export const BANKED_SEGMENTS = ['banked', 'instant_banked'];

// --- cart storage -----------------------------------------------------------
// { [segmentKey]: { [state]: { verified, unverified } } }

const CART_KEY = 'fex-cart';
const CART_EVENT = 'fex-cart-change';
// Per-segment carts from before carts were shared, folded in once.
const LEGACY_CART_KEYS = {
  banked: 'fex-cart-fresh',
  aged_second: 'fex-cart-aged-second',
  aged_third: 'fex-cart-aged-third',
};

const parse = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

export const readCart = () => {
  const cart = parse(CART_KEY);
  if (cart) return cart;

  const migrated = {};
  for (const [segment, key] of Object.entries(LEGACY_CART_KEYS)) {
    const legacy = parse(key);
    if (legacy && Object.keys(legacy).length) migrated[segment] = legacy;
  }
  if (Object.keys(migrated).length) {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(migrated));
      Object.values(LEGACY_CART_KEYS).forEach((key) =>
        localStorage.removeItem(key),
      );
    } catch {
      // storage unavailable; the migrated cart still applies this session
    }
  }
  return migrated;
};

const writeCart = (cart) => {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // storage unavailable (e.g. Safari private mode)
  }
  window.dispatchEvent(new Event(CART_EVENT));
};

export const clearCart = () => writeCart({});

/**
 * The shared cart, kept in sync across components and tabs.
 * @return {[object, Function]} cart and updateCart(updater).
 */
export function useCart() {
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    const sync = () => setCart(readCart());
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const updateCart = useCallback((updater) => {
    const next = typeof updater === 'function' ? updater(readCart()) : updater;
    writeCart(next);
    setCart(next);
  }, []);

  return [cart, updateCart];
}

/** Sets one (segment, state, type) quantity, dropping emptied entries. */
export const setLineQty = (cart, segment, state, type, qty) => {
  const segmentCart = { ...(cart[segment] || {}) };
  const current = segmentCart[state] || { verified: 0, unverified: 0 };
  const next = { ...current, [type]: Math.max(0, qty) };
  if (next.verified > 0 || next.unverified > 0) segmentCart[state] = next;
  else delete segmentCart[state];

  const result = { ...cart };
  if (Object.keys(segmentCart).length) result[segment] = segmentCart;
  else delete result[segment];
  return result;
};

/**
 * Flattens the cart into priced lines, in segment order (verified before
 * unverified within a segment). `price` is null until that segment's
 * inventory has loaded.
 */
export const cartLines = (cart, prices) =>
  SEGMENTS.flatMap(({ key }) => {
    const states = Object.entries(cart[key] || {}).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return ['verified', 'unverified'].flatMap((type) =>
      states
        .filter(([, counts]) => counts[type] > 0)
        .map(([state, counts]) => ({
          id: `${key}-${state}-${type}`,
          segment: key,
          state,
          type,
          qty: counts[type],
          price: prices?.[key]?.[type] ?? null,
        })),
    );
  });

export const linesCount = (lines) =>
  lines.reduce((sum, line) => sum + line.qty, 0);

export const linesTotal = (lines) =>
  lines.reduce((sum, line) => sum + line.qty * (line.price || 0), 0);
