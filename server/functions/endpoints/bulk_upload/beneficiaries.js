const logger = require('firebase-functions/logger');
const { supabaseService } = require('../../services/supabase');
const {
  BENEFICIARY_TYPES,
  RELATIONSHIPS,
  REQUIRED_BENEFICIARY_FIELDS,
  parseNumber,
  parsePhone,
  value,
} = require('./shared');

const validateBeneficiaryRow = (row, rowNumber) => {
  const missing = REQUIRED_BENEFICIARY_FIELDS.filter((field) => !value(row, field));
  if (missing.length) return `Missing required field(s): ${missing.join(', ')}`;

  const beneficiaryType = value(row, 'Beneficiary Type').toLowerCase();
  if (!BENEFICIARY_TYPES.has(beneficiaryType)) {
    return 'Beneficiary Type must be primary or contingent';
  }

  const relationship = value(row, 'Relationship');
  if (!RELATIONSHIPS.has(relationship)) {
    return 'Relationship is invalid';
  }

  const allocationPercent = parseNumber(value(row, 'Allocation Percent'));
  if (
    allocationPercent === null ||
    allocationPercent === undefined ||
    allocationPercent < 0 ||
    allocationPercent > 100
  ) {
    return 'Allocation Percent must be a number from 0 to 100';
  }

  const phone = value(row, 'Phone') ? parsePhone(value(row, 'Phone')) : null;
  if (value(row, 'Phone') && !phone) return 'Phone must contain 10 digits';

  return {
    rowNumber,
    policyNumber: value(row, 'Policy Number'),
    beneficiary: {
      beneficiary_type: beneficiaryType,
      first_name: value(row, 'First Name'),
      last_name: value(row, 'Last Name'),
      relationship,
      allocation_percent: allocationPercent,
      phone,
    },
  };
};

const uploadBeneficiaries = async (req, res, rows) => {
  const errors = [];
  const validRows = [];

  // Check each CSV row before using the database.
  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = validateBeneficiaryRow(row, rowNumber);

    if (typeof result === 'string') {
      errors.push({ row: rowNumber, message: result });
    } else {
      validRows.push(result);
    }
  });

  if (errors.length) {
    return res.status(200).json({
      error: true,
      message: 'Beneficiary upload rejected because one or more rows failed validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors,
    });
  }

  // Make sure every beneficiary points to a real policy.
  if (validRows.length) {
    const policyNumbers = [...new Set(validRows.map(({ policyNumber }) => policyNumber))];
    const { data: policies, error } = await supabaseService
      .from('policies')
      .select('id, policy_number')
      .eq('writing_agent_id', req.agent.id)
      .in('policy_number', policyNumbers);

    if (error) {
      logger.error('Failed to validate beneficiary bulk upload', { error });
      return res.status(500).json({
        error: 'Failed to validate beneficiaries',
        details: error.message,
      });
    }

    const policiesByNumber = new Map(
      (policies || []).map((policy) => [policy.policy_number, policy]),
    );
    const missingPolicyErrors = validRows
      .filter((row) => !policiesByNumber.has(row.policyNumber))
      .map((row) => ({
        row: row.rowNumber,
        message: 'No policy found with this policy number',
      }));

    if (missingPolicyErrors.length) {
      return res.status(200).json({
        error: true,
        message: 'Beneficiary upload rejected because one or more policies do not exist',
        total: rows.length,
        inserted: 0,
        failed: rows.length,
        errors: missingPolicyErrors,
      });
    }

    validRows.forEach((row) => {
      row.beneficiary.policy_id = policiesByNumber.get(row.policyNumber).id;
    });

    // Make sure beneficiary percentages add up correctly.
    const policyIds = [...new Set(validRows.map((row) => row.beneficiary.policy_id))];
    const { data: existingBeneficiaries, error: existingBeneficiariesError } = await supabaseService
      .from('beneficiaries')
      .select('policy_id, beneficiary_type, allocation_percent')
      .in('policy_id', policyIds);

    if (existingBeneficiariesError) {
      logger.error('Failed to validate beneficiary allocations', {
        error: existingBeneficiariesError,
      });
      return res.status(500).json({
        error: 'Failed to validate beneficiary allocations',
        details: existingBeneficiariesError.message,
      });
    }

    const existingAllocationTotals = new Map();
    (existingBeneficiaries || []).forEach((beneficiary) => {
      const key = `${beneficiary.policy_id}:${beneficiary.beneficiary_type}`;
      existingAllocationTotals.set(
        key,
        (existingAllocationTotals.get(key) || 0) + Number(beneficiary.allocation_percent),
      );
    });

    const allocationTotals = new Map();
    const allocationLabels = new Map();
    validRows.forEach((row) => {
      const key = `${row.beneficiary.policy_id}:${row.beneficiary.beneficiary_type}`;
      allocationLabels.set(key, {
        policyNumber: row.policyNumber,
        beneficiaryType: row.beneficiary.beneficiary_type,
      });
      allocationTotals.set(
        key,
        (allocationTotals.get(key) || 0) + Number(row.beneficiary.allocation_percent),
      );
    });

    const allocationErrors = [];
    allocationTotals.forEach((uploadedTotal, key) => {
      const existingTotal = existingAllocationTotals.get(key) || 0;
      const total = existingTotal + uploadedTotal;
      if (Math.abs(total - 100) > 0.001) {
        const { policyNumber, beneficiaryType } = allocationLabels.get(key);
        allocationErrors.push({
          row: '-',
          message: `${beneficiaryType} beneficiary allocation for policy ${policyNumber} must total 100 including existing beneficiaries. Existing: ${existingTotal}%, Uploaded: ${uploadedTotal}%, Total: ${total}%.`,
        });
      }
    });

    if (allocationErrors.length) {
      return res.status(200).json({
        error: true,
        message: 'Beneficiary upload rejected because allocations do not total 100',
        total: rows.length,
        inserted: 0,
        failed: rows.length,
        errors: allocationErrors,
      });
    }
  }

  // Save the beneficiaries after all checks pass.
  if (validRows.length) {
    const { error } = await supabaseService
      .from('beneficiaries')
      .insert(validRows.map(({ beneficiary }) => beneficiary));

    if (error) {
      logger.error('Failed to insert beneficiaries', { error });
      return res.status(500).json({
        error: 'Failed to insert beneficiaries',
        details: error.message,
      });
    }
  }

  const inserted = validRows.length;
  return res.status(200).json({
    error: false,
    message: `Inserted ${inserted} beneficiary row(s)`,
    total: rows.length,
    inserted,
    failed: rows.length - inserted,
    errors: [],
  });
};

module.exports = { uploadBeneficiaries };
