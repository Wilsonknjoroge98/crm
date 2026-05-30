import {
  optionValue,
} from './bulkUpload';

const STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

const RELATIONSHIPS = [
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

const MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed'];
const POLICY_STATUSES = ['active', 'pending', 'lapsed', 'cancelled', 'insufficient funds'];
const PREMIUM_FREQUENCIES = ['weekly', 'monthly', 'quarterly', 'semi-annually', 'annually'];
const BOOLEAN_VALUES = ['true', 'false'];
const REQUIRED_TEMPLATE_FIELDS = new Set([
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
]);

const columnName = (index) => {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
};

const listValues = (options, fallback = []) => {
  const values = options.map(optionValue).filter(Boolean);
  return values.length ? values : fallback;
};

const listFormula = (list) =>
  `Lists!$${list.column}$1:$${list.column}$${list.values.length}`;

const inlineListFormula = (values) =>
  `"${values.join(',')}"`;

const applyListValidation = (worksheet, columnIndex, formula, required = false) => {
  for (let rowNumber = 2; rowNumber <= 501; rowNumber++) {
    worksheet.getCell(rowNumber, columnIndex + 1).dataValidation = {
      type: 'list',
      allowBlank: !required,
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid value',
      error: 'Choose a value from the dropdown.',
      formulae: [formula],
    };
  }
};

const applyValidation = (worksheet, columnIndex, getValidation) => {
  for (let rowNumber = 2; rowNumber <= 501; rowNumber++) {
    worksheet.getCell(rowNumber, columnIndex + 1).dataValidation =
      getValidation(rowNumber);
  }
};

const optionalCustomFormula = ({ cellRef, formula, required }) =>
  required ? formula : `OR(${cellRef}="",${formula})`;

const beneficiaryHeaderNote = (header) => {
  if (header === 'Primary Beneficiary 1 Name') {
    return [
      'To add more primary beneficiaries, add columns named:',
      'Primary Beneficiary 2 Name',
      'Primary Beneficiary 2 Relationship',
      'Primary Beneficiary 2 Allocation %',
      'Then continue numbering for additional beneficiaries.',
    ].join('\n');
  }

  if (header === 'Contingent Beneficiary 1 Name') {
    return [
      'To add more contingent beneficiaries, add columns named:',
      'Contingent Beneficiary 2 Name',
      'Contingent Beneficiary 2 Relationship',
      'Contingent Beneficiary 2 Allocation %',
      'Then continue numbering for additional beneficiaries.',
    ].join('\n');
  }

  return null;
};

export const createBulkUploadTemplateXlsx = async ({
  columns,
  leadVendorOptions = [],
  carrierOptions = [],
  productOptions = [],
}) => {
  const headers = columns.map(({ field }) => field);
  const ExcelJSModule = await import('exceljs');
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const workbook = new ExcelJS.Workbook();
  const uploadSheet = workbook.addWorksheet('Bulk Upload');
  const listsSheet = workbook.addWorksheet('Lists', { state: 'hidden' });
  const lists = [
    { name: 'States', values: STATES },
    { name: 'Marital Statuses', values: MARITAL_STATUSES },
    { name: 'Policy Statuses', values: POLICY_STATUSES },
    { name: 'Premium Frequencies', values: PREMIUM_FREQUENCIES },
    { name: 'Relationships', values: RELATIONSHIPS },
    { name: 'Boolean Values', values: BOOLEAN_VALUES },
    { name: 'Lead Vendors', values: listValues(leadVendorOptions, ['Self Generated']) },
    { name: 'Carriers', values: listValues(carrierOptions, ['MIGRATION//INVALID REFERENCE']) },
    { name: 'Products', values: listValues(productOptions, ['MIGRATION/INVALID REFERENCE']) },
  ];

  uploadSheet.addRow(headers);
  uploadSheet.views = [{ state: 'frozen', ySplit: 1 }];
  uploadSheet.getRow(1).font = { bold: true };
  uploadSheet.columns = headers.map((header) => ({
    key: header,
    width: Math.max(14, Math.min(36, header.length + 2)),
  }));

  const listsByName = {};
  lists.forEach((list, index) => {
    const column = columnName(index);
    listsByName[list.name] = { ...list, column };
    list.values.forEach((value, rowIndex) => {
      listsSheet.getCell(rowIndex + 1, index + 1).value = value;
    });
  });

  const fallbackProductFormula = listFormula(listsByName.Products);

  headers.forEach((header, index) => {
    const headerCell = uploadSheet.getCell(1, index + 1);
    const required = REQUIRED_TEMPLATE_FIELDS.has(header);
    const column = columnName(index);
    if (REQUIRED_TEMPLATE_FIELDS.has(header)) {
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE3E3' },
      };
      headerCell.note = 'Required field';
    }
    const beneficiaryNote = beneficiaryHeaderNote(header);
    if (beneficiaryNote) {
      headerCell.note = headerCell.note
        ? `${headerCell.note}\n\n${beneficiaryNote}`
        : beneficiaryNote;
    }

    let list = null;

    if (header === 'State') list = listsByName.States;
    if (header === 'Marital Status') list = listsByName['Marital Statuses'];
    if (header === 'Status') list = listsByName['Policy Statuses'];
    if (header === 'Premium Frequency') list = listsByName['Premium Frequencies'];
    if (header === 'Lead Vendor') list = listsByName['Lead Vendors'];
    if (header === 'Carrier') list = listsByName.Carriers;
    if (header === 'Product') {
      applyListValidation(uploadSheet, index, fallbackProductFormula, required);
      return;
    }
    if (header === 'Smoker' ||
      header === 'Cholesterol Medication' ||
      header === 'Blood Pressure Medication'
    ) {
      applyListValidation(uploadSheet, index, inlineListFormula(BOOLEAN_VALUES), required);
      return;
    }
    if (/^(Primary|Contingent) Beneficiary \d+ Relationship$/.test(header)) {
      list = listsByName.Relationships;
    }

    if (list) {
      applyListValidation(uploadSheet, index, listFormula(list), required);
      return;
    }

    if (header === 'Email' || header === 'Other Agent Email') {
      applyValidation(uploadSheet, index, (rowNumber) => {
        const cellRef = `${column}${rowNumber}`;
        return {
          type: 'custom',
          allowBlank: !required,
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid email',
          error: 'Enter a valid email address.',
          formulae: [
            optionalCustomFormula({
              cellRef,
              required,
              formula: `AND(ISNUMBER(SEARCH("@",${cellRef})),ISNUMBER(SEARCH(".",${cellRef})))`,
            }),
          ],
        };
      });
      return;
    }

    if (header === 'Phone') {
      applyValidation(uploadSheet, index, (rowNumber) => {
        const cellRef = `${column}${rowNumber}`;
        const digits =
          `SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${cellRef},"-",""),"(",""),")","")," ",""),".",""),"+","")`;
        return {
          type: 'custom',
          allowBlank: false,
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid phone',
          error: 'Enter a 10-digit phone number.',
          formulae: [`OR(LEN(${digits})=10,AND(LEN(${digits})=11,LEFT(${digits},1)="1"))`],
        };
      });
      return;
    }

    if (header === 'Full Name') {
      applyValidation(uploadSheet, index, (rowNumber) => {
        const cellRef = `${column}${rowNumber}`;
        return {
          type: 'custom',
          allowBlank: false,
          showErrorMessage: true,
          errorStyle: 'error',
          errorTitle: 'Invalid full name',
          error: 'Enter first and last name.',
          formulae: [`ISNUMBER(SEARCH(" ",TRIM(${cellRef})))`],
        };
      });
      return;
    }

    if (['Date of Birth', 'Effective Date', 'Sold Date'].includes(header)) {
      applyValidation(uploadSheet, index, () => ({
        type: 'date',
        operator: 'between',
        allowBlank: !required,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid date',
        error: 'Enter a valid date.',
        formulae: [new Date(1900, 0, 1), new Date(2100, 11, 31)],
      }));
      return;
    }

    if (['Annual Income', 'Premium Amount', 'Coverage Amount'].includes(header)) {
      applyValidation(uploadSheet, index, () => ({
        type: 'decimal',
        operator: 'greaterThanOrEqual',
        allowBlank: !required,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid number',
        error: 'Enter a number greater than or equal to 0.',
        formulae: [0],
      }));
      return;
    }

    if (/^(Primary|Contingent) Beneficiary \d+ Allocation %$/.test(header)) {
      applyValidation(uploadSheet, index, () => ({
        type: 'decimal',
        operator: 'between',
        allowBlank: !required,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid percentage',
        error: 'Enter a percentage from 0 to 100.',
        formulae: [0, 100],
      }));
      return;
    }

    if (header === 'Draft Day') {
      applyValidation(uploadSheet, index, () => ({
        type: 'whole',
        operator: 'between',
        allowBlank: !required,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid draft day',
        error: 'Enter a whole number from 1 to 31.',
        formulae: [1, 31],
      }));
      return;
    }

    if (['Height (Feet)', 'Height (Inches)', 'Weight'].includes(header)) {
      applyValidation(uploadSheet, index, () => ({
        type: 'whole',
        operator: 'greaterThanOrEqual',
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid whole number',
        error: 'Enter a whole number.',
        formulae: [0],
      }));
      return;
    }

    if (header === 'Other Agent Commission Share') {
      applyValidation(uploadSheet, index, () => ({
        type: 'decimal',
        operator: 'between',
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid commission share',
        error: 'Enter a percentage from 0 to 100.',
        formulae: [0, 100],
      }));
      return;
    }

    if (header === 'Zip Code') {
      applyValidation(uploadSheet, index, () => ({
        type: 'textLength',
        operator: 'between',
        allowBlank: false,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid ZIP code',
        error: 'Enter a 5 digit ZIP code.',
        formulae: [5, 5],
      }));
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};
