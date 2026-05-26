const logger = require('firebase-functions/logger');
const { supabaseService } = require('../../services/supabase');
const {
  EMAIL_REGEX,
  REQUIRED_LEAD_FIELDS,
  parseBoolean,
  parseDate,
  parseInteger,
  parseName,
  parseNumber,
  parsePhone,
  value,
} = require('./shared');

const validateLeadRow = (row, rowNumber, agentId, selfGeneratedLeadVendorId, leadVendorsByName) => {
  const missing = REQUIRED_LEAD_FIELDS.filter((field) => !value(row, field));
  if (missing.length) return `Missing required field(s): ${missing.join(', ')}`;

  const name = parseName(value(row, 'Name'));
  if (!name) return 'Name must include first and last name';

  const email = value(row, 'Email').toLowerCase();
  if (!EMAIL_REGEX.test(email)) return 'Email is invalid';

  const phone = parsePhone(value(row, 'Phone'));
  if (!phone) return 'Phone must contain 10 digits';

  const dateOfBirth = parseDate(value(row, 'Date of Birth'));
  if (!dateOfBirth) return 'Date of Birth must be a valid YYYY-MM-DD date';

  const leadVendorName = value(row, 'Lead Vendor') || 'Self Generated';
  const leadVendorId =
    leadVendorsByName.get(leadVendorName.toLowerCase())?.id ||
    selfGeneratedLeadVendorId;
  if (value(row, 'Lead Vendor') && !leadVendorsByName.has(leadVendorName.toLowerCase())) {
    return `Lead Vendor "${leadVendorName}" was not found`;
  }

  const lead = {
    ...name,
    email,
    phone,
    date_of_birth: dateOfBirth,
    state: value(row, 'State'),
    agent_id: agentId,
    lead_vendor_id: leadVendorId,
    sold: parseBoolean(value(row, 'Sold'), false),
    smoker: parseBoolean(value(row, 'Smoker')),
    verified: parseBoolean(value(row, 'Verified')),
    cholesterol_medication: parseBoolean(value(row, 'Cholesterol Medication')),
    blood_pressure_medication: parseBoolean(
      value(row, 'Blood Pressure Medication'),
    ),
    face_amount: parseNumber(value(row, 'Coverage Amount')),
    face_amount_max: parseNumber(value(row, 'Face Amount Max')),
    premium: parseNumber(value(row, 'Monthly Premium')),
    height_feet: parseInteger(value(row, 'Height (Feet)')),
    height_inches: parseInteger(value(row, 'Height (Inches)')),
    weight_lbs: parseInteger(value(row, 'Weight (Lbs)')),
    selected_carrier: value(row, 'Selected Carrier') || null,
    selected_plan: value(row, 'Selected Plan') || null,
    beneficiary: value(row, 'Beneficiary') || null,
    priority: value(row, 'Priority') || null,
    why: value(row, 'Reason') || null,
  };

  const invalidField = Object.entries(lead).find(([, fieldValue]) => {
    return fieldValue === undefined;
  });
  if (invalidField) return `${invalidField[0]} has an invalid value`;

  return { rowNumber, lead };
};

const getSelfGeneratedLeadVendorId = async () => {
  const { data, error } = await supabaseService
    .from('lead_vendors')
    .select('id')
    .eq('name', 'Self Generated')
    .single();

  if (error || !data?.id) return null;
  return data.id;
};

const getLeadVendorsByName = async (names) => {
  const vendorNames = [...new Set(['Self Generated', ...names.filter(Boolean)])];
  const { data, error } = await supabaseService
    .from('lead_vendors')
    .select('id, name')
    .in('name', vendorNames);

  if (error) return { error };
  return {
    data: new Map((data || []).map((vendor) => [vendor.name.toLowerCase(), vendor])),
  };
};

const uploadLeads = async (req, res, rows) => {
  const leadVendorId = await getSelfGeneratedLeadVendorId();
  if (!leadVendorId) {
    return res
      .status(500)
      .json({ error: 'Self Generated lead vendor is not configured' });
  }

  const vendorNames = rows.map((row) => value(row, 'Lead Vendor'));
  const { data: leadVendorsByName, error: leadVendorsError } =
    await getLeadVendorsByName(vendorNames);
  if (leadVendorsError) {
    logger.error('Failed to get lead vendors for bulk upload', {
      error: leadVendorsError,
    });
    return res.status(500).json({ error: 'Failed to validate lead vendors' });
  }

  const errors = [];
  const validRows = [];
  const phonesInUpload = new Set();

  // Check each CSV row before using the database.
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = validateLeadRow(
      row,
      rowNumber,
      req.agent.id,
      leadVendorId,
      leadVendorsByName,
    );

    if (typeof result === 'string') {
      errors.push({ row: rowNumber, message: result });
    } else if (phonesInUpload.has(result.lead.phone)) {
      errors.push({ row: rowNumber, message: 'Duplicate phone in upload' });
    } else {
      phonesInUpload.add(result.lead.phone);
      validRows.push(result);
    }
  });

  if (errors.length) {
    return res.status(200).json({
      error: true,
      message: 'Lead upload rejected because one or more rows failed validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors,
    });
  }

  // Check for leads that already exist.
  if (validRows.length) {
    const { data, error } = await supabaseService
      .from('leads')
      .select('phone')
      .in(
        'phone',
        validRows.map(({ lead }) => lead.phone),
      );

    if (error) {
      logger.error('Failed to check existing leads', { error });
      return res.status(500).json({ error: 'Failed to check existing leads' });
    }

    const existingPhones = new Set((data || []).map(({ phone }) => phone));
    for (let i = validRows.length - 1; i >= 0; i--) {
      if (existingPhones.has(validRows[i].lead.phone)) {
        errors.push({
          row: validRows[i].rowNumber,
          message: 'A lead with this phone already exists',
        });
        validRows.splice(i, 1);
      }
    }
  }

  if (errors.length) {
    return res.status(200).json({
      error: true,
      message: 'Lead upload rejected because one or more rows failed validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors,
    });
  }

  // Save the leads after all checks pass.
  if (validRows.length) {
    const { error } = await supabaseService
      .from('leads')
      .insert(validRows.map(({ lead }) => lead));

    if (error) {
      logger.error('Failed to insert leads', { error });
      return res.status(500).json({ error: 'Failed to insert leads' });
    }
  }

  const inserted = validRows.length;
  return res.status(200).json({
    error: errors.length > 0,
    message: `Inserted ${inserted} lead row(s)`,
    total: rows.length,
    inserted,
    failed: rows.length - inserted,
    errors,
  });
};

module.exports = { uploadLeads };
