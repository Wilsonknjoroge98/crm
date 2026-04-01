const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const dayjs = require('dayjs');
const logger = require('firebase-functions/logger');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const insightsRouter = express.Router();

insightsRouter.get('/', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    const since = dayjs(startDate).format('YYYY-MM-DD');
    const until = dayjs(endDate).format('YYYY-MM-DD');
    // Add one day for the upper bound on timestamptz columns so endDate is inclusive
    const untilExclusive = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');

    const { data: clients, error: clientsError } = await supabaseService
      .from('clients')
      .select('id, leads!clients_lead_id_fkey ( gsq_source )')
      .gte('created_at', since)
      .lt('created_at', untilExclusive)
      .limit(10000);

    if (clientsError) {
      logger.error('Error fetching clients in insights', {
        error: clientsError,
      });
      return res.status(500).json({ error: 'Failed to fetch clients' });
    }

    const salesBySource = {};
    let unknownClients = 0;

    for (const client of clients || []) {
      logger.log('Processing client for insights', {
        clientId: client.id,
        source: client.leads?.gsq_source || null,
      });
      const source = client.leads?.gsq_source;
      if (source) {
        salesBySource[source] = (salesBySource[source] || 0) + 1;
      } else {
        unknownClients++;
      }
    }

    const totalSales =
      Object.values(salesBySource).reduce((s, n) => s + n, 0) || 1;

    // -------------------------------------------------------------------------
    // POLICIES — filtered by sold_date, source derived via client → lead
    // -------------------------------------------------------------------------
    const { data: policies, error: policiesError } = await supabaseService
      .from('policies')
      .select(
        `
        premium_amount,
        clients!policies_client_id_fkey (
          leads!clients_lead_id_fkey ( gsq_source )
        )
      `,
      )
      .gte('sold_date', since)
      .lte('sold_date', until)
      .limit(10000);

    if (policiesError) {
      logger.error('Error fetching policies in insights', {
        error: policiesError,
      });
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    // Group policies by gsq_source (skip those without one)
    const policiesBySource = {};
    for (const policy of policies || []) {
      const source = policy.clients?.leads?.gsq_source;
      if (!source) continue;
      if (!policiesBySource[source]) policiesBySource[source] = [];
      policiesBySource[source].push(policy);
    }

    // -------------------------------------------------------------------------
    // META — fetch all ads, then pull spend/leads per matched ad
    // -------------------------------------------------------------------------
    const accessToken = process.env.META_MARKETING_ACCESS_TOKEN;
    const adsByName = {};

    try {
      const adsResp = await axios.get(process.env.META_MARKETING_ADS_URL, {
        params: { fields: 'name', limit: 5000, access_token: accessToken },
      });
      for (const ad of adsResp.data.data || []) {
        if (ad.name) adsByName[ad.name.trim()] = ad.id;
      }
    } catch (err) {
      logger.error('Error fetching Meta ads in insights', {
        error: err.response?.data || err,
      });
      return res.status(500).json({ error: 'Meta ads fetch failed' });
    }

    async function getInsightsForAd(adId) {
      try {
        const resp = await axios.get(
          `https://graph.facebook.com/v20.0/${adId}/insights`,
          {
            params: {
              fields: 'spend,actions',
              time_range: JSON.stringify({ since, until }),
              access_token: accessToken,
            },
          },
        );
        const data = resp.data.data;
        if (!data || data.length === 0) return { spend: 0, leads: 0 };
        const row = data[0];
        const spend = parseFloat(row.spend || 0);
        const leadAction = (row.actions || []).find(
          (a) => a.action_type === 'lead',
        );
        const leads = leadAction ? parseInt(leadAction.value || 0, 10) : 0;
        return { spend, leads };
      } catch {
        return { spend: 0, leads: 0 };
      }
    }

    const sources = [];

    for (const [creative, sales] of Object.entries(salesBySource)) {
      const adId = adsByName[creative];
      let spend = 0;
      let leads = 0;

      if (adId) {
        ({ spend, leads } = await getInsightsForAd(adId));
      }

      const matched = policiesBySource[creative] || [];
      const totalAnnual = matched.reduce((sum, p) => {
        const monthly = Number(p.premium_amount);
        return sum + (isNaN(monthly) ? 0 : monthly * 12);
      }, 0);
      const averagePremium =
        matched.length > 0 ? totalAnnual / matched.length : 0;

      const closeRate = leads > 0 ? +((sales / leads) * 100).toFixed(2) : 0;
      const revenuePerLead = (closeRate / 100) * averagePremium;

      sources.push({
        id: adId || crypto.randomUUID(),
        creative,
        leads,
        sales,
        spend,
        averagePremium: +averagePremium.toFixed(2),
        cpl: spend > 0 && leads > 0 ? +(spend / leads).toFixed(2) : 0,
        cps: spend > 0 && sales > 0 ? +(spend / sales).toFixed(2) : 0,
        closeRate: leads > 0 ? +((sales / leads) * 100).toFixed(2) : 0,
        revenuePerLead: +revenuePerLead.toFixed(2),
      });
    }

    sources.sort((a, b) => b.sales - a.sales);

    return res.status(200).json({ sources, total: totalSales, unknownClients });
  } catch (error) {
    logger.error('Error in /insights endpoint', { error });
    return res.status(500).json({ error: 'Failed to fetch insights data' });
  }
});

module.exports = insightsRouter;
