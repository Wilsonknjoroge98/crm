const express = require('express');
const { buildPolicySlackPayload, sendToGSQ } = require('../helpers');
const dayjs = require('dayjs');
// eslint-disable-next-line new-cap
const policyRouter = express.Router();

policyRouter.get('/policies', async (req, res) => {
    try {
        const { data: policies, error } = await req.supabase.from('policies').select('*');
        if (error) {
            console.log('error', error);
            res.status(500).json({ error: 'Failed to fetch policies' });
        } else {
            res.status(200).json(policies);
        }
    } catch (error) {
        console.log('error', error);
        res.status(500).json({ error: 'Failed to fetch policies' });
    }
});
policyRouter.post('/policy', async (req, res) => {
    console.log('Creating policy');
    const { policy, clientId, agentIds } = req.body;

    const isGSQ = policy.leadSource === 'GetSeniorQuotes.com';

    if (!policy || !clientId || !agentIds) {
        console.log('Missing data');
        return res
            .status(400)
            .json({ error: 'Missing policy, client ID, or agent ID' });
    }

    const policyNumber = policy.policyNumber.trim();

    console.log('Creating policy', policyNumber);
    const { data: policyData, error: policyError } = await req.supabase.from('policies').insert(policy).select('*');
    // check for uniques constraint violation
    if (policyError) {
        if (policyError.code === '23505') {
            console.error('Policy number already exists:', policyNumber);
            return res.status(400).json({ error: 'Policy number already exists' });
        }
        console.error('Error creating policy:', policyError);
        return res.status(500).json({ error: 'Failed to create policy' });
    }


    try {
        // eslint-disable-next-line no-unused-vars
        const payload = buildPolicySlackPayload({
            agentName: `${req.agent.first_name} ${req.agent.last_name}`,
            product: policy.policyType,
            effectiveDate: dayjs(policy.effectiveDate).format('MM/DD'),
            annualPremium: Math.round(policy.premiumAmount * 12),
            carrier: policy.carrier,
        });
        // const client = new WebClient(process.env.SLACK_BOT_TOKEN);
        // const response = await client.chat.postMessage({
        //   channel: '#sales',
        //   text: payload.text,
        //   blocks: payload.blocks,
        // });
        // console.log('Slack bot test message sent:', response.ts);
    } catch (error) {
        console.error(
            'Error testing Slack bot:',
            error.response?.data || error.message,
        );
    }

    try {
        const { data: clientData, error: clientError } = await req.supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError) {
            console.error('Error fetching client:', clientError);
            return res.status(500).json({ error: 'Failed to fetch client' });
        }

        // mark as sold in GSQ
        if (isGSQ) await sendToGSQ(clientData);
        // mark lead as sold in CRM DB
        await req.supabase.from('leads').update({
            sold: true,
        }).eq('phone', clientData.phone);

        res.status(201).json({
            id: policyData.id,
            ...policy,
            agentIds: agentIds,
            client: clientId,
        });
    } catch (error) {
        console.error('Error creating policy:', error);
        res.status(500).json({ error: 'Failed to create policy' });
    }
});
module.exports = policyRouter;
