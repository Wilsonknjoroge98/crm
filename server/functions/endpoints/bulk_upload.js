const express = require('express');
const dayjs = require('dayjs');
const { validateFormat } = require('./bulk_upload/format_validation');
const {
  validateDatabaseConflicts,
  validateImportReferences,
} = require('./bulk_upload/database_conflict_validation');
const {
  importBook,
} = require('./bulk_upload/import_book');

// eslint-disable-next-line new-cap
const bulkUploadRouter = express.Router();

const normalizePhone = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
};

const normalizeDate = (raw) => {
  const input = String(raw ?? '').trim();
  if (!input) return input;
  const parsed = dayjs(input);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : input;
};

const normalizeNumber = (raw) =>
  String(raw ?? '')
    .trim()
    .replace(/[$,%\s]/g, '');

const normalizeNumberFields = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([field, raw]) => {
      const isMoneyField = [
        'Annual Income',
        'Premium Amount',
        'Coverage Amount',
        'Other Agent Commission Share',
      ].includes(field);
      const isBeneficiaryAllocation =
        /^(Primary|Contingent) Beneficiary \d+ Allocation %$/.test(field);

      if (!isMoneyField && !isBeneficiaryAllocation) {
        return [field, raw];
      }
      return [field, normalizeNumber(raw)];
    }),
  );

const normalizeRows = (rows) =>
  rows.map((rawRow) => {
    const row = normalizeNumberFields(rawRow);
    return {
      ...row,
      Phone: normalizePhone(row.Phone),
      'Date of Birth': normalizeDate(row['Date of Birth']),
      'Effective Date': normalizeDate(row['Effective Date']),
      'Sold Date': normalizeDate(row['Sold Date']),
    };
  });

// Shared validator for both validate and import, so import cannot bypass fresh checks.
const validateRows = async ({ rows, agentId }) => {
  const formatResult = validateFormat(rows);
  const conflictResult = await validateDatabaseConflicts({ rows, agentId });
  if (conflictResult.error && hasSystemError(conflictResult)) {
    return conflictResult;
  }

  const referenceResult = await validateImportReferences(rows);
  if (referenceResult.error && hasSystemError(referenceResult)) {
    return referenceResult;
  }

  const errors = [
    ...(formatResult.errors || []),
    ...(conflictResult.errors || []),
    ...(referenceResult.errors || []),
  ];

  if (errors.length > 0) {
    return {
      ...conflictResult,
      error: true,
      message: 'File has ineligible rows.',
      total: rows.length,
      inserted: 0,
      failed: new Set(
        errors
          .map((error) => error.row)
          .filter((row) => Number.isInteger(row)),
      ).size || rows.length,
      errors,
      warnings: referenceResult.warnings || [],
      stage: 'database_conflict_validation',
      plan: null,
    };
  }

  return {
    ...conflictResult,
    warnings: referenceResult.warnings,
  };
};

const getRowLevelErrors = (result) =>
  (result.errors || []).filter((error) => Number.isInteger(error.row));

const hasSystemError = (result) =>
  (result.errors || []).some((error) => error.row === '-');

// Normalizes route request validation before stage-specific work begins.
const parseRowsRequest = (req, res) => {
  const { rows } = req.body;

  if (!req.agent?.id) {
    res.status(403).json({ error: 'Agent account is required for bulk upload' });
    return null;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'File has no data rows' });
    return null;
  }

  return { rows: normalizeRows(rows), agentId: req.agent.id };
};

bulkUploadRouter.post('/validate', async (req, res) => {
  const parsed = parseRowsRequest(req, res);
  if (!parsed) return undefined;

  const validationResult = await validateRows(parsed);
  return res.status(200).json(validationResult);
});

bulkUploadRouter.post('/import', async (req, res) => {
  const parsed = parseRowsRequest(req, res);
  if (!parsed) return undefined;

  const validationResult = await validateRows(parsed);
  if (validationResult.error && hasSystemError(validationResult)) {
    return res.status(200).json(validationResult);
  }

  const skippedErrors = getRowLevelErrors(validationResult);
  const skippedRowNumbers = [
    ...new Set(skippedErrors.map((error) => error.row)),
  ].sort((a, b) => a - b);
  const skippedRowSet = new Set(skippedRowNumbers);
  const eligibleRows = parsed.rows.filter(
    (_, index) => !skippedRowSet.has(index + 2),
  );

  if (eligibleRows.length === 0) {
    return res.status(200).json({
      ...validationResult,
      eligible: 0,
      skippedRowNumbers,
      skippedErrors,
      partial: false,
    });
  }

  const eligibleValidationResult = await validateRows({
    rows: eligibleRows,
    agentId: parsed.agentId,
  });

  if (eligibleValidationResult.error) {
    return res.status(200).json({
      ...eligibleValidationResult,
      skippedRowNumbers,
      skippedErrors,
      partial: skippedRowNumbers.length > 0,
    });
  }

  const importResult = await importBook({
    rows: eligibleRows,
    agentId: parsed.agentId,
    plan: eligibleValidationResult.plan,
  });

  return res.status(200).json({
    ...importResult,
    total: parsed.rows.length,
    eligible: eligibleRows.length,
    failed: skippedRowNumbers.length,
    skippedRowNumbers,
    skippedErrors,
    partial: skippedRowNumbers.length > 0,
  });
});

bulkUploadRouter.post('/', async (req, res) => {
  const parsed = parseRowsRequest(req, res);
  if (!parsed) return undefined;

  const validationResult = await validateRows(parsed);
  return res.status(200).json(validationResult);
});

module.exports = bulkUploadRouter;
