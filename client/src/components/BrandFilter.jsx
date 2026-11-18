import MultiSelectFilter from './MultiSelectFilter';
import { BRANDS } from '../utils/brands';

// Source filter: leads.brand keys. Labelled Source to match the business
// card; outside lead vendors are being retired, so a lead's source is always
// its brand (GSQ or Keyley).
const BrandFilter = ({ value, onChange }) => (
  <MultiSelectFilter
    label='Source'
    options={BRANDS}
    value={value}
    onChange={onChange}
  />
);

export default BrandFilter;
