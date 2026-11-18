import MultiSelectFilter from './MultiSelectFilter';
import { SEGMENT_CHIPS } from '../utils/constants';

// Lead Age filter: gsq_segment keys, each swatched in its card chip's colors
// so the menu reads as a key to the chips below.
const SEGMENT_OPTIONS = Object.entries(SEGMENT_CHIPS).map(
  ([key, { label, bgcolor, color }]) => ({
    key,
    label,
    swatch: { bgcolor, color },
  }),
);

const SegmentFilter = ({ value, onChange }) => (
  <MultiSelectFilter
    label='Lead Age'
    options={SEGMENT_OPTIONS}
    value={value}
    onChange={onChange}
  />
);

export default SegmentFilter;
