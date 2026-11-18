import MultiSelectFilter from './MultiSelectFilter';

// Source filter, worded like the business card's Source line: brand plus,
// for GSQ, the product (gsq_instant_form). Outside lead vendors are being
// retired, so these cover every lead. Keys mirror the server's
// SOURCE_FILTERS (endpoints/business.js).
export const SOURCE_FILTER_OPTIONS = [
  { key: 'gsq_website', label: 'GSQ Website' },
  { key: 'gsq_instant_form', label: 'GSQ Instant Form' },
  { key: 'keyley', label: 'Keyley' },
];

const SourceFilter = ({ value, onChange }) => (
  <MultiSelectFilter
    label='Source'
    options={SOURCE_FILTER_OPTIONS}
    value={value}
    onChange={onChange}
  />
);

export default SourceFilter;
