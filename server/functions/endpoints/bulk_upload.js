const express = require('express');
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

// Shared validator for both validate and import, so import cannot bypass fresh checks.
const validateRows = async ({ rows, agentId }) => {
  const formatResult = validateFormat(rows);
  if (formatResult.error) {
    return formatResult;
  }

  const conflictResult = await validateDatabaseConflicts({ rows, agentId });
  if (conflictResult.error) {
    return conflictResult;
  }

  const referenceResult = await validateImportReferences(rows);
  if (referenceResult.error) {
    return referenceResult;
  }

  return {
    ...conflictResult,
    warnings: referenceResult.warnings,
  };
};

// Normalizes route request validation before stage-specific work begins.
const parseRowsRequest = (req, res) => {
  const { rows } = req.body;

  if (!req.agent?.id) {
    res.status(403).json({ error: 'Agent account is required for bulk upload' });
    return null;
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'CSV has no data rows' });
    return null;
  }

  return { rows, agentId: req.agent.id };
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

  const conflictResult = await validateRows(parsed);
  if (conflictResult.error) {
    return res.status(200).json(conflictResult);
  }

  const importResult = await importBook({
    rows: parsed.rows,
    agentId: parsed.agentId,
    plan: conflictResult.plan,
  });

  return res.status(200).json(importResult);
});

bulkUploadRouter.post('/', async (req, res) => {
  const parsed = parseRowsRequest(req, res);
  if (!parsed) return undefined;

  const validationResult = await validateRows(parsed);
  return res.status(200).json(validationResult);
});

module.exports = bulkUploadRouter;
