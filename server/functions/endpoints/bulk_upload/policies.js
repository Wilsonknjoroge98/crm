const logger = require('firebase-functions/logger');
const { supabaseService } = require('../../services/supabase');
const {
  EMAIL_REGEX,
  INVALID_CARRIER_REFERENCE,
  INVALID_PRODUCT_REFERENCE,
  POLICY_STATUSES,
  PREMIUM_FREQUENCIES,
  REQUIRED_POLICY_FIELDS,
  parseDate,
  parseInteger,
  parseNumber,
  parsePhone,
  rowsByName,
  value,
} = require('./shared');

const validatePolicyRow = (row, rowNumber, agentId) => {
  const missing = REQUIRED_POLICY_FIELDS.filter((field) => !value(row, field));
  if (missing.length) return `Missing required field(s): ${missing.join(', ')}`;

  const clientPhone = parsePhone(value(row, 'Client Phone'));
  if (!clientPhone) return 'Client Phone must contain 10 digits';

  const premiumAmount = parseNumber(value(row, 'Premium Amount'));
  if (premiumAmount === null || premiumAmount === undefined) {
    return 'Premium Amount must be a number';
  }

  const coverageAmount = parseNumber(value(row, 'Coverage Amount'));
  if (coverageAmount === null || coverageAmount === undefined) {
    return 'Coverage Amount must be a number';
  }

  const draftDay = parseInteger(value(row, 'Draft Day'));
  if (!draftDay || draftDay < 1 || draftDay > 31) {
    return 'Draft Day must be a whole number from 1 to 31';
  }

  const effectiveDate = parseDate(value(row, 'Effective Date'));
  if (!effectiveDate) return 'Effective Date must be a valid YYYY-MM-DD date';

  const soldDate = parseDate(value(row, 'Sold Date'));
  if (!soldDate) return 'Sold Date must be a valid YYYY-MM-DD date';

  const policyStatus = value(row, 'Status').toLowerCase();
  if (!POLICY_STATUSES.has(policyStatus)) {
    return 'Status must be active, pending, lapsed, cancelled, or insufficient funds';
  }

  const premiumFrequency = value(row, 'Premium Frequency').toLowerCase();
  if (!PREMIUM_FREQUENCIES.has(premiumFrequency)) {
    return 'Premium Frequency must be weekly, monthly, quarterly, semi-annually, or annually';
  }

  const splitAgentEmail = value(row, 'Other Agent Email').toLowerCase();
  if (splitAgentEmail && !EMAIL_REGEX.test(splitAgentEmail)) {
    return 'Other Agent Email is invalid';
  }

  const splitAgentShare = parseInteger(value(row, 'Other Agent Commission Share'));
  if (splitAgentShare === undefined || splitAgentShare < 0 || splitAgentShare > 100) {
    return 'Other Agent Commission Share must be a whole number from 0 to 100';
  }
  if (splitAgentShare !== null && !splitAgentEmail) {
    return 'Other Agent Email is required when Other Agent Commission Share is provided';
  }
  if (splitAgentEmail && splitAgentShare === null) {
    return 'Other Agent Commission Share is required when Other Agent Email is provided';
  }

  return {
    rowNumber,
    clientPhone,
    carrierName: value(row, 'Carrier'),
    productName: value(row, 'Product'),
    splitAgentEmail,
    policy: {
      writing_agent_id: agentId,
      policy_number: value(row, 'Policy Number'),
      policy_status: policyStatus,
      coverage_amount: coverageAmount,
      premium_amount: premiumAmount,
      premium_frequency: premiumFrequency,
      effective_date: effectiveDate,
      sold_date: soldDate,
      draft_day: draftDay,
      writing_agent_notes: value(row, 'Notes') || null,
      split_agent_share: splitAgentShare,
    },
  };
};

const firstQueryError = (queries) => {
  const failed = queries.find(({ error }) => error);
  if (!failed) return null;

  return {
    source: failed.source,
    message: failed.error.message,
    details: failed.error.details,
    hint: failed.error.hint,
    code: failed.error.code,
  };
};

