const logger = require('firebase-functions/logger');
const { supabaseService } = require('../../services/supabase');
const {
  EMAIL_REGEX,
  MARITAL_STATUSES,
  REQUIRED_CLIENT_FIELDS,
  parseDate,
  parseName,
  parseNumber,
  parsePhone,
  value,
} = require('./shared');

const validateClientRow = (row, rowNumber) => {
  const missing = REQUIRED_CLIENT_FIELDS.filter((field) => !value(row, field));
  if (missing.length) return `Missing required field(s): ${missing.join(', ')}`;

  const name = parseName(value(row, 'Name'));
  if (!name) return 'Name must include first and last name';

  const email = value(row, 'Email').toLowerCase();
  if (!EMAIL_REGEX.test(email)) return 'Email is invalid';

  const phone = parsePhone(value(row, 'Phone'));
  if (!phone) return 'Phone must contain 10 digits';

  const dateOfBirth = parseDate(value(row, 'Date of Birth'));
  if (!dateOfBirth) return 'Date of Birth must be a valid YYYY-MM-DD date';

  const annualIncome = parseNumber(value(row, 'Annual Income'));
  if (annualIncome === null || annualIncome === undefined) {
    return 'Annual Income must be a number';
  }

  const maritalStatus = value(row, 'Marital Status').toLowerCase();
  if (!MARITAL_STATUSES.has(maritalStatus)) {
    return 'Marital Status must be single, married, divorced, or widowed';
  }

  return {
    rowNumber,
    notes: value(row, 'Notes') || null,
    client: {
      ...name,
      email,
      phone,
      date_of_birth: dateOfBirth,
      address: value(row, 'Address'),
      city: value(row, 'City'),
      state: value(row, 'State'),
      zip: value(row, 'Zip Code'),
      occupation: value(row, 'Occupation'),
      marital_status: maritalStatus,
      annual_income: annualIncome,
    },
  };
};

const uploadClients = async (req, res, rows) => {
  const errors = [];
  const validRows = [];
  const phonesInUpload = new Set();

  // Check each CSV row before using the database.
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = validateClientRow(row, rowNumber);

    if (typeof result === 'string') {
      errors.push({ row: rowNumber, message: result });
    } else if (phonesInUpload.has(result.client.phone)) {
      errors.push({ row: rowNumber, message: 'Duplicate phone in upload' });
    } else {
      phonesInUpload.add(result.client.phone);
      validRows.push(result);
    }
  });

  if (errors.length) {
    return res.status(200).json({
      error: true,
      message: 'Client upload rejected because one or more rows failed validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors,
    });
  }

  // Make sure every client has a matching lead and no duplicate client exists.
  if (validRows.length) {
    const phones = validRows.map(({ client }) => client.phone);
    const [{ data: leads, error: leadsError }, { data: clients, error: clientsError }] =
      await Promise.all([
        supabaseService
          .from('leads')
          .select('id, phone')
          .eq('agent_id', req.agent.id)
          .in('phone', phones),
        supabaseService.from('clients').select('phone').in('phone', phones),
      ]);

    if (leadsError || clientsError) {
      logger.error('Failed to validate client bulk upload', {
        leadsError,
        clientsError,
      });
      return res.status(500).json({ error: 'Failed to validate clients' });
    }

    const leadsByPhone = new Map((leads || []).map((lead) => [lead.phone, lead]));
    const existingClientPhones = new Set(
      (clients || []).map((client) => client.phone),
    );
    const missingLeadErrors = validRows
      .filter((row) => !leadsByPhone.has(row.client.phone))
      .map((row) => ({
        row: row.rowNumber,
        message: 'No lead found with this phone number',
      }));

    if (missingLeadErrors.length) {
      return res.status(200).json({
        error: true,
        message: 'Client upload rejected because one or more lead phones do not exist',
        total: rows.length,
        inserted: 0,
        failed: rows.length,
        errors: [...errors, ...missingLeadErrors],
      });
    }

    for (let i = validRows.length - 1; i >= 0; i--) {
      const phone = validRows[i].client.phone;
      if (existingClientPhones.has(phone)) {
        errors.push({
          row: validRows[i].rowNumber,
          message: 'A client with this phone already exists',
        });
        validRows.splice(i, 1);
      } else {
        validRows[i].client.lead_id = leadsByPhone.get(phone).id;
      }
    }
  }

  if (errors.length) {
    return res.status(200).json({
      error: true,
      message: 'Client upload rejected because one or more rows failed validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors,
    });
  }

  // Save clients, link them to the agent, then mark the leads sold.
  if (validRows.length) {
    const { data: insertedClients, error: insertError } = await supabaseService
      .from('clients')
      .insert(validRows.map(({ client }) => client))
      .select('id, phone');

    if (insertError) {
      logger.error('Failed to insert clients', { error: insertError });
      return res.status(500).json({ error: 'Failed to insert clients' });
    }

    const clientIdByPhone = new Map(
      (insertedClients || []).map((client) => [client.phone, client.id]),
    );

    const { error: linkError } = await supabaseService
      .from('agent_clients')
      .insert(
        validRows.map(({ client, notes }) => ({
          agent_id: req.agent.id,
          client_id: clientIdByPhone.get(client.phone),
          agent_notes: notes,
        })),
      );

    if (linkError) {
      logger.error('Failed to link uploaded clients to agent', {
        error: linkError,
      });
      return res.status(500).json({ error: 'Failed to link clients to agent' });
    }

    await supabaseService
      .from('leads')
      .update({ sold: true })
      .in(
        'phone',
        validRows.map(({ client }) => client.phone),
      );
  }

  const inserted = validRows.length;
  return res.status(200).json({
    error: errors.length > 0,
    message: `Inserted ${inserted} client row(s)`,
    total: rows.length,
    inserted,
    failed: rows.length - inserted,
    errors,
  });
};

module.exports = { uploadClients };
