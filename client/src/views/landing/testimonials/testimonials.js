// testimonials.js
// Every agent review on the site lives here, as data only. A review has no
// styling of its own: how it looks is decided once, in testimonialStyles.js,
// so every card on every page stays identical. Unknown keys (sx, style,
// colour, className ...) are dropped by normalizeTestimonial, so a single
// entry can never restyle itself.
//
// Before a review goes live:
//   1. Use the agent's approved wording, word for word.
//   2. Set approvedOn to the date they approved it in writing (keep the text).
//   3. If they got anything for it (free leads, a credit), say so in
//      `disclosure`. The FTC requires it.
// Production only shows reviews with an approvedOn date; the placeholders
// below show in local development only.

export const TESTIMONIAL_FIELDS = Object.freeze([
  'id',
  'quote',
  'name',
  'role',
  'state',
  'photo',
  'disclosure',
  'approvedOn',
]);

// Shown under every testimonials block, whatever the individual reviews say.
export const RESULTS_DISCLAIMER =
  'Testimonials are from agents who bought FEX Digital leads and approved their wording. Individual results vary and depend on your states, products and follow-up. These results are not typical and are not a guarantee.';

const REQUIRED = ['id', 'quote', 'name'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Keep only the known fields, trimmed; reject an entry that can't render.
export function normalizeTestimonial(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('A testimonial must be an object');
  }
  const out = {};
  for (const key of TESTIMONIAL_FIELDS) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim()) out[key] = value.trim();
  }
  for (const key of REQUIRED) {
    if (!out[key]) {
      throw new TypeError(`Testimonial ${raw.id ?? '(no id)'} needs "${key}"`);
    }
  }
  if (out.approvedOn && !ISO_DATE.test(out.approvedOn)) {
    throw new TypeError(
      `Testimonial ${out.id}: approvedOn must be YYYY-MM-DD, got ${out.approvedOn}`,
    );
  }
  if (out.state) out.state = out.state.toUpperCase();
  return Object.freeze(out);
}

// "Licensed Agent · TX". Empty when neither is set.
export function byline({ role, state }) {
  return [role, state].filter(Boolean).join(' · ');
}

// "Jane Q. Agent" -> "JA". For the avatar when there's no photo.
export function initials(name) {
  const parts = name.split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
  if (!parts.length) return '';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// The reviews a page may show. Production: approved only. Development:
// everything, so placeholders can be laid out before approvals arrive.
export function visibleTestimonials(list, { includeDrafts = false } = {}) {
  const normalized = list.map(normalizeTestimonial);
  const ids = new Set();
  for (const t of normalized) {
    if (ids.has(t.id)) throw new TypeError(`Duplicate testimonial id ${t.id}`);
    ids.add(t.id);
  }
  return includeDrafts ? normalized : normalized.filter((t) => t.approvedOn);
}

// Placeholder copy. Replace with approved reviews; keep the shape.
export const TESTIMONIALS = [
  {
    id: 'placeholder-1',
    quote:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.',
    name: 'Lorem Ipsum',
    role: 'Licensed Agent',
    state: 'TX',
  },
  {
    id: 'placeholder-2',
    quote:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    name: 'Dolor Sitamet',
    role: 'Licensed Agent',
    state: 'FL',
  },
  {
    id: 'placeholder-3',
    quote:
      'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.',
    name: 'Consectetur Adipiscing',
    role: 'Licensed Agent',
    state: 'GA',
    disclosure: 'Lorem ipsum: received complimentary leads.',
  },
];
