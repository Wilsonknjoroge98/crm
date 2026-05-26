const express = require('express');
const { uploadBeneficiaries } = require('./bulk_upload/beneficiaries');
const { uploadClients } = require('./bulk_upload/clients');
const { uploadLeads } = require('./bulk_upload/leads');
const { uploadPolicies } = require('./bulk_upload/policies');

// eslint-disable-next-line new-cap
const bulkUploadRouter = express.Router();

bulkUploadRouter.post('/', async (req, res) => {
  const { type, rows } = req.body;

  if (!req.agent?.id) {
    return res.status(403).json({ error: 'Agent account is required for bulk upload' });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'CSV has no data rows' });
  }

  if (type === 'leads') return uploadLeads(req, res, rows);
  if (type === 'clients') return uploadClients(req, res, rows);
  if (type === 'policies') return uploadPolicies(req, res, rows);
  if (type === 'beneficiaries') return uploadBeneficiaries(req, res, rows);

  return res.status(400).json({ error: 'Unsupported bulk upload type' });
});

module.exports = bulkUploadRouter;
