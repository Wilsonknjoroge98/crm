import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SOURCE,
  brandLabel,
  isHouseLead,
  sourceFields,
  sourceOptions,
  sourceValue,
} from '../src/utils/brands.js';

test('Lead Source lists the brands first and hides the retired GSQ vendor', () => {
  const options = sourceOptions([
    { id: 'v-gsq', name: 'GetSeniorQuotes.com' },
    { id: 'v-ref', name: 'Referral' },
  ]);

  assert.deepEqual(options, [
    { value: 'brand:gsq', label: 'GSQ' },
    { value: 'brand:keyley', label: 'Keyley' },
    { value: 'v-ref', label: 'Referral' },
  ]);
});

test('a brand option sets the brand and clears the vendor, and back', () => {
  assert.deepEqual(sourceFields('brand:keyley'), {
    brand: 'keyley',
    lead_vendor_id: null,
  });
  assert.deepEqual(sourceFields('v-ref'), { brand: null, lead_vendor_id: 'v-ref' });
  assert.equal(sourceValue({ brand: 'keyley', lead_vendor_id: null }), 'brand:keyley');
  assert.equal(sourceValue({ brand: null, lead_vendor_id: 'v-ref' }), 'v-ref');
  assert.equal(DEFAULT_SOURCE, 'brand:gsq');
});

test('house leads are the ones with a known brand', () => {
  assert.equal(isHouseLead({ brand: 'gsq' }), true);
  assert.equal(isHouseLead({ brand: 'keyley' }), true);
  assert.equal(isHouseLead({ brand: null, lead_vendor_id: 'v-ref' }), false);
  assert.equal(brandLabel('keyley'), 'Keyley');
  assert.equal(brandLabel(null), null);
});
