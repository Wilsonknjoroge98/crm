export const REQUIRED_COLUMNS = [
  { field: 'Full Name', example: 'Jane Smith' },
  { field: 'Email', example: 'jane.smith@email.com' },
  { field: 'Phone', example: '5559876543' },
  { field: 'Date of Birth', example: '1979-11-08' },
  { field: 'Address', example: '123 Main St' },
  { field: 'City', example: 'Dallas' },
  { field: 'State', example: 'California' },
  { field: 'Zip Code', example: '75201' },
  { field: 'Occupation', example: 'Electrician' },
  { field: 'Marital Status', example: 'single' },
  { field: 'Annual Income', example: '85000' },
  { field: 'Policy Number', example: '6260035951' },
  { field: 'Premium Amount', example: '112.75' },
  { field: 'Coverage Amount', example: '30000' },
  { field: 'Status', example: 'active' },
  { field: 'Effective Date', example: '2026-06-01' },
  { field: 'Sold Date', example: '2026-05-25' },
  { field: 'Draft Day', example: '14' },
  { field: 'Premium Frequency', example: 'monthly' },
  { field: 'Primary Beneficiary 1 Name', example: 'Mary Smith' },
  { field: 'Primary Beneficiary 1 Relationship', example: 'Spouse' },
  { field: 'Primary Beneficiary 1 Allocation %', example: '100' },
];

const REQUIRED_COLUMN_LAYOUT = [
  REQUIRED_COLUMNS.slice(0, 11),
  REQUIRED_COLUMNS.slice(11, 19),
  REQUIRED_COLUMNS.slice(19, 22),
];

export const OPTIONAL_BENEFICIARY_COLUMNS = [
  { field: 'Primary Beneficiary 2 Name', example: 'John Smith' },
  { field: 'Primary Beneficiary 2 Relationship', example: 'Child' },
  { field: 'Primary Beneficiary 2 Allocation %', example: '50' },
  { field: 'Contingent Beneficiary 1 Name', example: 'Sam Smith' },
  { field: 'Contingent Beneficiary 1 Relationship', example: 'Sibling' },
  { field: 'Contingent Beneficiary 1 Allocation %', example: '100' },
  { field: 'Contingent Beneficiary 2 Name', example: 'Alex Smith' },
  { field: 'Contingent Beneficiary 2 Relationship', example: 'Parent' },
  { field: 'Contingent Beneficiary 2 Allocation %', example: '50' },
];

export const OPTIONAL_COLUMNS = [
  { field: 'Lead Vendor', example: 'Self Generated' },
];

export const MORE_OPTIONAL_COLUMNS = [
  { field: 'Smoker', example: 'true' },
  { field: 'Height (Feet)', example: '5' },
  { field: 'Height (Inches)', example: '10' },
  { field: 'Weight', example: '185' },
  { field: 'Cholesterol Medication', example: 'false' },
  { field: 'Blood Pressure Medication', example: 'true' },
  { field: 'Notes', example: 'Prefers afternoon calls' },
];

export const POLICY_OPTIONAL_COLUMNS = [
  { field: 'Carrier', example: 'Mutual of Omaha' },
  { field: 'Product', example: 'Accidental Death' },
  { field: 'Other Agent Email', example: 'agent@email.com' },
  { field: 'Other Agent Commission Share', example: '50' },
];

export const FIELD_COLUMN_LAYOUT = [
  [...REQUIRED_COLUMN_LAYOUT[0], ...OPTIONAL_COLUMNS],
  [...REQUIRED_COLUMN_LAYOUT[1], ...POLICY_OPTIONAL_COLUMNS],
  [...REQUIRED_COLUMN_LAYOUT[2], ...OPTIONAL_BENEFICIARY_COLUMNS],
];

const TEMPLATE_BENEFICIARY_COLUMNS = [
  ...REQUIRED_COLUMN_LAYOUT[2],
  ...OPTIONAL_BENEFICIARY_COLUMNS.filter(({ field }) =>
    /^Contingent Beneficiary 1 /.test(field)),
];

export const TEMPLATE_COLUMNS = [
  ...FIELD_COLUMN_LAYOUT[0],
  ...MORE_OPTIONAL_COLUMNS,
  ...FIELD_COLUMN_LAYOUT[1],
  ...TEMPLATE_BENEFICIARY_COLUMNS,
];

export const FIELD_HELP = {
  'Full Name': 'Enter first and last name in one cell.',
  Email: 'Use a valid email address.',
  Phone: 'Use a 10-digit phone number. Common punctuation is okay.',
  'Date of Birth': 'Use YYYY-MM-DD format.',
  Address: 'Use the street address only.',
  City: 'Use the client city.',
  State: 'Use the full state name.',
  'Zip Code': 'Use a 5-digit ZIP code.',
  Occupation: 'Use the client occupation.',
  'Marital Status': 'Use single, married, divorced, or widowed.',
  'Annual Income': 'Use numbers only. Do not include dollar signs or commas.',
  'Policy Number': 'Use the carrier policy number exactly as written.',
  'Premium Amount': 'Use a number only. Do not include a dollar sign.',
  'Coverage Amount': 'Use a number only. Do not include dollar signs or commas.',
  Status: 'Use active, pending, lapsed, cancelled, or insufficient funds.',
  'Effective Date': 'Use YYYY-MM-DD format.',
  'Sold Date': 'Use YYYY-MM-DD format.',
  'Draft Day': 'Use a whole number from 1 to 31.',
  'Premium Frequency': 'Use weekly, monthly, quarterly, semi-annually, or annually.',
  'Lead Vendor': 'Will default to Self Generated if missing or invalid.',
  Smoker: 'Use true or false.',
  'Height (Feet)': 'Use feet only as a whole number.',
  'Height (Inches)': 'Use remaining inches only as a whole number.',
  Weight: 'Use pounds only as a whole number.',
  'Cholesterol Medication': 'Use true or false.',
  'Blood Pressure Medication': 'Use true or false.',
  Notes: 'Free-form notes for this record.',
  Carrier:
    'Carrier and Product default together if either value is missing or invalid.',
  Product:
    'Carrier and Product default together if either value is missing or invalid.',
  'Other Agent Email': 'Use a valid email if another agent shares commission.',
  'Other Agent Commission Share': 'Use a whole number from 0 to 100.',
};

export const optionValue = (option) =>
  (typeof option === 'string' ? option : option.name);

export const normalizeOptions = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values.map((v) => v.trim());
};

const isPercentColumn = (header) =>
  /^(Primary|Contingent) Beneficiary \d+ Allocation %$/.test(header) ||
  header === 'Other Agent Commission Share';

export const parseCsvText = (text) => {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '');

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]).map((c) => c.replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
};

export const parseUploadFile = async (file) => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension !== 'xlsx') return parseCsvText(await file.text());

  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheet = workbook.getWorksheet('Bulk Upload') || workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    headers[columnNumber - 1] = String(cell.value ?? '').trim();
  });

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const parsedRow = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      const value = cell.value;
      const text = value && typeof value === 'object' && 'text' in value
        ? value.text
        : value;
      const shouldScalePercent =
        isPercentColumn(header) &&
        typeof value === 'number' &&
        String(cell.numFmt || '').includes('%');
      parsedRow[header] = String(shouldScalePercent ? value * 100 : text ?? '').trim();
      if (parsedRow[header]) hasValue = true;
    });

    if (hasValue) rows.push(parsedRow);
  });

  return rows;
};
