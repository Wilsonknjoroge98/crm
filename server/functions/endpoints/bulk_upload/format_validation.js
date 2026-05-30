// User-facing CSV columns that must exist before any database checks run.
const REQUIRED_FIELDS = [
  'Full Name',
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
  'Policy Number',
  'Premium Amount',
  'Coverage Amount',
  'Status',
  'Effective Date',
  'Sold Date',
  'Draft Day',
  'Premium Frequency',
  'Primary Beneficiary 1 Name',
  'Primary Beneficiary 1 Relationship',
  'Primary Beneficiary 1 Allocation %',
];

const PERSON_FIELDS = [
  'Full Name',
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
  'Lead Vendor',
  'Smoker',
  'Height (Feet)',
  'Height (Inches)',
  'Weight',
  'Cholesterol Medication',
  'Blood Pressure Medication',
  'Notes',
];

const MARITAL_STATUSES = new Set(['single', 'married', 'divorced', 'widowed']);
const POLICY_STATUSES = new Set([
  'active',
  'pending',
  'lapsed',
  'cancelled',
  'insufficient funds',
]);
const PREMIUM_FREQUENCIES = new Set([
  'weekly',
  'monthly',
  'quarterly',
  'semi-annually',
  'annually',
]);
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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const NUMBER_REGEX = /^\d+(\.\d+)?$/;
const INTEGER_REGEX = /^\d+$/;

// Lightweight parsers keep validation strict and avoid accepting formatted money or phone values.
const value = (row, field) => String(row[field] ?? '').trim();

const normalizeString = (raw) => String(raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const parsePhone = (raw) => {
  const phone = String(raw ?? '').trim();
  return PHONE_REGEX.test(phone) ? phone : null;
};

const parseDate = (raw) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw
    ? raw
    : null;
};

