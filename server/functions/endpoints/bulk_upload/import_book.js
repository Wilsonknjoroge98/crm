const { supabaseService } = require('../../services/supabase');
const { resolveImportRows } = require('./database_conflict_validation');

// Import assumes format and conflict validation already passed.
function value(row, field) {
  return String(row[field] ?? '').trim();
}

function splitName(raw) {
  const parts = String(raw ?? '').trim().replace(/\s+/g, ' ').split(' ');
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

function parseNumber(raw) {
  const trimmed = value({ raw }, 'raw');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseInteger(raw) {
  const trimmed = value({ raw }, 'raw');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseBoolean(raw) {
  const normalized = value({ raw }, 'raw').toLowerCase();
  if (!normalized) return null;
  if (['true', 'yes', 'y', '1'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0'].includes(normalized)) return false;
  return null;
}

// Builders translate CSV column names into database column names.
function buildLead(row, agentId, leadVendorId) {
  const { firstName, lastName } = splitName(value(row, 'Full Name'));
  return {
    'first_name': firstName,
    'last_name': lastName,
    'email': value(row, 'Email'),
    'phone': value(row, 'Phone'),
    'state': value(row, 'State'),
    'date_of_birth': value(row, 'Date of Birth'),
    'agent_id': agentId,
    'sold': true,
    'lead_vendor_id': leadVendorId,
    'smoker': parseBoolean(value(row, 'Smoker')),
    'height_feet': parseInteger(value(row, 'Height (Feet)')),
    'height_inches': parseInteger(value(row, 'Height (Inches)')),
    'weight_lbs': parseInteger(value(row, 'Weight')),
    'cholesterol_medication': parseBoolean(value(row, 'Cholesterol Medication')),
    'blood_pressure_medication': parseBoolean(value(row, 'Blood Pressure Medication')),
  };
}

function buildClient(row, leadId) {
  const { firstName, lastName } = splitName(value(row, 'Full Name'));
  return {
    'first_name': firstName,
    'last_name': lastName,
    'date_of_birth': value(row, 'Date of Birth'),
    'email': value(row, 'Email'),
    'phone': value(row, 'Phone'),
    'address': value(row, 'Address'),
    'city': value(row, 'City'),
    'state': value(row, 'State'),
    'zip': value(row, 'Zip Code'),
    'occupation': value(row, 'Occupation'),
    'marital_status': value(row, 'Marital Status').toLowerCase(),
    'annual_income': parseNumber(value(row, 'Annual Income')),
    'lead_id': leadId || null,
  };
}

function buildPolicy(rowWithLookups, clientId, agentId) {
  const row = rowWithLookups.row;
  const splitShare = parseInteger(value(row, 'Other Agent Commission Share'));
  return {
    'client_id': clientId,
    'writing_agent_id': agentId,
    'carrier_id': rowWithLookups.carrierId,
    'product_id': rowWithLookups.productId,
    'policy_number': value(row, 'Policy Number'),
    'policy_status': value(row, 'Status').toLowerCase(),
    'coverage_amount': parseNumber(value(row, 'Coverage Amount')),
    'premium_amount': parseNumber(value(row, 'Premium Amount')),
    'premium_frequency': value(row, 'Premium Frequency').toLowerCase(),
    'effective_date': value(row, 'Effective Date'),
    'sold_date': value(row, 'Sold Date'),
    'draft_day': parseInteger(value(row, 'Draft Day')),
    'split_agent_id': rowWithLookups.splitAgentId,
    'split_agent_share': rowWithLookups.splitAgentId ? splitShare : null,
  };
}

function getBeneficiaries(row, type) {
  const label = type === 'primary' ? 'Primary' : 'Contingent';
  const pattern = new RegExp(`^${label} Beneficiary (\\d+) (Name|Relationship|Allocation %)$`);
  const byIndex = new Map();

  Object.keys(row).forEach((field) => {
    const match = field.match(pattern);
    if (!match) return;

    const index = Number(match[1]);
    const part = match[2];
    if (!byIndex.has(index)) {
      byIndex.set(index, { index, name: '', relationship: '', allocation: '' });
    }

    const beneficiary = byIndex.get(index);
    if (part === 'Name') beneficiary.name = value(row, field);
    if (part === 'Relationship') beneficiary.relationship = value(row, field);
    if (part === 'Allocation %') beneficiary.allocation = value(row, field);
  });

  return [...byIndex.values()]
    .sort((a, b) => a.index - b.index)
    .filter((beneficiary) =>
      beneficiary.name || beneficiary.relationship || beneficiary.allocation);
}

function buildBeneficiaries(row, policyId, type) {
  return getBeneficiaries(row, type).map((beneficiary) => {
    const { firstName, lastName } = splitName(beneficiary.name);
    return {
      'policy_id': policyId,
      'first_name': firstName,
      'last_name': lastName,
      'relationship': beneficiary.relationship,
      'allocation_percent': parseNumber(beneficiary.allocation),
      'beneficiary_type': type,
    };
  });
}

// Reuses owned lead IDs from the plan and creates missing leads once per phone.
async function insertLeads({ plan, rowsWithLookups, agentId }) {
  const leadIdByPhone = new Map(
    plan.useExistingLeads.map((lead) => [lead.phone, lead.leadId]),
  );
  const lookupByPhone = new Map(
    rowsWithLookups.map((rowWithLookups) => [
      value(rowWithLookups.row, 'Phone'),
      rowWithLookups,
    ]),
  );

  const leadsToCreate = plan.createLeads.map(({ phone }) => {
    const rowWithLookups = lookupByPhone.get(phone);
    return buildLead(rowWithLookups.row, agentId, rowWithLookups.leadVendorId);
  });

  let created = 0;

  if (leadsToCreate.length) {
    const { data, error } = await supabaseService
      .from('leads')
      .insert(leadsToCreate)
      .select('id, phone');

    if (error) return { error };

    (data || []).forEach((lead) => leadIdByPhone.set(lead.phone, lead.id));
    created = data?.length || 0;
  }

  if (plan.useExistingLeads.length) {
    // We reassign because thats what happens in other areas on the app, is this an aged leads flow thing?
    const { error: updateError } = await supabaseService
      .from('leads')
      .update({ agent_id: agentId, sold: true })
      .in('id', plan.useExistingLeads.map((lead) => lead.leadId));

    if (updateError) return { error: updateError };
  }

  return { leadIdByPhone, created };
}

// Creates missing clients once per phone and links them to the current agent.
async function insertClients({ plan, rowsWithLookups, leadIdByPhone, agentId }) {
  const clientIdByPhone = new Map(
    plan.useExistingClients.map((client) => [client.phone, client.clientId]),
  );
  const lookupByPhone = new Map(
    rowsWithLookups.map((rowWithLookups) => [
      value(rowWithLookups.row, 'Phone'),
      rowWithLookups,
    ]),
  );

  const clientsToCreate = plan.createClients.map(({ phone }) => {
    const rowWithLookups = lookupByPhone.get(phone);
    return buildClient(rowWithLookups.row, leadIdByPhone.get(phone));
  });

  if (!clientsToCreate.length) {
    return { clientIdByPhone, created: 0 };
  }

  const { data, error } = await supabaseService
    .from('clients')
    .insert(clientsToCreate)
    .select('id, phone');

  if (error) return { error };

  (data || []).forEach((client) => clientIdByPhone.set(client.phone, client.id));

  const agentClientRows = (data || []).map((client) => {
    const row = lookupByPhone.get(client.phone).row;
    return {
      'agent_id': agentId,
      'client_id': client.id,
      'agent_notes': value(row, 'Notes') || null,
    };
  });

  const { error: agentClientError } = await supabaseService
    .from('agent_clients')
    .insert(agentClientRows);

  if (agentClientError) return { error: agentClientError };

  return { clientIdByPhone, created: data?.length || 0 };
}

// Policies are row-level records, so repeated clients still create multiple policies.
async function insertPolicies({ rowsWithLookups, clientIdByPhone, agentId }) {
  const policiesToCreate = rowsWithLookups.map((rowWithLookups) => {
    const phone = value(rowWithLookups.row, 'Phone');
    return buildPolicy(rowWithLookups, clientIdByPhone.get(phone), agentId);
  });

  const { data, error } = await supabaseService
    .from('policies')
    .insert(policiesToCreate)
    .select('id, policy_number');

  if (error) return { error };

  const policyIdByNumber = new Map(
    (data || []).map((policy) => [policy.policy_number, policy.id]),
  );

  return { policyIdByNumber, created: data?.length || 0 };
}

// Beneficiary columns are numbered groups mapped forward from each policy row.
async function insertBeneficiaries({ rowsWithLookups, policyIdByNumber }) {
  const beneficiaries = rowsWithLookups.flatMap((rowWithLookups) => {
    const row = rowWithLookups.row;
    const policyId = policyIdByNumber.get(value(row, 'Policy Number'));
    return [
      ...buildBeneficiaries(row, policyId, 'primary'),
      ...buildBeneficiaries(row, policyId, 'contingent'),
    ];
  });

  if (!beneficiaries.length) return { created: 0 };

  const { error } = await supabaseService
    .from('beneficiaries')
    .insert(beneficiaries);

  if (error) return { error };
  return { created: beneficiaries.length };
}

// Module entrypoint for stage 3.
async function importBook({ rows, agentId, plan }) {
  const resolved = await resolveImportRows(rows);
  if (resolved.error) {
    return {
      error: true,
      message: 'Failed to resolve import references',
      stage: 'import',
      errors: [{ row: '-', message: resolved.error.message }],
    };
  }

  if (resolved.errors.length) {
    return {
      error: true,
      message: 'CSV failed import reference validation',
      total: rows.length,
      inserted: 0,
      failed: rows.length,
      errors: resolved.errors,
      warnings: resolved.warnings,
      stage: 'import',
    };
  }

  const leadResult = await insertLeads({
    plan,
    rowsWithLookups: resolved.rowsWithLookups,
    agentId,
  });
  if (leadResult.error) return importError('Failed to create leads', leadResult.error);

  const clientResult = await insertClients({
    plan,
    rowsWithLookups: resolved.rowsWithLookups,
    leadIdByPhone: leadResult.leadIdByPhone,
    agentId,
  });
  if (clientResult.error) return importError('Failed to create clients', clientResult.error);

  const policyResult = await insertPolicies({
    rowsWithLookups: resolved.rowsWithLookups,
    clientIdByPhone: clientResult.clientIdByPhone,
    agentId,
  });
  if (policyResult.error) return importError('Failed to create policies', policyResult.error);

  const beneficiaryResult = await insertBeneficiaries({
    rowsWithLookups: resolved.rowsWithLookups,
    policyIdByNumber: policyResult.policyIdByNumber,
  });
  if (beneficiaryResult.error) {
    return importError('Failed to create beneficiaries', beneficiaryResult.error);
  }

  return {
    error: false,
    message: 'Book imported successfully',
    total: rows.length,
    inserted: policyResult.created,
    failed: 0,
    errors: [],
    warnings: resolved.warnings,
    stage: 'import',
    summary: {
      policiesCreated: policyResult.created,
    },
  };
}

function importError(message, error) {
  return {
    error: true,
    message,
    stage: 'import',
    errors: [{ row: '-', message: error.message }],
  };
}

module.exports = { importBook };
