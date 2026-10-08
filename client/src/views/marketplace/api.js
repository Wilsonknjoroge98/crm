import { supabase } from '../../utils/supabase.js';

// Storefront pages are mounted under the Marketplace tab.
export const MARKETPLACE_PATH = '/purchase-leads';

// The storefront API is the `marketplace` Cloud Function in the GSQ project.
// Every environment, local dev and CRM staging included, uses production
// GSQ: production holds the live Stripe products, the CRM build only
// carries the live publishable key, and the GSQ emulator would collide
// with the CRM's on port 5001. Orders placed from dev or staging are real
// purchases.
const API_BASE =
  'https://us-central1-life-quoter.cloudfunctions.net/marketplace';

/**
 * fetch() against the marketplace API, signed in as the current CRM user —
 * the API takes the buyer's email from this session.
 * @param {string} path e.g. '/inventoryReport?type=fresh'
 * @param {RequestInit} [init]
 * @return {Promise<Response>}
 */
export const marketplaceFetch = async (path, init = {}) => {
  const token = (await supabase.auth.getSession())?.data?.session?.access_token;
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
};

/**
 * Fire-and-forget release of a checkout's lead hold. Sent unauthenticated as
 * text/plain so this keepalive request needs no CORS preflight and still goes
 * out while the page is navigating away.
 * @param {string} sessionId Stripe Checkout Session id.
 * @return {Promise<Response>}
 */
export const cancelReservation = (sessionId) =>
  fetch(`${API_BASE}/cancelReservation`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ sessionId }),
    keepalive: true,
  });