const parseNumber = (raw) => {
  if (raw === '') return null;
  if (!NUMBER_REGEX.test(String(raw))) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseInteger = (raw) => {
  if (raw === '') return null;
  if (!INTEGER_REGEX.test(String(raw))) return undefined;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
};

const parseBoolean = (raw) => {
  if (raw === '') return null;
  const normalized = raw.toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return undefined;
};

const normalizePersonValue = (field, raw) => {
  const trimmed = value({ [field]: raw }, field);

  if (field === 'Phone') return parsePhone(trimmed) || trimmed;
  if (field === 'Email') return trimmed.toLowerCase();
  if (field === 'Date of Birth') return parseDate(trimmed) || trimmed;
  if (field === 'Annual Income') {
    const parsed = parseNumber(trimmed);
    return parsed === undefined ? trimmed : String(parsed ?? '');
  }
  if (['Smoker', 'Cholesterol Medication', 'Blood Pressure Medication'].includes(field)) {
    const parsed = parseBoolean(trimmed);
    return parsed === undefined ? trimmed.toLowerCase() : String(parsed ?? '');
  }
  if (['Height (Feet)', 'Height (Inches)', 'Weight'].includes(field)) {
    const parsed = parseInteger(trimmed);
    return parsed === undefined ? trimmed : String(parsed ?? '');
  }
  return normalizeString(trimmed);
};

const getBeneficiaries = (row, type) => {
  const label = type === 'primary' ? 'Primary' : 'Contingent';
  const pattern = new RegExp(`^${label} Beneficiary (\\d+) (Name|Relationship|Allocation %)$`);
  const byIndex = new Map();

  Object.keys(row).forEach((field) => {
    const match = field.match(pattern);
    if (!match) return;

    const index = Number(match[1]);
    const part = match[2];
    if (!byIndex.has(index)) {
      byIndex.set(index, { index, name: '', relationship: '', allocation: '' });
    }

    const beneficiary = byIndex.get(index);
    if (part === 'Name') beneficiary.name = value(row, field);
    if (part === 'Relationship') beneficiary.relationship = value(row, field);
    if (part === 'Allocation %') beneficiary.allocation = value(row, field);
  });

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
};

const validateBeneficiarySet = (row, rowNumber, type) => {
  const prefix = type === 'primary' ? 'Primary' : 'Contingent';
  const beneficiaries = getBeneficiaries(row, type);
  const errors = [];

  const populated = beneficiaries.filter(
    (beneficiary) =>
      beneficiary.name || beneficiary.relationship || beneficiary.allocation,
  );

  if (!populated.length && type === 'contingent') return errors;

  if (!populated.length) {
    errors.push({ row: rowNumber, message: `${prefix} Beneficiaries is required` });
    return errors;
  }

  populated.forEach((beneficiary) => {
    if (!beneficiary.name || !beneficiary.relationship || !beneficiary.allocation) {
      errors.push({
        row: rowNumber,
        message:
          `${prefix} Beneficiary ${beneficiary.index} must include name, relationship, and allocation %`,
      });
    }
  });

  const allocations = populated.map((beneficiary) =>
    parseNumber(beneficiary.allocation),
  );
  const invalidAllocationIndex = allocations.findIndex(
    (allocation) => allocation === null || allocation === undefined,
  );
  if (invalidAllocationIndex !== -1) {
    errors.push({
      row: rowNumber,
      message: `${prefix} Allocations must be numbers`,
    });
  }

  const outOfRangeAllocationIndex = allocations.findIndex(
    (allocation) => typeof allocation === 'number' && (allocation < 0 || allocation > 100),
  );
  if (outOfRangeAllocationIndex !== -1) {
    errors.push({
      row: rowNumber,
      message: `${prefix} Allocations must be between 0 and 100`,
    });
  }

  populated.forEach((beneficiary) => {
    if (beneficiary.relationship && !RELATIONSHIPS.has(beneficiary.relationship)) {
      errors.push({
        row: rowNumber,
        message:
          `${prefix} Beneficiary ${beneficiary.index} Relationship contains invalid option "${beneficiary.relationship}"`,
      });
    }
  });

  if (allocations.every((allocation) => typeof allocation === 'number')) {
    const total = allocations.reduce((sum, allocation) => sum + allocation, 0);
    if (Math.abs(total - 100) > 0.001) {
      errors.push({
        row: rowNumber,
        message: `${prefix} Allocations must total 100`,
      });
    }
  }

  return errors;
};

// Per-row validation only checks CSV shape and primitive formats.
const validateRowFormat = (row, rowNumber) => {
  const errors = [];
  const missing = REQUIRED_FIELDS.filter((field) => !value(row, field));
  if (missing.length) {
    errors.push({
      row: rowNumber,
      message: `Missing required field(s): ${missing.join(', ')}`,
    });
  }

  if (value(row, 'Email') && !EMAIL_REGEX.test(value(row, 'Email').toLowerCase())) {
    errors.push({ row: rowNumber, message: 'Email is invalid' });
  }

  if (value(row, 'Phone') && !parsePhone(value(row, 'Phone'))) {
    errors.push({ row: rowNumber, message: 'Phone must contain 10 digits' });
  }

  ['Date of Birth', 'Effective Date', 'Sold Date'].forEach((field) => {
    if (value(row, field) && !parseDate(value(row, field))) {
      errors.push({ row: rowNumber, message: `${field} must be a valid date` });
    }
  });

  ['Annual Income', 'Premium Amount', 'Coverage Amount'].forEach((field) => {
    if (value(row, field)) {
      const parsed = parseNumber(value(row, field));
      if (parsed === undefined || parsed === null) {
        errors.push({ row: rowNumber, message: `${field} must be a number` });
      }
    }
  });

  const draftDay = parseInteger(value(row, 'Draft Day'));
  if (value(row, 'Draft Day') && (!draftDay || draftDay < 1 || draftDay > 31)) {
    errors.push({ row: rowNumber, message: 'Draft Day must be a whole number from 1 to 31' });
  }

  const maritalStatus = value(row, 'Marital Status').toLowerCase();
  if (maritalStatus && !MARITAL_STATUSES.has(maritalStatus)) {
    errors.push({
      row: rowNumber,
      message: 'Marital Status must be single, married, divorced, or widowed',
    });
  }

  const policyStatus = value(row, 'Status').toLowerCase();
  if (policyStatus && !POLICY_STATUSES.has(policyStatus)) {
    errors.push({
      row: rowNumber,
      message: 'Status must be active, pending, lapsed, cancelled, or insufficient funds',
    });
  }

  const premiumFrequency = value(row, 'Premium Frequency').toLowerCase();
  if (premiumFrequency && !PREMIUM_FREQUENCIES.has(premiumFrequency)) {
    errors.push({
      row: rowNumber,
      message: 'Premium Frequency must be weekly, monthly, quarterly, semi-annually, or annually',
    });
  }

  ['Smoker', 'Cholesterol Medication', 'Blood Pressure Medication'].forEach((field) => {
    if (value(row, field) && parseBoolean(value(row, field)) === undefined) {
      errors.push({ row: rowNumber, message: `${field} must be true or false` });
    }
  });

  ['Height (Feet)', 'Height (Inches)', 'Weight'].forEach((field) => {
    if (value(row, field) && parseInteger(value(row, field)) === undefined) {
      errors.push({ row: rowNumber, message: `${field} must be a whole number` });
    }
  });

  if (value(row, 'Other Agent Email') && !EMAIL_REGEX.test(value(row, 'Other Agent Email').toLowerCase())) {
    errors.push({ row: rowNumber, message: 'Other Agent Email is invalid' });
  }

  const splitShare = parseInteger(value(row, 'Other Agent Commission Share'));
  if (
    value(row, 'Other Agent Commission Share') &&
    (splitShare === undefined || splitShare < 0 || splitShare > 100)
  ) {
    errors.push({
      row: rowNumber,
      message: 'Other Agent Commission Share must be a whole number from 0 to 100',
    });
  }

  return [
    ...errors,
    ...validateBeneficiarySet(row, rowNumber, 'primary'),
    ...validateBeneficiarySet(row, rowNumber, 'contingent'),
  ];
};

// Same phone can appear on multiple policy rows only when person fields match exactly.
const validateInternalDuplicates = (rows) => {
  const errors = [];
  const policiesByNumber = new Map();
  const peopleByPhone = new Map();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const policyNumber = value(row, 'Policy Number');
    const phone = parsePhone(value(row, 'Phone'));

    if (policyNumber) {
      const normalizedPolicyNumber = normalizeString(policyNumber);
      if (policiesByNumber.has(normalizedPolicyNumber)) {
        errors.push({
          row: rowNumber,
          message: `Duplicate policy number also appears on row ${policiesByNumber.get(normalizedPolicyNumber)}`,
        });
      } else {
        policiesByNumber.set(normalizedPolicyNumber, rowNumber);
      }
    }

    if (!phone) return;

    if (!peopleByPhone.has(phone)) {
      peopleByPhone.set(phone, {
        rowNumber,
        values: Object.fromEntries(
          PERSON_FIELDS.map((field) => [field, normalizePersonValue(field, row[field])]),
        ),
      });
      return;
    }

    const existing = peopleByPhone.get(phone);
    PERSON_FIELDS.forEach((field) => {
      const current = normalizePersonValue(field, row[field]);
      if (existing.values[field] !== current) {
        errors.push({
          row: rowNumber,
          message: `Phone matches row ${existing.rowNumber}, but ${field} is different`,
        });
      }
    });
  });

  return errors;
};

// Module entrypoint for stage 1.
const validateFormat = (rows) => {
  const rowErrors = rows.flatMap((row, index) => validateRowFormat(row, index + 2));
  const duplicateErrors = validateInternalDuplicates(rows);
  const errors = [...rowErrors, ...duplicateErrors];

  return {
    error: errors.length > 0,
    message: errors.length
      ? 'CSV failed format validation'
      : 'CSV passed format validation',
    total: rows.length,
    inserted: 0,
    failed: errors.length ? rows.length : 0,
    errors,
    warnings: [],
    stage: 'format_validation',
  };
};

module.exports = { validateFormat };
