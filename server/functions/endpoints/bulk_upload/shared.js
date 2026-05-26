const REQUIRED_LEAD_FIELDS = ['Name', 'Email', 'Phone', 'Date of Birth', 'State'];
const REQUIRED_CLIENT_FIELDS = ['Name', 'Email', 'Phone', 'Date of Birth', 'Address', 'City', 'State', 'Zip Code', 'Occupation', 'Marital Status', 'Annual Income', ];
const REQUIRED_POLICY_FIELDS = ['Policy Number', 'Client Phone', 'Premium Amount', 'Coverage Amount', 'Status', 'Effective Date', 'Sold Date', 'Draft Day', 'Premium Frequency'];
const REQUIRED_BENEFICIARY_FIELDS = ['Policy Number', 'Beneficiary Type', 'First Name', 'Last Name', 'Relationship', 'Allocation Percent'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MARITAL_STATUSES = new Set(['single', 'married', 'divorced', 'widowed']);
const POLICY_STATUSES = new Set(['active', 'pending', 'lapsed', 'cancelled', 'insufficient funds']);
const PREMIUM_FREQUENCIES = new Set(['weekly', 'monthly', 'quarterly', 'semi-annually', 'annually']);
const BENEFICIARY_TYPES = new Set(['primary', 'contingent']);
const RELATIONSHIPS = new Set([
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Fiancé/Fiancée',
  'Domestic Partner',
  'Cousin',
  'Aunt',
  'Uncle',
  'Niece',
  'Nephew',
  'Friend',
  'Legal Guardian',
  'Business Partner',
  'Trust',
  'Estate',
  'Charity',
  'Other',
]);
const INVALID_CARRIER_REFERENCE = 'MIGRATION//INVALID REFERENCE';
const INVALID_PRODUCT_REFERENCE = 'MIGRATION/INVALID REFERENCE';

const value = (row, field) => String(row[field] ?? '').trim();

const parseName = (raw) => {
  const parts = raw.replace(/\s+/g, ' ').split(' ');
  return parts.length < 2
    ? null
    : { first_name: parts[0], last_name: parts.slice(1).join(' ') };
};

const parsePhone = (raw) => {
  let phone = raw.replace(/\D/g, '');
  if (phone.length === 11 && phone.startsWith('1')) phone = phone.slice(1);
  return phone.length === 10 ? phone : null;
};

const parseBoolean = (raw, fallback = null) => {
  if (raw === '') return fallback;
  const normalized = raw.toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return undefined;
};

const parseNumber = (raw) => {
  if (raw === '') return null;
  const parsed = Number(raw.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (raw) => {
  const parsed = parseNumber(raw);
  if (parsed === null) return null;
  return Number.isInteger(parsed) ? parsed : undefined;
};

const parseDate = (raw) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw
    ? raw
    : null;
};

const rowsByName = (rows) =>
  new Map((rows || []).map((row) => [row.name.toLowerCase(), row]));

module.exports = {
  BENEFICIARY_TYPES,
  EMAIL_REGEX,
  INVALID_CARRIER_REFERENCE,
  INVALID_PRODUCT_REFERENCE,
  MARITAL_STATUSES,
  POLICY_STATUSES,
  PREMIUM_FREQUENCIES,
  RELATIONSHIPS,
  REQUIRED_BENEFICIARY_FIELDS,
  REQUIRED_CLIENT_FIELDS,
  REQUIRED_LEAD_FIELDS,
  REQUIRED_POLICY_FIELDS,
  parseBoolean,
  parseDate,
  parseInteger,
  parseName,
  parseNumber,
  parsePhone,
  rowsByName,
  value,
};
