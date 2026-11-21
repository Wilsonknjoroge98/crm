// node --test client/src/utils/keyleyEstimate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateFromLead, isKeyleyLead, parsePremium, stateAbbr } from './keyleyEstimate.js';

// A Keyley mortgage lead as the CRM would store it (columns per keyley/crm.js, snake_case).
const row = {
  lead_vendor_name: 'Keyley',
  first_name: 'Shea',
  last_name: 'Morales',
  state: 'Arizona',
  date_of_birth: '1974-03-02',
  sex: 'Male',
  smoker: false,
  face_amount: '520000',
  premium: null, // the CRM's ingest stores a range as premium_min / premium_max
  premium_min: 119,
  premium_max: 154,
  why: 'Mortgage protection',
  homeowner: true,
  mortgage_balance: 516770,
  mortgage_years_left: 27,
  term_years: 15,
  street_address: '5059 E Gallop Wy',
  city: 'Scottsdale',
  zip: '85254',
  home_value: 639021,
  home_value_confidence: 82,
  created_at: '2026-11-06T17:00:00Z',
};

test('builds the estimate the lead saw', () => {
  const d = estimateFromLead(row, { name: 'Wilson Kamau', npn: '12345678', photoDataUrl: null });
  assert.equal(d.firstName, 'Shea');
  assert.deepEqual(d.address, { line1: '5059 E Gallop Wy', line2: 'Scottsdale, AZ 85254' });
  assert.deepEqual(d.person, { sex: 'male', dob: { y: '1974', m: '03', d: '02' }, tobacco: false });
  assert.equal(d.homeValue, 639021);
  assert.equal(d.balance, 516770);
  assert.equal(d.yearsLeft, 27);
  assert.deepEqual(d.quote, { low: 119, high: 154, term: 15, coverage: 520000 });
  assert.equal(d.agent.name, 'Wilson Kamau');
  assert.equal(d.callNumber, '+18338927535');
});

test('hides home value under the confidence the site uses', () => {
  assert.equal(estimateFromLead({ ...row, home_value_confidence: 60 }).homeValue, null);
  assert.equal(estimateFromLead({ ...row, home_value_confidence: null }).homeValue, null);
});

test('the price comes from premium_min / premium_max, with the text as a fallback', () => {
  const d = estimateFromLead({ ...row, premium_min: 120.4, premium_max: 153.6 });
  assert.deepEqual([d.quote.low, d.quote.high], [120, 154]);
  const t = estimateFromLead({ ...row, premium_min: null, premium_max: null, premium: '$119-$154' });
  assert.deepEqual([t.quote.low, t.quote.high], [119, 154]);
});

test('every Keyley lead gets one, owner or not; none for non-Keyley or incomplete leads', () => {
  assert.equal(estimateFromLead({ ...row, lead_vendor_name: 'GSQ' }), null);
  assert.notEqual(estimateFromLead({ ...row, homeowner: false }), null);
  assert.notEqual(estimateFromLead({ ...row, why: 'Term life' }), null); // older records
  assert.equal(estimateFromLead({ ...row, mortgage_balance: null }), null);
  assert.equal(estimateFromLead({ ...row, term_years: null }), null);
});

test('missing pieces are left out, not invented', () => {
  const d = estimateFromLead({ ...row, premium_min: null, premium_max: null, street_address: null, date_of_birth: null });
  assert.equal(d.quote, null);
  assert.equal(d.address, null);
  assert.deepEqual(d.person.dob, { m: '', d: '', y: '' });
  assert.equal(estimateFromLead({ ...row, sex: null }).person, null);
  assert.equal(estimateFromLead({ ...row, mortgage_years_left: null }).yearsLeft, 15);
});

test('helpers', () => {
  assert.ok(isKeyleyLead({ brand: 'keyley' }) && isKeyleyLead({ lead_type: 'Keyley' }) && !isKeyleyLead({}));
  assert.deepEqual(parsePremium('$119 – $154'), { low: 119, high: 154 });
  assert.deepEqual(parsePremium('$86'), { low: 86, high: 86 });
  assert.equal(parsePremium(''), null);
  assert.equal(stateAbbr('new york'), 'NY');
  assert.equal(stateAbbr('az'), 'AZ');
});
