import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESULTS_DISCLAIMER,
  TESTIMONIALS,
  byline,
  initials,
  normalizeTestimonial,
  visibleTestimonials,
} from '../src/views/landing/testimonials/testimonials.js';

const base = { id: 'a', quote: ' Great leads. ', name: 'Jane Agent' };

test('a review keeps only known fields, so it cannot restyle itself', () => {
  const t = normalizeTestimonial({
    ...base,
    state: 'tx',
    sx: { color: 'red' },
    style: { fontSize: 40 },
    className: 'loud',
    color: '#f00',
  });
  assert.deepEqual(t, {
    id: 'a',
    quote: 'Great leads.',
    name: 'Jane Agent',
    state: 'TX',
  });
  assert.ok(Object.isFrozen(t));
});

test('a review without quote, name or id is rejected', () => {
  for (const key of ['id', 'quote', 'name']) {
    assert.throws(
      () => normalizeTestimonial({ ...base, [key]: '  ' }),
      /needs/,
    );
  }
  assert.throws(() => normalizeTestimonial(null), /object/);
});

test('approvedOn must be a YYYY-MM-DD date', () => {
  assert.throws(
    () => normalizeTestimonial({ ...base, approvedOn: 'Nov 14' }),
    /YYYY-MM-DD/,
  );
  assert.equal(
    normalizeTestimonial({ ...base, approvedOn: '2026-11-14' }).approvedOn,
    '2026-11-14',
  );
});

test('production shows approved reviews only; development shows drafts too', () => {
  const list = [base, { ...base, id: 'b', approvedOn: '2026-11-14' }];
  assert.deepEqual(
    visibleTestimonials(list).map((t) => t.id),
    ['b'],
  );
  assert.deepEqual(
    visibleTestimonials(list, { includeDrafts: true }).map((t) => t.id),
    ['a', 'b'],
  );
});

test('duplicate ids are rejected', () => {
  assert.throws(() => visibleTestimonials([base, base]), /Duplicate/);
});

test('placeholders never reach production', () => {
  assert.equal(visibleTestimonials(TESTIMONIALS).length, 0);
  assert.ok(visibleTestimonials(TESTIMONIALS, { includeDrafts: true }).length);
});

test('byline, initials and the disclaimer', () => {
  assert.equal(
    byline({ role: 'Licensed Agent', state: 'TX' }),
    'Licensed Agent · TX',
  );
  assert.equal(byline({ state: 'TX' }), 'TX');
  assert.equal(byline({}), '');
  assert.equal(initials('Jane Q. Agent'), 'JA');
  assert.equal(initials('Cher'), 'C');
  assert.match(RESULTS_DISCLAIMER, /not typical/);
});
