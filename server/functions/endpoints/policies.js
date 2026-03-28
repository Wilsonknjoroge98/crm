const express = require('express');
const logger = require('firebase-functions/logger');
const dayjs = require('dayjs');
const { WebClient } = require('@slack/web-api');
const { supabaseService } = require('../services/supabase');
const { buildPolicySlackPayload } = require('../integrations/slack');

const slackTargets = [
  process.env.SLACK_BOT_TOKEN,
  process.env.SLACK_BOT_TOKEN_FEARLESS,
];
// eslint-disable-next-line new-cap
const policyRouter = express.Router();

const mapBeneficiaries = (list, policyId, type) =>
  (list || [])
    .filter((b) => b.first_name && b.last_name)
    .map((b) => ({
      policy_id: policyId,
      first_name: b.first_name,
      last_name: b.last_name,
      relationship: b.relationship || null,
      phone: b.phone || null,
      allocation_percent: b.share || null,
      beneficiary_type: type,
    }));

policyRouter.get('/all', async (req, res) => {
  try {
    logger.log('Fetching policies', {
      route: '/policy/all',
      method: 'GET',
      requesterId: req.agent?.id,
    });
    const { data: policies, error } = await supabaseService.from('policies')
      .select(`
        *,
        clients!policies_client_id_fkey ( first_name, last_name ),
        carriers ( name ),
        products ( name ),
        writing_agent:agents!policies_writing_agent_id_fkey ( first_name, last_name ),
        split_agent:agents!policies_split_agent_id_fkey ( first_name, last_name ),
        beneficiaries!beneficiaries_policy_id_fkey ( id, first_name, last_name, relationship, allocation_percent, beneficiary_type, phone )
      `);

    if (error) {
      logger.error('Error fetching policies in endpoints/policies.js', {
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    const mapped = (policies || []).map(
      ({
        clients: c,
        carriers: car,
        products: prod,
        writing_agent: wa,
        split_agent: sa,
        beneficiaries: bens,
        ...policy
      }) => ({
        ...policy,
        client_name: c
          ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || null
          : null,
        carrier_name: car?.name || null,
        product_name: prod?.name || null,
        writing_agent_name: wa
          ? `${wa.first_name ?? ''} ${wa.last_name ?? ''}`.trim() || null
          : null,
        split_agent_name: sa
          ? `${sa.first_name ?? ''} ${sa.last_name ?? ''}`.trim() || null
          : null,
        beneficiaries: bens || [],
      }),
    );

    res.status(200).json(mapped);
  } catch (error) {
    logger.error('Error fetching policies in endpoints/policies.js', { error });
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

policyRouter.get('/', async (req, res) => {
  try {
    const targetAgentId = req.query.agentId || req.agent.id;
    const { startDate, endDate } = req.query;

    logger.log('Fetching policies for agent', {
      route: '/policy',
      method: 'GET',
      requesterId: req.agent?.id,
      targetAgentId,
      startDate,
      endDate,
    });

    let query = supabaseService
      .from('policies')
      .select(
        `
        *,
        clients!policies_client_id_fkey ( first_name, last_name ),
        carriers ( name ),
        products ( name ),
        writing_agent:agents!policies_writing_agent_id_fkey ( first_name, last_name ),
        split_agent:agents!policies_split_agent_id_fkey ( first_name, last_name ),
        beneficiaries!beneficiaries_policy_id_fkey ( id, first_name, last_name, relationship, allocation_percent, beneficiary_type, phone )
      `,
      )
      .or(
        `writing_agent_id.eq.${targetAgentId},split_agent_id.eq.${targetAgentId}`,
      );

    if (startDate) query = query.gte('sold_date', startDate);
    if (endDate) query = query.lte('sold_date', endDate);

    const { data: policies, error } = await query;

    if (error) {
      logger.error('Error fetching policies in endpoints/policies.js', {
        route: '/policy',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      });
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    const mapped = (policies || []).map(
      ({
        clients: c,
        carriers: car,
        products: prod,
        writing_agent: wa,
        split_agent: sa,
        beneficiaries: bens,
        ...policy
      }) => ({
        ...policy,
        client_name: c
          ? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || null
          : null,
        carrier_name: car?.name || null,
        product_name: prod?.name || null,
        writing_agent_name: wa
          ? `${wa.first_name ?? ''} ${wa.last_name ?? ''}`.trim() || null
          : null,
        split_agent_name: sa
          ? `${sa.first_name ?? ''} ${sa.last_name ?? ''}`.trim() || null
          : null,
        beneficiaries: bens || [],
      }),
    );

    logger.log('Fetched policies successfully', {
      route: '/policy',
      method: 'GET',
      requesterId: req.agent?.id,
      count: mapped.length,
    });

    return res.status(200).json(mapped);
  } catch (error) {
    logger.error(
      'Unexpected error fetching policies in endpoints/policies.js',
      {
        route: '/policy',
        method: 'GET',
        requesterId: req.agent?.id,
        error,
      },
    );
    return res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

policyRouter.post('/', async (req, res) => {
  const { policy, client_id } = req.body;

  if (!policy || !client_id) {
    logger.warn('Missing policy or client ID in endpoints/policies.js');
    return res.status(400).json({ error: 'Missing policy or client ID' });
  }

  const carrier_id = policy?.carrier;
  const product_id = policy?.product;

  const {
    beneficiaries,
    contingent_beneficiaries,
    clientName,
    split_policy,
    lead_vendor_id,
    carrier,
    notes,
    product,
    ...policyFields
  } = policy;

  const insertPayload = {
    ...policyFields,
    client_id,
    carrier_id,
    product_id,
    premium_frequency: policyFields.premium_frequency.toLowerCase(),
    policy_status: policyFields.policy_status.toLowerCase(),
    writing_agent_id: req.agent.id,
    writing_agent_notes: notes || null,
  };

  logger.log('Creating policy', {
    route: '/policy',
    method: 'POST',
    requesterId: req.agent?.id,
    policyNumber: insertPayload.policy_number,
    client_id,
  });

  const { data: policyData, error: policyError } = await supabaseService
    .from('policies')
    .insert(insertPayload)
    .select('id')
    .single();

  if (policyError) {
    if (policyError.code === '23505') {
      return res.status(409).json({ error: 'Policy number already exists' });
    }
    logger.error('Error creating policy in endpoints/policies.js', {
      error: policyError,
    });
    return res.status(500).json({ error: 'Failed to create policy' });
  }

  const policyId = policyData.id;

  const allBeneficiaries = [
    ...mapBeneficiaries(beneficiaries, policyId, 'primary'),
    ...mapBeneficiaries(contingent_beneficiaries, policyId, 'contingent'),
  ];

  if (allBeneficiaries.length > 0) {
    const { error: beneficiaryError } = await supabaseService
      .from('beneficiaries')
      .insert(allBeneficiaries);

    if (beneficiaryError) {
      logger.error('Error creating beneficiaries in endpoints/policies.js', {
        error: beneficiaryError,
        policyId,
      });
      return res.status(500).json({ error: 'Failed to create beneficiaries' });
    }
  }

  try {
    const { data: clientData, error: clientError } = await supabaseService
      .from('clients')
      .select('phone')
      .eq('id', client_id)
      .single();

    if (clientError) {
      logger.error('Error fetching client in endpoints/policies.js', {
        error: clientError,
        client_id,
      });
    }

    await supabaseService
      .from('leads')
      .update({ sold: true })
      .eq('phone', clientData.phone);
  } catch (error) {
    logger.error('Error updating lead sold status in endpoints/policies.js', {
      error,
      client_id,
    });
  }

  logger.log('Created policy successfully', {
    route: '/policy',
    method: 'POST',
    requesterId: req.agent?.id,
    policyId,
  });

  try {
    const [{ data: productData }, { data: carrierData }] = await Promise.all([
      supabaseService
        .from('products')
        .select('name')
        .eq('id', product_id)
        .single(),
      supabaseService
        .from('carriers')
        .select('name')
        .eq('id', carrier_id)
        .single(),
    ]);

    const agentName =
      `${req.agent?.first_name ?? ''} ${req.agent?.last_name ?? ''}`.trim();
    const ap = Number(insertPayload.premium_amount) * 12;
    const eft = insertPayload.effective_date
      ? dayjs(insertPayload.effective_date).format('MM/DD')
      : null;

    const payload = buildPolicySlackPayload({
      agentName,
      product: productData?.name ?? 'Unknown',
      annualPremium: ap,
      carrier: carrierData?.name ?? 'Unknown',
      effectiveDate: eft,
    });

    await Promise.all(
      slackTargets
        .filter(({ token }) => token)
        .map(({ token }) =>
          new WebClient(token).chat.postMessage({
            channel: '#sales',
            text: payload.text,
            blocks: payload.blocks,
          }),
        ),
    );
  } catch (err) {
    logger.error('Failed to send Slack notification in endpoints/policies.js', {
      error: err,
    });
  }

  return res.status(201).json({ id: policyId });
});

policyRouter.patch('/', async (req, res) => {
  const { policyId, policy } = req.body;

  if (!policyId || !policy) {
    logger.warn('Missing policyId or policy payload in endpoints/policies.js');
    return res
      .status(400)
      .json({ error: 'Missing policyId or policy payload' });
  }

  const {
    beneficiaries,
    contingent_beneficiaries,
    clientName,
    split_policy,
    product,
    carrier,
    carrier_name,
    product_name,
    client_name,
    split_agent_name,
    writing_agent_name,
    ...policyFields
  } = policy;

  logger.log('Updating policy', {
    route: '/policy',
    method: 'PATCH',
    requesterId: req.agent?.id,
    policyId,
    fieldsToUpdate: Object.keys(policyFields),
  });

  const { data, error } = await supabaseService
    .from('policies')
    .update(policyFields)
    .eq('id', policyId)
    .select('id')
    .single();

  if (error) {
    logger.error('Error updating policy in endpoints/policies.js', {
      error,
      policyId,
    });
    return res.status(500).json({ error: 'Failed to update policy' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Policy not found' });
  }

  const hasBeneficiaries =
    beneficiaries !== undefined || contingent_beneficiaries !== undefined;

  if (hasBeneficiaries) {
    const { error: deleteError } = await supabaseService
      .from('beneficiaries')
      .delete()
      .eq('policy_id', policyId);

    if (deleteError) {
      logger.error('Error deleting beneficiaries in endpoints/policies.js', {
        error: deleteError,
        policyId,
      });
      return res.status(500).json({ error: 'Failed to update beneficiaries' });
    }

    const allBeneficiaries = [
      ...mapBeneficiaries(beneficiaries, policyId, 'primary'),
      ...mapBeneficiaries(contingent_beneficiaries, policyId, 'contingent'),
    ];

    if (allBeneficiaries.length > 0) {
      const { error: insertError } = await supabaseService
        .from('beneficiaries')
        .insert(allBeneficiaries);

      if (insertError) {
        logger.error(
          'Error reinserting beneficiaries in endpoints/policies.js',
          { error: insertError, policyId },
        );
        return res
          .status(500)
          .json({ error: 'Failed to update beneficiaries' });
      }
    }
  }

  logger.log('Updated policy successfully', {
    route: '/policy',
    method: 'PATCH',
    requesterId: req.agent?.id,
    policyId,
  });
  return res.status(200).json({ id: policyId });
});

policyRouter.delete('/', async (req, res) => {
  const { policyId } = req.body;

  if (!policyId) {
    logger.warn('Missing policyId in endpoints/policies.js', {
      route: '/policy',
      method: 'DELETE',
      requesterId: req.agent?.id,
    });
    return res.status(400).json({ error: 'Missing policyId' });
  }

  console.log('Attempting to delete policy', {
    route: '/policy',
    method: 'DELETE',
    requesterId: req.agent?.id,
    policyId,
  });

  try {
    logger.log('Deleting policy', {
      route: '/policy',
      method: 'DELETE',
      requesterId: req.agent?.id,
      policyId,
    });

    const { error: beneficiaryError } = await supabaseService
      .from('beneficiaries')
      .delete()
      .eq('policy_id', policyId);

    if (beneficiaryError) {
      logger.error('Error deleting beneficiaries in endpoints/policies.js', {
        error: beneficiaryError,
        policyId,
      });
      return res
        .status(500)
        .json({ error: 'Failed to delete policy beneficiaries' });
    }

    const { error: policyError } = await supabaseService
      .from('policies')
      .delete()
      .eq('id', policyId);

    if (policyError) {
      logger.error('Error deleting policy in endpoints/policies.js', {
        error: policyError,
        policyId,
      });
      return res.status(500).json({ error: 'Failed to delete policy' });
    }

    logger.log('Deleted policy successfully', {
      route: '/policy',
      method: 'DELETE',
      requesterId: req.agent?.id,
      policyId,
    });

    return res.status(200).json({ message: 'Policy deleted successfully' });
  } catch (error) {
    logger.error('Unexpected error deleting policy in endpoints/policies.js', {
      error,
      policyId,
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = policyRouter;
