export const UPLOAD_TYPES = {
  clients: 'clients',
  leads: 'leads',
  policies: 'policies',
  beneficiaries: 'beneficiaries',
};

export const RELATIONSHIP_OPTIONS = [
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
];

export const FIELD_GUIDES = {
  [UPLOAD_TYPES.clients]: [
    { field: 'Name', example: 'John Doe' },
    { field: 'Email', example: 'john.doe@email.com' },
    { field: 'Phone', example: '5551234567' },
    { field: 'Date of Birth', example: '1985-04-22' },
    { field: 'Address', example: '123 Main St' },
    { field: 'City', example: 'Dallas' },
    { field: 'State', example: 'California' },
    { field: 'Zip Code', example: '75201' },
    { field: 'Occupation', example: 'Electrician' },
    { field: 'Marital Status', example: 'single' },
    { field: 'Annual Income', example: '85000' },
    { field: 'Notes', example: 'Prefers afternoon calls' },
  ],
  [UPLOAD_TYPES.leads]: [
    { field: 'Name', example: 'Jane Smith' },
    { field: 'Email', example: 'jane.smith@email.com' },
    { field: 'Phone', example: '5559876543' },
    { field: 'Date of Birth', example: '1979-11-08' },
    { field: 'State', example: 'California' },
    { field: 'Lead Vendor', example: 'Self Generated' },
    { field: 'Smoker', example: 'true' },
    { field: 'Coverage Amount', example: '25000' },
    { field: 'Face Amount Max', example: '50000' },
    { field: 'Monthly Premium', example: '89.5' },
    { field: 'Selected Carrier', example: 'Mutual of Omaha' },
    { field: 'Selected Plan', example: 'Whole Life 20k' },
    { field: 'Beneficiary', example: 'Spouse' },
    { field: 'Priority', example: 'High' },
    { field: 'Reason', example: 'Final expense coverage' },
    { field: 'Height (Feet)', example: '5' },
    { field: 'Height (Inches)', example: '10' },
    { field: 'Weight (Lbs)', example: '185' },
    { field: 'Cholesterol Medication', example: 'false' },
    { field: 'Blood Pressure Medication', example: 'true' },
    { field: 'Verified', example: 'true' },
  ],
  [UPLOAD_TYPES.policies]: [
    { field: 'Policy Number', example: '6260035951' },
    { field: 'Client Phone', example: '5551234567' },
    { field: 'Carrier', example: 'Mutual of Omaha' },
    { field: 'Product', example: 'Accidental Death' },
    { field: 'Premium Amount', example: '112.75' },
    { field: 'Coverage Amount', example: '30000' },
    { field: 'Status', example: 'active' },
    { field: 'Effective Date', example: '2026-06-01' },
    { field: 'Sold Date', example: '2026-05-25' },
    { field: 'Draft Day', example: '14' },
    { field: 'Premium Frequency', example: 'monthly' },
    { field: 'Other Agent Email', example: 'agent@email.com' },
    { field: 'Other Agent Commission Share', example: '50' },
  ],
  [UPLOAD_TYPES.beneficiaries]: [
    { field: 'Policy Number', example: '6260035951' },
    { field: 'Beneficiary Type', example: 'primary/contingent' },
    { field: 'First Name', example: 'Mary' },
    { field: 'Last Name', example: 'Smith' },
    { field: 'Relationship', example: 'Spouse' },
    { field: 'Allocation Percent', example: '100' },
    { field: 'Phone', example: '5551112222' },
  ],
};

export const REQUIRED_FIELDS = {
  [UPLOAD_TYPES.leads]: new Set([
    'Email',
    'Name',
    'Phone',
    'Date of Birth',
    'State',
  ]),
  [UPLOAD_TYPES.clients]: new Set([
    'Name',
    'Email',
    'Phone',
    'Date of Birth',
    'Address',
    'City',
    'State',
    'Zip Code',
    'Occupation',
    'Marital Status',
    'Annual Income',
  ]),
  [UPLOAD_TYPES.policies]: new Set([
    'Policy Number',
    'Client Phone',
    'Premium Amount',
    'Coverage Amount',
    'Status',
    'Effective Date',
    'Sold Date',
    'Draft Day',
    'Premium Frequency',
  ]),
  [UPLOAD_TYPES.beneficiaries]: new Set([
    'Policy Number',
    'Beneficiary Type',
    'First Name',
    'Last Name',
    'Relationship',
    'Allocation Percent',
  ]),
};

export const SELECT_SX = {
  ml: 0.75,
  minWidth: 170,
  '& .MuiInputBase-root': {
    fontSize: 'inherit',
    color: 'text.secondary',
  },
  '& .MuiInputBase-input': {
    py: 0,
  },
  '& .MuiSvgIcon-root': {
    fontSize: '0.95rem',
    color: 'text.secondary',
  },
};

export const SELECT_MENU_PROPS = {
  PaperProps: {
    sx: {
      '& .MuiMenuItem-root': {
        fontSize: '0.875rem',
        color: 'text.secondary',
      },
    },
  },
};

export const normalizeOptions = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
