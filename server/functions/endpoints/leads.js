const express = require('express');
const logger = require('firebase-functions/logger');

// eslint-disable-next-line new-cap
const leadRouter = express.Router();

leadRouter.get('/leads', async (req, res) => {
    try {
        logger.log('Getting leads', {
            route: '/leads',
            method: 'GET',
            requesterId: req.agent?.id,
        });

        const { data: leads, error } = await req.supabase.from('leads').select('*');

        if (error) {
            logger.error('Error fetching leads in endpoints/leads.js', {
                route: '/leads',
                method: 'GET',
                requesterId: req.agent?.id,
                error,
            });
            return res.status(500).json({ error: 'Failed to fetch leads' });
        }

        logger.log('Fetched leads successfully', {
            route: '/leads',
            method: 'GET',
            requesterId: req.agent?.id,
            count: leads?.length || 0,
        });

        return res.status(200).json(leads);
    } catch (error) {
        logger.error('Unexpected error fetching leads in endpoints/leads.js', {
            route: '/leads',
            method: 'GET',
            requesterId: req.agent?.id,
            error,
        });
        return res.status(500).json({ error: 'Failed to fetch leads' });
    }
});

module.exports = leadRouter;