const uploadPolicies = async (req, res, rows) => {
  const errors = [];
  const validRows = [];
  const policyNumbersInUpload = new Set();

  // Check each CSV row before using the database.
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = validatePolicyRow(row, rowNumber, req.agent.id);

    if (typeof result === 'string') {
      errors.push({ row: rowNumber, message: result });
    } else if (policyNumbersInUpload.has(result.policy.policy_number)) {
      errors.push({ row: rowNumber, message: 'Duplicate policy number in upload' });
    } else {
      policyNumbersInUpload.add(result.policy.policy_number);
      validRows.push(result);
    }
  });

  if (errors.length) {
    return res.status(200).json({
      error: true,
      message: 'Policy upload rejected because one or more rows failed validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors,
    });
  }

  // Make sure clients, products, carriers, and split agents can be found.
  if (validRows.length) {
    const phones = validRows.map(({ clientPhone }) => clientPhone);
    const policyNumbers = validRows.map(({ policy }) => policy.policy_number);
    const carrierNames = [...new Set(validRows.map(({ carrierName }) => carrierName).filter(Boolean))];
    const productNames = [...new Set(validRows.map(({ productName }) => productName).filter(Boolean))];
    const splitAgentEmails = [...new Set(validRows.map(({ splitAgentEmail }) => splitAgentEmail).filter(Boolean))];

    const [
      { data: clients, error: clientsError },
      { data: existingPolicies, error: policiesError },
      { data: carriers, error: carriersError },
      { data: products, error: productsError },
      { data: splitAgents, error: splitAgentsError },
      { data: fallbackCarrier, error: fallbackCarrierError },
      { data: fallbackProduct, error: fallbackProductError },
    ] = await Promise.all([
      supabaseService
        .from('clients')
        .select('id, phone, agent_clients!agent_clients_client_id_fkey!inner(agent_id)')
        .eq('agent_clients.agent_id', req.agent.id)
        .in('phone', phones),
      supabaseService.from('policies').select('policy_number').in('policy_number', policyNumbers),
      carrierNames.length
        ? supabaseService.from('carriers').select('id, name').in('name', carrierNames)
        : Promise.resolve({ data: [], error: null }),
      productNames.length
        ? supabaseService.from('products').select('id, name, carrier_id').in('name', productNames)
        : Promise.resolve({ data: [], error: null }),
      splitAgentEmails.length
        ? supabaseService
          .from('agents')
          .select('id, email')
          .eq('org_id', req.agent.org_id)
          .in('email', splitAgentEmails)
        : Promise.resolve({ data: [], error: null }),
      supabaseService.from('carriers').select('id, name').eq('name', INVALID_CARRIER_REFERENCE).single(),
      supabaseService.from('products').select('id, name').eq('name', INVALID_PRODUCT_REFERENCE).single(),
    ]);

    const queryError = firstQueryError([
      { source: 'clients', error: clientsError },
      { source: 'existing policies', error: policiesError },
      { source: 'carriers', error: carriersError },
      { source: 'products', error: productsError },
      { source: 'other agents', error: splitAgentsError },
      { source: 'fallback carrier', error: fallbackCarrierError },
      { source: 'fallback product', error: fallbackProductError },
    ]);

    if (queryError) {
      logger.error('Failed to validate policy bulk upload', {
        queryError,
      });
      return res.status(500).json({
        error: `Failed to validate policies: ${queryError.source}`,
        details: queryError.message,
        hint: queryError.hint,
        code: queryError.code,
      });
    }

    const clientsByPhone = new Map((clients || []).map((client) => [client.phone, client]));
    const existingPolicyNumbers = new Set((existingPolicies || []).map((policy) => policy.policy_number));
    const carriersByName = rowsByName(carriers);
    const splitAgentsByEmail = new Map((splitAgents || []).map((agent) => [agent.email.toLowerCase(), agent]));
    const missingClientErrors = validRows
      .filter((row) => !clientsByPhone.has(row.clientPhone))
      .map((row) => ({
        row: row.rowNumber,
        message: 'No client found with this phone number',
      }));

    if (missingClientErrors.length) {
      return res.status(200).json({
        error: true,
        message: 'Policy upload rejected because one or more client phones do not exist',
        total: rows.length,
        inserted: 0,
        failed: rows.length,
        errors: [...errors, ...missingClientErrors],
      });
    }

    const missingSplitAgentErrors = validRows
      .filter((row) => row.splitAgentEmail && !splitAgentsByEmail.has(row.splitAgentEmail))
      .map((row) => ({
        row: row.rowNumber,
        message: 'Other Agent Email was not found',
      }));

    if (missingSplitAgentErrors.length) {
      return res.status(200).json({
        error: true,
        message: 'Policy upload rejected because one or more other agent emails do not exist',
        total: rows.length,
        inserted: 0,
        failed: rows.length,
        errors: [...errors, ...missingSplitAgentErrors],
      });
    }

    for (let i = validRows.length - 1; i >= 0; i--) {
      const row = validRows[i];
      const client = clientsByPhone.get(row.clientPhone);

      if (existingPolicyNumbers.has(row.policy.policy_number)) {
        errors.push({
          row: row.rowNumber,
          message: 'A policy with this policy number already exists',
        });
        validRows.splice(i, 1);
      } else {
        row.policy.client_id = client.id;
        const carrierId = row.carrierName
          ? carriersByName.get(row.carrierName.toLowerCase())?.id || fallbackCarrier.id
          : fallbackCarrier.id;
        const product = (products || []).find((p) => {
          return (
            row.productName &&
            p.name.toLowerCase() === row.productName.toLowerCase() &&
            p.carrier_id === carrierId
          );
        });

        row.policy.carrier_id = carrierId;
        row.policy.product_id = product?.id || fallbackProduct.id;
        row.policy.split_agent_id =
          splitAgentsByEmail.get(row.splitAgentEmail)?.id || null;
      }
    }
  }

  if (errors.length) {
    return res.status(200).json({
      error: true,
      message: 'Policy upload rejected because one or more rows failed validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors,
    });
  }

  // Save the policies after all checks pass.
  if (validRows.length) {
    const { error } = await supabaseService
      .from('policies')
      .insert(validRows.map(({ policy }) => policy));

    if (error) {
      logger.error('Failed to insert policies', { error });
      return res.status(500).json({ error: 'Failed to insert policies' });
    }
  }

  const inserted = validRows.length;
  return res.status(200).json({
    error: errors.length > 0,
    message: `Inserted ${inserted} policy row(s)`,
    total: rows.length,
    inserted,
    failed: rows.length - inserted,
    errors,
  });
};

module.exports = { uploadPolicies };
