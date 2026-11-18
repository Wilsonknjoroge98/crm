import MultiSelectFilter from './MultiSelectFilter';
import { BRANDS } from '../utils/brands';

// Brand filter: leads.brand keys. Picking a brand shows only that brand's
// house leads; an agent's own leads have no brand.
const BrandFilter = ({ value, onChange }) => (
  <MultiSelectFilter
    label='Brand'
    options={BRANDS}
    value={value}
    onChange={onChange}
  />
);

export default BrandFilter;
