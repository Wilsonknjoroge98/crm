const { supabaseService } = require('../../services/supabase');

const DEFAULT_LEAD_VENDOR = 'Self Generated';
const DEFAULT_CARRIER = 'MIGRATION//INVALID REFERENCE';
const DEFAULT_PRODUCT = 'MIGRATION/INVALID REFERENCE';

function value(row, field) {
  return String(row[field] ?? '').trim();
}

function normalizeString(raw) {
  return String(raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeLookup(raw) {
  return normalizeString(raw);
}

const unique = (items) => [...new Set(items.filter(Boolean))];

const rowNumbersByField = (rows, field) => {
  const map = new Map();
  rows.forEach((row, index) => {
    const fieldValue = value(row, field);
    if (!fieldValue) return;
    if (!map.has(fieldValue)) map.set(fieldValue, []);
    map.get(fieldValue).push(index + 2);
  });
  return map;
};

const rowsByPhone = (rows) => {
  const map = new Map();
  rows.forEach((row, index) => {
    const phone = value(row, 'Phone');
    if (!phone) return;
    if (!map.has(phone)) {
      map.set(phone, { row, rowNumbers: [] });
    }
    map.get(phone).rowNumbers.push(index + 2);
  });
  return map;
};

const groupByPhone = (records) => {
  const map = new Map();
  (records || []).forEach((record) => {
    if (!record.phone) return;
    if (!map.has(record.phone)) map.set(record.phone, []);
    map.get(record.phone).push(record);
  });
  return map;
};

const mapByName = (records) =>
  new Map((records || []).map((record) => [normalizeLookup(record.name), record]));

// Shared batching helper keeps large uploads from creating oversized Supabase filters.
const chunk = (items, size = 500) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// Reference checks are DB-backed validation, but the resolved IDs are reused by import.
const fetchImportReferences = async (rows) => {
  const splitAgentEmails = unique(
    rows.map((row) => value(row, 'Other Agent Email').toLowerCase()),
  );

  const [
    { data: leadVendors, error: leadVendorsError },
    { data: carriers, error: carriersError },
    { data: products, error: productsError },
    { data: agents, error: agentsError },
  ] = await Promise.all([
    supabaseService.from('lead_vendors').select('id, name'),
    supabaseService.from('carriers').select('id, name'),
    supabaseService.from('products').select('id, name, carrier_id'),
    splitAgentEmails.length
      ? supabaseService.from('agents').select('id, email').in('email', splitAgentEmails)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const error =
    leadVendorsError ||
    carriersError ||
    productsError ||
    agentsError;

  if (error) return { error };

  return {
    leadVendorsByName: mapByName(leadVendors),
    carriersByName: mapByName(carriers),
    productsByName: mapByName(products),
    agentsByEmail: new Map(
      (agents || []).map((agent) => [String(agent.email).toLowerCase(), agent]),
    ),
  };
};

// Applies default lookup rows and catches product/carrier or split-agent reference issues.
const resolveImportReferences = (rows, references) => {
  const errors = [];
  const warnings = [];

  const defaultLeadVendor = references.leadVendorsByName.get(
    normalizeLookup(DEFAULT_LEAD_VENDOR),
  );
  const defaultCarrier = references.carriersByName.get(normalizeLookup(DEFAULT_CARRIER));
  const defaultProduct = references.productsByName.get(normalizeLookup(DEFAULT_PRODUCT));

  if (!defaultLeadVendor) {
    errors.push({ row: '-', message: `Default lead vendor "${DEFAULT_LEAD_VENDOR}" not found` });
  }
  if (!defaultCarrier) {
    errors.push({ row: '-', message: `Default carrier "${DEFAULT_CARRIER}" not found` });
  }
  if (!defaultProduct) {
    errors.push({ row: '-', message: `Default product "${DEFAULT_PRODUCT}" not found` });
  }

  const rowsWithLookups = rows.map((row, index) => {
    const rowNumber = index + 2;
    const leadVendorName = value(row, 'Lead Vendor') || DEFAULT_LEAD_VENDOR;
    const carrierName = value(row, 'Carrier') || DEFAULT_CARRIER;
    const productName = value(row, 'Product') || DEFAULT_PRODUCT;
    const splitAgentEmail = value(row, 'Other Agent Email').toLowerCase();
    const splitAgentShare = value(row, 'Other Agent Commission Share');

    const leadVendor =
      references.leadVendorsByName.get(normalizeLookup(leadVendorName)) ||
      defaultLeadVendor;
    const requestedCarrier = references.carriersByName.get(normalizeLookup(carrierName));
    const requestedProduct = references.productsByName.get(normalizeLookup(productName));
    const hasValidCarrier = references.carriersByName.has(normalizeLookup(carrierName));
    const hasValidProduct = references.productsByName.has(normalizeLookup(productName));
    const shouldUseDefaultPolicyReference = !hasValidCarrier || !hasValidProduct;
    const carrier = shouldUseDefaultPolicyReference
      ? defaultCarrier
      : requestedCarrier;
    const product = shouldUseDefaultPolicyReference
      ? defaultProduct
      : requestedProduct;
    const splitAgent = splitAgentEmail
      ? references.agentsByEmail.get(splitAgentEmail)
      : null;

    if (
      leadVendorName &&
      !references.leadVendorsByName.has(normalizeLookup(leadVendorName))
    ) {
      warnings.push({
        row: rowNumber,
        message: `Lead Vendor defaulted to ${DEFAULT_LEAD_VENDOR}`,
      });
    }
    if (carrierName && !hasValidCarrier) {
      warnings.push({
        row: rowNumber,
        message: `Carrier defaulted to ${DEFAULT_CARRIER}`,
      });
    }
    if (productName && !hasValidProduct) {
      warnings.push({
        row: rowNumber,
        message: `Product defaulted to ${DEFAULT_PRODUCT}`,
      });
    }
    if (hasValidCarrier && hasValidProduct && product.carrier_id !== carrier.id) {
      errors.push({
        row: rowNumber,
        field: 'Product',
        message: 'Product does not belong to the selected carrier',
      });
    }
    if (splitAgentEmail && !splitAgent) {
      errors.push({
        row: rowNumber,
        field: 'Other Agent Email',
        message: 'Other Agent Email does not match an existing agent',
      });
    }
    if (splitAgentEmail && !splitAgentShare) {
      errors.push({
        row: rowNumber,
        field: 'Other Agent Commission Share',
        message: 'Other Agent Commission Share is required when email is provided',
      });
    }
    if (splitAgentShare && !splitAgentEmail) {
      errors.push({
        row: rowNumber,
        field: 'Other Agent Commission Share',
        message: 'Other Agent Email is required when commission share is provided',
      });
    }

    return {
      row,
      leadVendorId: leadVendor?.id,
      carrierId: carrier?.id,
      productId: product?.id,
      splitAgentId: splitAgent?.id || null,
    };
  });

  return { errors, warnings, rowsWithLookups };
};

// Exported for import_book so validation and import resolve lookups the same way.
const resolveImportRows = async (rows) => {
  const references = await fetchImportReferences(rows);
  if (references.error) return { error: references.error };
  return resolveImportReferences(rows, references);
};

const validateImportReferences = async (rows) => {
  const resolved = await resolveImportRows(rows);
  if (resolved.error) {
    return {
      error: true,
      message: 'Failed to resolve import references',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors: [{ row: '-', message: resolved.error.message }],
      warnings: [],
      stage: 'database_conflict_validation',
    };
  }

  return {
    error: resolved.errors.length > 0,
    message: resolved.errors.length
      ? 'File failed conflict validation'
      : 'File passed conflict validation',
    total: rows.length,
    inserted: 0,
    failed: resolved.errors.length ? rows.length : 0,
    errors: resolved.errors,
    warnings: resolved.warnings,
    stage: 'database_conflict_validation',
  };
};

const queryInChunks = async ({ table, select, column, values }) => {
  const results = [];
  for (const valueChunk of chunk(values)) {
    const { data, error } = await supabaseService
      .from(table)
      .select(select)
      .in(column, valueChunk);

    if (error) return { error };
    results.push(...(data || []));
  }
  return { data: results };
};

// Policy numbers are globally unique, so any existing policy number blocks import.
const validatePolicyConflicts = async ({ rows, agentId }) => {
  const errors = [];
  const policyNumbers = unique(rows.map((row) => value(row, 'Policy Number')));
  const rowNumbersByPolicyNumber = rowNumbersByField(rows, 'Policy Number');

  if (!policyNumbers.length) return { errors };

  const { data: policies, error } = await queryInChunks({
    table: 'policies',
    select: 'policy_number, writing_agent_id',
    column: 'policy_number',
    values: policyNumbers,
  });

  if (error) {
    return { queryError: error };
  }

  (policies || []).forEach((policy) => {
    const rowNumbers = rowNumbersByPolicyNumber.get(policy.policy_number) || [];
    const outsideBusiness = policy.writing_agent_id !== agentId;
    rowNumbers.forEach((rowNumber) => {
      errors.push({
        row: rowNumber,
        field: 'Policy Number',
        message: outsideBusiness
          ? 'Policy number already exists outside of your business.'
          : 'Policy number already exists in your business.',
      });
    });
  });

  return { errors };
};

// Leads are globally unique by phone, so any existing lead is reused.
const validateLeadConflicts = async ({ phoneGroups }) => {
  const errors = [];
  const phones = [...phoneGroups.keys()];
  if (!phones.length) return { errors, leadsByPhone: new Map() };

  const { data: leads, error } = await queryInChunks({
    table: 'leads',
    select: 'id, phone',
    column: 'phone',
    values: phones,
  });

  if (error) {
    return { queryError: error };
  }

  const leadsByPhone = new Map((leads || []).map((lead) => [lead.phone, lead]));

  return { errors, leadsByPhone };
};

// Client phone reuses an owned client and ignores clients owned by other agents.
const validateClientConflicts = async ({ phoneGroups, agentId }) => {
  const errors = [];
  const phones = [...phoneGroups.keys()];
  if (!phones.length) return { errors, clientsByPhone: new Map() };

  const { data: clients, error } = await queryInChunks({
    table: 'clients',
    select: 'id, phone, agent_clients!agent_clients_client_id_fkey ( agent_id )',
    column: 'phone',
    values: phones,
  });

  if (error) {
    return { queryError: error };
  }

  const clientsByPhone = new Map();
  const clientGroupsByPhone = groupByPhone(clients);

  clientGroupsByPhone.forEach((matchingClients, phone) => {
    const group = phoneGroups.get(phone);
    if (!group) return;

    const ownedClients = matchingClients
      .filter((client) => (client.agent_clients || []).some(
        (agentClient) => agentClient.agent_id === agentId,
      ));

    if (!ownedClients.length) return;

    if (ownedClients.length > 1) {
      group.rowNumbers.forEach((rowNumber) => {
        errors.push({
          row: rowNumber,
          field: 'Phone',
          message: 'Client phone already exists more than once in your business.',
        });
      });
      return;
    }

    clientsByPhone.set(phone, ownedClients[0]);
  });

  return { errors, clientsByPhone };
};

// The importer consumes this plan to create only one lead/client per phone.
const buildPlan = ({ phoneGroups, leadsByPhone, clientsByPhone }) => {
  const useExistingLeads = [];
  const useExistingClients = [];
  const createLeads = [];
  const createClients = [];

  phoneGroups.forEach((group, phone) => {
    const lead = leadsByPhone.get(phone);
    const client = clientsByPhone.get(phone);

    if (lead) {
      useExistingLeads.push({ phone, leadId: lead.id, rows: group.rowNumbers });
    } else {
      createLeads.push({ phone, rows: group.rowNumbers });
    }

    if (client) {
      useExistingClients.push({ phone, clientId: client.id, rows: group.rowNumbers });
    } else {
      createClients.push({ phone, rows: group.rowNumbers });
    }
  });

  return {
    useExistingLeads,
    useExistingClients,
    createLeads,
    createClients,
  };
};

// Module entrypoint for stage 2.
const validateDatabaseConflicts = async ({ rows, agentId }) => {
  const phoneGroups = rowsByPhone(rows);
  const policyResult = await validatePolicyConflicts({ rows, agentId });
  if (policyResult.queryError) {
    return {
      error: true,
      message: 'Failed to validate policy conflicts',
      stage: 'database_conflict_validation',
      errors: [{ row: '-', message: policyResult.queryError.message }],
    };
  }

  const leadResult = await validateLeadConflicts({ phoneGroups });
  if (leadResult.queryError) {
    return {
      error: true,
      message: 'Failed to validate lead conflicts',
      stage: 'database_conflict_validation',
      errors: [{ row: '-', message: leadResult.queryError.message }],
    };
  }

  const clientResult = await validateClientConflicts({ phoneGroups, agentId });
  if (clientResult.queryError) {
    return {
      error: true,
      message: 'Failed to validate client conflicts',
      stage: 'database_conflict_validation',
      errors: [{ row: '-', message: clientResult.queryError.message }],
    };
  }

  const errors = [
    ...policyResult.errors,
    ...leadResult.errors,
    ...clientResult.errors,
  ];

  return {
    error: errors.length > 0,
    message: errors.length
      ? 'File failed conflict validation'
      : 'File passed conflict validation',
    total: rows.length,
    inserted: 0,
    failed: errors.length ? rows.length : 0,
    errors,
    warnings: [],
    stage: 'database_conflict_validation',
    plan: errors.length
      ? null
      : buildPlan({
        phoneGroups,
        leadsByPhone: leadResult.leadsByPhone,
        clientsByPhone: clientResult.clientsByPhone,
      }),
  };
};

module.exports = {
  resolveImportRows,
  validateDatabaseConflicts,
  validateImportReferences,
};
