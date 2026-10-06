import { supabase } from '../../utils/supabase.js';

// Storefront pages are mounted under the Marketplace tab.
export const MARKETPLACE_PATH = '/purchase-leads';

// The storefront API is the `marketplace` Cloud Function in the GSQ project.
const isDev = import.meta.env.MODE === 'development';
const isStaging = window.location.hostname.includes('crm-dev-dde35');

const API_BASE = isDev
  ? 'http://127.0.0.1:5001/life-quoter/us-central1/marketplace'
  : isStaging
    ? 'https://us-central1-life-quoter-staging.cloudfunctions.net/marketplace'
    : 'https://us-central1-life-quoter.cloudfunctions.net/marketplace';

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
