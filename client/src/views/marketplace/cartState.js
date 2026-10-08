// The storefront's segment model and the single shared cart. One cart holds
// leads from every segment and checks out as one order; GSQ reserves and
// fulfills each lead per its segment.
import { useCallback, useEffect, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { MARKETPLACE_PATH, marketplaceFetch } from './api.js';

export const CART_PATH = `${MARKETPLACE_PATH}/cart`;
export const CHECKOUT_PATH = `${MARKETPLACE_PATH}/checkout`;

// What the storefront sells, in order of sales volume. Keys match GSQ's
// segments. Banked leads are the API's `fresh` lead type; aged is split into
// two age windows (`tier`).
export const SEGMENTS = [
  {
    key: 'aged_second',
    leadType: 'aged',
    tier: 'second',
    label: '31–90 Day Aged',
    unit: 'aged lead',
    window: 'Submitted 31–90 days ago',
  },
  {
    key: 'aged_third',
    leadType: 'aged',
    tier: 'third',
    label: '91–180 Day Aged',
    unit: 'aged lead',
    window: 'Submitted 91–180 days ago',
  },
  {
    key: 'banked',
    leadType: 'fresh',
    tier: null,
    label: 'Banked Leads',
    unit: 'banked lead',
    window: 'Submitted within the last 72 hours',
  },
];

export const SEGMENT_BY_KEY = Object.fromEntries(
  SEGMENTS.map((segment) => [segment.key, segment]),
);

/** The segment a store URL (/:leadType/store?tier=) is showing. */
export const getSegment = (leadType, tier) =>
  SEGMENT_BY_KEY[
    leadType === 'fresh'
      ? 'banked'
      : tier === 'third'
        ? 'aged_third'
        : 'aged_second'
  ];

export const storePath = (segmentKey) => {
  const { leadType, tier } = SEGMENT_BY_KEY[segmentKey];
  return `${MARKETPLACE_PATH}/${leadType}/store${tier ? `?tier=${tier}` : ''}`;
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
 * Live inventory and prices for every segment. Query keys match the ones the
 * store pages have always used, so the cache is shared across pages. Each
 * report reads every unsold lead in its window, so results stay fresh for a
 * minute instead of refetching on every page or tab switch; checkout
 * reserves against live inventory regardless.
 * @return {{bySegment: object, prices: object, isLoading: boolean,
 *   isError: boolean, refetch: Function}}
 */
export function useMarketplaceInventory() {
  const queries = useQueries({
    queries: SEGMENTS.map(({ leadType, tier }) => ({
      queryKey: ['inventory', leadType, tier || 'second'],
      queryFn: async () => {
        const url =
          leadType === 'fresh'
            ? `/inventoryReport?type=${leadType}`
            : `/inventoryReport?type=${leadType}&tier=${tier}`;
        const res = await marketplaceFetch(url);
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
