import MultiSelectFilter from './MultiSelectFilter';
import { BRANDS } from '../utils/brands';

// House Leads filter: leads.brand keys. Labelled House Leads, the app's
// existing name for brand leads, not Brand (never shown to users) or Source
// (on the card and forms that means a brand or a lead vendor).
const BrandFilter = ({ value, onChange }) => (
  <MultiSelectFilter
    label='House Leads'
    options={BRANDS}
    value={value}
    onChange={onChange}
  />
);

export default BrandFilter;
