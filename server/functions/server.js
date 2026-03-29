const cors = require('cors');
const express = require('express');
const axios = require('axios');
const app = express();
const dayjs = require('dayjs');
const crypto = require('crypto');
const logger = require('firebase-functions/logger');
// eslint-disable-next-line no-unused-vars
const { PRODUCT_RATES } = require('./constants');
const { authMiddleware } = require('./middleware/auth');
const { Firestore, Timestamp } = require('firebase-admin/firestore');
const admin = require('firebase-admin');
const { supabaseService } = require('./services/supabase');
const {
  agentRouter,
  policyRouter,
  leadRouter,
  clientRouter,
  teamLeaderboardRouter,
  summaryRouter,
  hierarchyRouter,
  eventsRouter,
  expensesRouter,
  leaderboardRouter,
  publicRouter,
  inviteRouter,
  leadVendorsRouter,
  carriersRouter,
} = require('./endpoints');

admin.initializeApp();
app.use(
  cors({
    origin: [
      'https://crm-dev-dde35.web.app',
      'https://fearless-ins.com',
      'https://hourglasslifegroup.com',
      'https://hourglass-ef3ca.web.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  }),
);
app.use(express.json());
app.use(publicRouter);
app.use(authMiddleware);
app.use('/agent', agentRouter);
app.use('/invite', inviteRouter);
app.use('/policy', policyRouter);
app.use('/lead', leadRouter);
app.use('/client', clientRouter);
app.use('/lead-vendors', leadVendorsRouter);
app.use('/carriers', carriersRouter);
app.use('/team-leaderboard', teamLeaderboardRouter);
app.use('/summary', summaryRouter);
app.use('/hierarchy', hierarchyRouter);
app.use('/events', eventsRouter);
app.use('/expenses', expensesRouter);
app.use('/leaderboard', leaderboardRouter);

// const isEmulator =
//   !!process.env.FIRESTORE_EMULATOR_HOST ||
//   !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
//   process.env.FUNCTIONS_EMULATOR === 'true';

// const authMiddleware = async (req, res, next) => {
//   try {
//     const idToken = (req.headers.authorization || '').replace('Bearer ', '');
//     if (!idToken) {
//       return res.status(401).json({ error: 'Missing Authorization' });
//     }

//     const decoded = await admin.auth().verifyIdToken(idToken);
//     // derive identity & role ONLY from the verified token
//     req.user = {
//       uid: decoded.uid,
//       role: decoded.role || 'agent',
//       email: decoded.email,
//     };
//     next();
//   } catch (e) {
//     console.error('Auth error', e);
//     res.status(401).json({ error: 'Invalid token' });
//   }
// };

// function getDownline(agentId, agents) {
//   const result = new Set([agentId]); // Include self
//   const queue = [agentId];

//   while (queue.length > 0) {
//     const current = queue.shift();

//     const children = agents.filter((a) => a.uplineUid === current);

//     for (const child of children) {
//       if (!result.has(child.id)) {
//         result.add(child.id);
//         queue.push(child.id);
//       }
//     }
//   }

//   return Array.from(result);
// }

app.get('/customer-account', async (req, res) => {
  const { email } = req.query;

  console.log('Getting account for', email);

  const getCustomerAccount = async () => {
    try {
      const response = await axios.request({
        headers: {
          Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
        },
        params: {
          email: email,
        },
        method: 'GET',
        url: `${process.env.GSQ_BASE_URL}/customer-account`,
      });

      console.log('Account Fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching leads from GSQ:', error.message);
      throw error;
    }
  };

  const account = await getCustomerAccount();
  console.log('Account details', account);
  res.status(200).json(account);
});

app.get('/premiums', async (req, res) => {
  const { agency, startDate, endDate } = req.query;

  if (!agency || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  logger.log('Getting leaderboard');
  logger.log({ startDate, endDate });

  // if (mode === 'development') {
  //   return res.status(200).json([
  //     { name: 'Alice Johnson', count: 15, premiumAmount: 18000 },
  //     { name: 'Bob Smith', count: 12, premiumAmount: 15000 },
  //     { name: 'Charlie Brown', count: 10, premiumAmount: 12000 },
  //     { name: 'Diana Prince', count: 8, premiumAmount: 10000 },
  //     { name: 'Ethan Hunt', count: 7, premiumAmount: 9000 },
  //     { name: 'Fiona Glenanne', count: 6, premiumAmount: 8000 },
  //     { name: 'George Bailey', count: 5, premiumAmount: 7000 },
  //     { name: 'Hannah Montana', count: 4, premiumAmount: 6000 },
  //   ]);
  // }

  const db = new Firestore();
  try {
    const agentsSnapshot = await db.collection('agents').get();
    const agents = agentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const agencyAgents = agents.filter((a) =>
      agency ? a.agency === agency : true,
    );
    const agencyAgentIds = agencyAgents.map((a) => a.uid);

    const policiesSnapshot = await db
      .collection('policies')
      .where('dateSold', '>=', startDate)
      .where('dateSold', '<=', endDate)
      .get();

    const policies = policiesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const agencyPolicies = policies.filter((policy) => {
      const policyAgentIds = policy.agentIds || [];
      return policyAgentIds.some((id) => agencyAgentIds.includes(id));
    });

    const leaderboard = {};

    for (const policy of agencyPolicies) {
      policy.agentIds = policy.agentIds || [];
      policy.premiumAmount = Number(policy.premiumAmount) || 0;

      // Calculate leaderboard points
      for (const agentId of policy.agentIds) {
        const agentName =
          agents.find((a) => a.uid === agentId)?.name || 'Unknown Agent';

        const premiumPoints = Math.round(Number(policy.premiumAmount * 12));

        leaderboard[agentName] = leaderboard[agentName] || {
          count: 0,
          premiumAmount: 0,
        };
        leaderboard[agentName].count += 1;
        leaderboard[agentName].premiumAmount += premiumPoints;
      }
    }

    // Convert leaderboard object to array
    const leaderboardArray = Object.entries(leaderboard).map(
      ([name, data]) => ({
        name,
        ...data,
      }),
    );

    // Sort leaderboard by points
    leaderboardArray.sort((a, b) => b.premiumAmount - a.premiumAmount);

    // const topLeaderboardArray = leaderboardArray.slice(0, 30);

    logger.log('Leaderboard data:', leaderboardArray);

    res.status(200).json(leaderboardArray);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

app.get('/insights', async (req, res) => {
  const { mode, startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    console.error('Missing startDate or endDate');
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    const since = dayjs(startDate).format('YYYY-MM-DD');
    const until = dayjs(endDate).format('YYYY-MM-DD');

    // ---------------------------------------------------------------------
    // DEVELOPMENT MOCK DATA
    // ---------------------------------------------------------------------
    // if (mode === 'development') {
    //   return res.status(200).json({
    //     sources: [
    //       { name: 'WK | Annie Winner | 5/11/25', sales: 20, spend: 2000, cps: 100 },
    //       { name: 'TJ | Alana Book | 8/1/25', sales: 20, spend: 2000, cps: 100 },
    //       { name: 'WK | E Philip 4 | 9/4/25', sales: 20, spend: 2000, cps: 100 },
    //       { name: 'TJ | Alana Mug 7/13/25', sales: 10, spend: 1000, cps: 100 },
    //       { name: 'WK | E Philip 2 | 9/4/25', sales: 10, spend: 1000, cps: 100 },
    //       { name: 'WK | Annie Scam Hook 2 | 9/7/25', sales: 10, spend: 1000, cps: 100 },
    //     ],
    //     total: 100,
    //     unknownClients: 5,
    //   });
    // }

    // ---------------------------------------------------------------------
    // LOAD FIRESTORE CLIENTS
    // ---------------------------------------------------------------------
    const db = new Firestore();
    const ref = db.collection('clients');

    const snapshot = await ref.get();

    const clients = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Build source → sales count
    const maps = clients.reduce(
      (acc, c) => {
        const key = (c.source || 'unknown').trim();
        acc.all[key] = (acc.all[key] || 0) + 1;
        if (key !== 'unknown') acc.known[key] = (acc.known[key] || 0) + 1;
        return acc;
      },
      { all: {}, known: {} },
    );

    const totalSales =
      Object.values(maps.known).reduce((s, n) => s + n, 0) || 1;
    const unknownClients = maps.all['unknown'] || 0;

    const accessToken = process.env.META_MARKETING_ACCESS_TOKEN;

    // 1. GET ALL ADS (name + id)
    const adsByName = {};

    try {
      const adsResp = await axios.get(process.env.META_MARKETING_ADS_URL, {
        params: {
          fields: 'name',
          limit: 5000,
          access_token: accessToken,
        },
      });

      for (const ad of adsResp.data.data || []) {
        if (ad.name) adsByName[ad.name.trim()] = ad.id;
      }
    } catch (err) {
      console.error('Error fetching ads:', err.response?.data || err);
      return res.status(500).send({ error: 'Meta ads fetch failed' });
    }

    // Helper: Get spend and leads for a single ad ID from Meta
    async function getInsightsForAd(adId) {
      try {
        const insightsResp = await axios.get(
          `https://graph.facebook.com/v20.0/${adId}/insights`,
          {
            params: {
              fields: 'spend,actions',
              time_range: JSON.stringify({ since, until }),
              access_token: accessToken,
            },
          },
        );

        const data = insightsResp.data.data;
        if (!data || data.length === 0) return { spend: 0, leads: 0 };

        const row = data[0];
        const spend = parseFloat(row.spend || 0);
        const leadAction = (row.actions || []).find(
          (a) => a.action_type === 'lead',
        );
        const leads = leadAction ? parseInt(leadAction.value || 0, 10) : 0;

        return { spend, leads };
      } catch (error) {
        console.error(
          `Error fetching insights for ad ${adId}:`,
          error.response?.data || error,
        );
        return { spend: 0, leads: 0 };
      }
    }

    const policiesRef = db.collection('policies');
    const policiesSnapshot = await policiesRef.get();
    const policies = policiesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // ---------------------------------------------------------------------
    // MERGE SALES + SPEND
    // ---------------------------------------------------------------------
    const sources = [];
    const devEntries = {
      'WK | Annie Winner | 5/11/25': 20,
      'TJ | Alana Book | 8/1/25': 20,
      'WK | E Philip 4 | 9/4/25': 20,
      'TJ | Alana Mug 7/13/25': 10,
      'WK | E Philip 2 | 9/4/25': 10,
      'WK | Annie Scam Hook 2 | 9/7/25': 10,
      'WK | Tim - Cousin Passed | 11/25/2025': 5,
      'TJ | Roy - Uninsurable | 11/16/2025': 15,
    };

    for (const [creative, sales] of Object.entries(
      mode === 'development' ? devEntries : maps.known,
    )) {
      const adId = adsByName[creative];
      let spend = 0;
      let leads = 0;

      if (adId) {
        ({ spend, leads } = await getInsightsForAd(adId));
      }

      console.log(
        `Source: ${creative}, Sales: ${sales}, Leads: ${leads}, Spend: ${spend}`,
      );

      const matched = policies.filter(
        (p) => (p.source || 'unknown').trim() === creative,
      );

      const totalAnnual = matched.reduce((sum, p) => {
        const monthly = Number(p.premiumAmount);
        return sum + (isNaN(monthly) ? 0 : monthly * 12);
      }, 0);

      const averagePremium =
        matched.length > 0 ? totalAnnual / matched.length : 0;

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
      });
    }

    sources.sort((a, b) => b.sales - a.sales);

    console.log('Final insights response:', {
      sources,
      totalSales,
      unknownClients,
    });

    return res.status(200).json({
      sources,
      total: totalSales,
      unknownClients,
    });
  } catch (error) {
    logger.log('Error in /insights endpoint:', error);
    return res.status(500).json({ error: 'Failed to fetch insights data' });
  }
});

app.get('/commissions', async (req, res) => {
  // TODO - flip to shea's id
  const AGENT_ID = '6a1aae1d-f2be-4cd5-aad0-fa1ed43da147';

  const getContractRate = (level, carrierName, productName) => {
    const rate = PRODUCT_RATES?.[carrierName]?.[productName]?.[String(level)];
    return rate != null ? rate / 100 : 1;
  };

  try {
    logger.log('Calculating commissions', {
      route: '/commissions',
      method: 'GET',
      targetAgentId: AGENT_ID,
    });

    const { data: allAgents, error: agentsError } = await supabaseService
      .from('agents')
      .select('id, first_name, last_name, level, upline_agent_id');

    if (agentsError) {
      logger.error('Error fetching agents in /commissions', {
        error: agentsError,
      });
      return res.status(500).json({ error: 'Failed to fetch agents' });
    }

    const agent = allAgents.find((a) => a.id === AGENT_ID);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // BFS to collect all downline agent IDs (excluding the agent themselves)
    const downlineIds = new Set();
    const queue = [AGENT_ID];
    while (queue.length > 0) {
      const currentId = queue.shift();
      for (const a of allAgents) {
        if (a.upline_agent_id === currentId && !downlineIds.has(a.id)) {
          downlineIds.add(a.id);
          queue.push(a.id);
        }
      }
    }
    const { data: ownPolicies, error: ownPoliciesError } = await supabaseService
      .from('policies')
      .select(
        'id, premium_amount, split_agent_id, split_agent_share, carriers ( name ), products ( name )',
      )
      .eq('writing_agent_id', AGENT_ID);

    if (ownPoliciesError) {
      logger.error('Error fetching own policies in /commissions', {
        error: ownPoliciesError,
      });
      return res.status(500).json({ error: 'Failed to fetch policies' });
    }

    let directCommissions = 0;

    for (const policy of ownPolicies || []) {
      const carrierName = policy.carriers?.name;
      const productName = policy.products?.name;
      const contractRate = getContractRate(
        agent.level,
        carrierName,
        productName,
      );
      const ap = Number(policy.premium_amount) * 12;

      if (policy.split_agent_id && policy.split_agent_share != null) {
        // Writing agent's share is whatever the split agent doesn't take
        const writingAgentShare = (100 - policy.split_agent_share) / 100;
        directCommissions += ap * writingAgentShare * contractRate;
      } else {
        directCommissions += ap * contractRate;
      }
    }

    let overridingCommissions = 0;

    if (downlineIds.size > 0) {
      const { data: downlinePolicies, error: downlinePoliciesError } =
        await supabaseService
          .from('policies')
          .select(
            'id, premium_amount, writing_agent_id, carriers ( name ), products ( name )',
          )
          .in('writing_agent_id', [...downlineIds]);

      if (downlinePoliciesError) {
        logger.error('Error fetching downline policies in /commissions', {
          error: downlinePoliciesError,
        });
        return res
          .status(500)
          .json({ error: 'Failed to fetch downline policies' });
      }

      const agentMap = new Map(allAgents.map((a) => [a.id, a]));

      for (const policy of downlinePolicies || []) {
        const downlineAgent = agentMap.get(policy.writing_agent_id);
        if (!downlineAgent) continue;

        const carrierName = policy.carriers?.name;
        const productName = policy.products?.name;
        const uplineRate = getContractRate(
          agent.level,
          carrierName,
          productName,
        );
        const downlineRate = getContractRate(
          downlineAgent.level,
          carrierName,
          productName,
        );
        const overrideRate = uplineRate - downlineRate;

        if (overrideRate > 0) {
          const ap = Number(policy.premium_amount) * 12;
          overridingCommissions += ap * overrideRate;
        }
      }
    }

    const totalCommissions = Math.round(
      directCommissions + overridingCommissions,
    );

    logger.log('Commissions calculated successfully', {
      route: '/commissions',
      method: 'GET',
      targetAgentId: AGENT_ID,
      agentName: `${agent.first_name} ${agent.last_name}`,
      directCommissions: Math.round(directCommissions),
      overridingCommissions: Math.round(overridingCommissions),
      totalCommissions,
    });

    return res.status(200).json({
      agentId: AGENT_ID,
      agentName: `${agent.first_name} ${agent.last_name}`,
      direct: Math.round(directCommissions),
      overriding: Math.round(overridingCommissions),
      total: Math.round(totalCommissions),
    });
  } catch (error) {
    logger.error('Unexpected error in /commissions', { error });
    return res.status(500).json({ error: 'Failed to calculate commissions' });
  }
});

app.get('/commissions_legacy', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    console.error('Missing startDate or endDate');
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  const startTimestamp = dayjs(startDate, 'YYYY-MM-DD').startOf('day');
  const endTimestamp = dayjs(endDate, 'YYYY-MM-DD').endOf('day');

  const getLevel = async (agent, policy) => {
    console.log(
      'Getting level for agent:',
      agent.email,
      'and policy effective date:',
      policy.effectiveDate,
    );
    const levelsRef = db.collection(`agents/${agent.email}/levels`);
    const q = levelsRef
      .where('effectiveDate', '<=', dayjs(policy.effectiveDate).toDate())
      .orderBy('effectiveDate', 'desc')
      .limit(1);
    const snapshot = await q.get();
    if (!snapshot.empty) {
      console.log(
        'Level found for agent:',
        agent.email,
        snapshot.docs[0].data(),
      );
      const data = snapshot.docs[0].data();
      return data.level;
    }
    return null;
  };

  console.log('Calculating commissions from', startDate, 'to', endDate);
  const db = new Firestore();

  const policySnapshot = await db.collection('policies').get();
  const policies = policySnapshot.docs.map((doc) => doc.data());
  const agentSnapshot = await db.collection('agents').get();
  const agents = agentSnapshot.docs.map((doc) => doc.data());

  const commissions = {};
  let annualPremiumTotal = 0;

  for (const policy of policies) {
    const status = policy.policyStatus || 'active';
    if (
      status.toLowerCase() === 'cancelled' ||
      status.toLowerCase() === 'lapsed'
    ) {
      console.log(
        'Skipping canceled/lapsed policy:',
        policy.policyNumber,
        status,
      );
      continue;
    }

    const effectiveDate = policy.effectiveDate;

    if (dayjs(effectiveDate).isBefore(startTimestamp)) {
      console.log(
        'Skipping policy before start date:',
        policy.policyNumber,
        effectiveDate,
      );
      continue;
    }

    if (dayjs(effectiveDate).isAfter(endTimestamp)) {
      console.log(
        'Skipping policy after end date:',
        policy.policyNumber,
        effectiveDate,
      );
      continue;
    }

    const commissionsTotal = Object.values(commissions).reduce(
      (a, b) => a + b,
      0,
    );

    console.log(
      'Commissions total so far:',
      commissionsTotal,
      'Annual premium so far:',
      annualPremiumTotal,
      'Shea premium so far:',
      commissions['Shea Morales'],
    );

    console.log('Processing policy:', {
      carrier: policy.carrier,
      policyType: policy.policyType,
      policyNumber: policy.policyNumber,
      premiumAmount: policy.premiumAmount,
    });

    const monthlyPremium = Math.round(Number(policy.premiumAmount)) || 0;
    console.log('Monthly premium:', monthlyPremium);
    const annualPremium = Math.round(monthlyPremium * 12);
    annualPremiumTotal = annualPremiumTotal + annualPremium;
    console.log('Annual premium:', annualPremium);
    const policyType = policy.policyType;
    const policyCarrier = policy.carrier;

    if (policy.splitPolicy && policy.agentIds.length === 2) {
      console.log('Split policy detected');

      const [agent1, agent2] = agents.filter((agent) =>
        policy.agentIds.includes(agent.uid),
      );
      const splitPremium = Math.round(annualPremium / 2);
      console.log('Split premium:', splitPremium);

      let agent1Level = await getLevel(agent1, policy);
      let agent2Level = await getLevel(agent2, policy);

      if (!agent1Level) {
        agent1Level = agent1.level;
      }

      if (!agent2Level) {
        agent2Level = agent2.level;
      }

      const carrierRates = PRODUCT_RATES[policyCarrier?.trim()];
      const productRates = carrierRates?.[policyType?.trim()];

      let agent1ProductRate = productRates?.[String(agent1Level)] / 100;
      let agent2ProductRate = productRates?.[String(agent2Level)] / 100;

      if (!agent1ProductRate || !agent2ProductRate) {
        const id = `${policy.carrier}-${policyType}`;

        const docRef = db.collection('missingRates').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          await docRef.set({
            carrier: policy.carrier,
            policyType: policyType,
            type: 'split',
            agent1Level,
            agent2Level,
            createdAt: Timestamp.now(),
          });
        }
        agent1ProductRate = 1;
        agent2ProductRate = 1;
      }

      const agent1Commission = Math.round(splitPremium * agent1ProductRate);
      console.log(
        `Agent 1 commission: ${agent1?.name} ${agent1Commission} product rate: ${agent1ProductRate}`,
      );
      const agent2Commission = Math.round(splitPremium * agent2ProductRate);
      console.log(
        `Agent 2 commission: ${agent2?.name} ${agent2Commission} product rate: ${agent2ProductRate}`,
      );

      commissions[agent1.name] =
        (commissions[agent1.name] || 0) + agent1Commission;
      commissions[agent2.name] =
        (commissions[agent2.name] || 0) + agent2Commission;

      // ---- agent 1 uplines ----
      if (agent1.uplineUid) {
        const upline = agents.find((a) => a.uid === agent1.uplineUid);

        if (!upline) {
          console.error('No upline found for agent 1', agent1.name);
          continue;
        }

        let uplineLevel = await getLevel(upline, policy);
        if (!uplineLevel) {
          uplineLevel = upline.level;
        }

        let uplineProductRate = productRates?.[String(uplineLevel)] / 100;

        if (!uplineProductRate) {
          const id = `${policy.carrier}-${policyType}`;
          const docRef = db.collection('missingRates').doc(id);
          const docSnap = await docRef.get();

          if (!docSnap.exists) {
            await docRef.set({
              carrier: policy.carrier,
              policyType: policyType,
              type: 'split',
              agent1Level,
              createdAt: Timestamp.now(),
            });
          }

          uplineProductRate = 1;
        }

        if (upline) {
          console.log(
            `Found upline for agent 1: ${upline?.name} product rate: ${uplineProductRate}`,
          );
          const uplineCommission = Math.round(
            splitPremium * (uplineProductRate - agent1ProductRate),
          );
          commissions[upline.name] =
            (commissions[upline.name] || 0) + uplineCommission;

          console.log('Commission upline:', uplineCommission);

          if (upline.uplineUid) {
            const secondUpline = agents.find((a) => a.uid === upline.uplineUid);

            if (!secondUpline) {
              console.error('No upline found for upline agent', upline.name);
              continue;
            }

            let secondUplineLevel = await getLevel(secondUpline, policy);
            if (!secondUplineLevel) {
              secondUplineLevel = secondUpline.level;
            }

            let secondUplineProductRate =
              productRates?.[String(secondUplineLevel)] / 100;

            if (!secondUplineProductRate) {
              const id = `${policy.carrier}-${policyType}`;
              const docRef = db.collection('missingRates').doc(id);
              const docSnap = await docRef.get();
              if (!docSnap.exists) {
                await docRef.set({
                  carrier: policy.carrier,
                  policyType: policyType,
                  type: 'split',
                  agent1Level,
                  createdAt: Timestamp.now(),
                });
              }

              secondUplineProductRate = 1;
            }

            if (secondUpline) {
              console.log(
                `Found upline for upline of agent 1: ${secondUpline?.name} product rate: ${secondUplineProductRate}`,
              );
              const secondUplineCommission = Math.round(
                splitPremium * (secondUplineProductRate - uplineProductRate),
              );
              commissions[secondUpline.name] =
                (commissions[secondUpline.name] || 0) + secondUplineCommission;

              console.log('Commission 2nd upline:', secondUplineCommission);
            }
          }
        }
      }

      // ---- agent 2 uplines ----
      if (agent2.uplineUid) {
        const upline = agents.find((a) => a.uid === agent2.uplineUid);

        let uplineLevel = await getLevel(upline, policy);
        if (!uplineLevel) {
          uplineLevel = upline.level;
        }

        let uplineProductRate = productRates?.[String(uplineLevel)] / 100;

        if (!uplineProductRate) {
          const id = `${policy.carrier}-${policyType}`;

          const docRef = db.collection('missingRates').doc(id);
          const docSnap = await docRef.get();

          if (!docSnap.exists) {
            await docRef.set({
              carrier: policy.carrier,
              policyType: policyType,
              type: 'split',
              agent2Level: uplineLevel,
              createdAt: Timestamp.now(),
            });
          }

          uplineProductRate = 1;
        }

        if (!upline) {
          console.error('No upline found for agent 2', agent2.name);
          continue;
        }

        if (upline && uplineProductRate) {
          console.log(
            `Found upline for agent 2: ${upline?.name} level: ${uplineLevel}`,
          );
          const uplineCommission = Math.round(
            splitPremium * (uplineProductRate - agent2ProductRate),
          );
          commissions[upline.name] =
            (commissions[upline.name] || 0) + uplineCommission;

          console.log('Commission upline:', uplineCommission);

          if (upline.uplineUid) {
            const secondUpline = agents.find((a) => a.uid === upline.uplineUid);
            let secondUplineLevel = await getLevel(secondUpline, policy);
            if (!secondUplineLevel) {
              secondUplineLevel = secondUpline.level;
            }

            let secondUplineProductRate =
              productRates?.[String(secondUplineLevel)] / 100;

            if (!secondUpline) {
              console.error('No second upline found for agent', upline.name);
              continue;
            }

            if (!secondUplineProductRate) {
              const id = `${policy.carrier}-${policyType}`;

              const docRef = db.collection('missingRates').doc(id);
              const docSnap = await docRef.get();

              if (!docSnap.exists) {
                await docRef.set({
                  carrier: policy.carrier,
                  policyType: policyType,
                  type: 'split',
                  agent2Level: secondUplineLevel,
                  createdAt: Timestamp.now(),
                });
              }
              secondUplineProductRate = 1;
            }

            if (secondUpline) {
              console.log(
                `Found upline for upline of agent 2: ${secondUpline?.name} level: ${secondUplineLevel}`,
              );
              const secondUplineCommission = Math.round(
                splitPremium * (secondUplineProductRate - uplineProductRate),
              );
              commissions[secondUpline.name] =
                (commissions[secondUpline.name] || 0) + secondUplineCommission;

              console.log('Commission 2nd upline:', secondUplineCommission);
            }
          }
        }
      }

      console.log(
        'policy processed:',
        policy.policyNumber,
        agent1.name,
        agent2.name,
      );
    } else {
      console.log('Single agent policy detected');
      const agent = agents.find((a) => a.uid === policy.agentIds[0]);
      let agentLevel = await getLevel(agent, policy);
      console.log('Agent level:', agentLevel, 'for agent:', agent.name);
      if (!agentLevel) {
        agentLevel = agent.level;
      }

      const carrierRates = PRODUCT_RATES[policyCarrier?.trim()];
      const productRates = carrierRates?.[policyType?.trim()];
      const productRateValue = productRates?.[String(agentLevel)];
      let agentProductRate = productRateValue / 100;

      if (!agentProductRate) {
        const id = `${policy.carrier}-${policyType}`;

        const docRef = db.collection('missingRates').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
          await docRef.set({
            carrier: policy.carrier,
            policyType: policyType,
            type: 'single',
            agentLevel,
            createdAt: Timestamp.now(),
          });
        }

        console.error('Single policy calculation failed', {
          policyCarrier,
          policyType,
          agentLevel,
        });
        agentProductRate = 1;
      }

      const sellerCommission = Math.round(annualPremium * agentProductRate);
      commissions[agent.name] =
        (commissions[agent.name] || 0) + sellerCommission;

      console.log(
        `Agent commission: ${agent?.name} ${sellerCommission} product rate: ${agentProductRate}`,
      );

      if (agent.uplineUid) {
        const upline = agents.find((a) => a.uid === agent.uplineUid);
        let uplineLevel = await getLevel(upline, policy);
        if (!uplineLevel) {
          uplineLevel = upline.level;
        }
        let uplineProductRate = productRates?.[String(uplineLevel)] / 100;

        if (!upline) {
          console.error('No upline found for agent', agent.name);
          continue;
        }

        if (!uplineProductRate) {
          const id = `${policy.carrier}-${policyType}`;

          const docRef = db.collection('missingRates').doc(id);
          const docSnap = await docRef.get();

          if (!docSnap.exists) {
            await docRef.set({
              carrier: policy.carrier,
              policyType: policyType,
              type: 'single',
              agentLevel: uplineLevel,
              createdAt: Timestamp.now(),
            });
          }
          uplineProductRate = 1;
        }

        if (upline && uplineProductRate) {
          console.log(
            `Found upline for agent: ${upline?.name} product rate: ${uplineProductRate}`,
          );
          const uplineCommission = Math.round(
            annualPremium * (uplineProductRate - agentProductRate),
          );
          commissions[upline.name] =
            (commissions[upline.name] || 0) + uplineCommission;

          console.log('Commission upline:', uplineCommission);

          if (upline.uplineUid) {
            const secondUpline = agents.find((a) => a.uid === upline.uplineUid);
            let secondUplineLevel = await getLevel(secondUpline, policy);

            if (!secondUplineLevel) {
              secondUplineLevel = secondUpline.level;
            }
            let secondUplineProductRate =
              productRates?.[String(secondUplineLevel)] / 100;

            if (!secondUpline) {
              console.error('No second upline found for agent', upline.name);
              continue;
            }

            if (!secondUplineProductRate) {
              const id = `${policy.carrier}-${policyType}`;

              const docRef = db.collection('missingRates').doc(id);
              const docSnap = await docRef.get();

              if (!docSnap.exists) {
                await docRef.set({
                  carrier: policy.carrier,
                  policyType: policyType,
                  type: 'single',
                  agentLevel: secondUplineLevel,
                  createdAt: Timestamp.now(),
                });
              }

              secondUplineProductRate = 1;
            }

            if (secondUpline) {
              console.log(
                `Found 2nd upline for agent: ${secondUpline?.name} product rate: ${secondUplineProductRate}`,
              );
              const secondUplineCommission = Math.round(
                annualPremium * (secondUplineProductRate - uplineProductRate),
              );
              commissions[secondUpline.name] =
                (commissions[secondUpline.name] || 0) + secondUplineCommission;

              console.log('Commission 2nd upline:', secondUplineCommission);
            }
          }
        }
      }
      console.log('policy processed:', policy.policyNumber, agent.name);
    }
  }

  const sortedCommissions = Object.fromEntries(
    Object.entries(commissions).sort(([, a], [, b]) => b - a),
  );
  res.status(200).send(sortedCommissions);
});

// meta
app.get('/ad-spend', async (req, res) => {
  const { startDate, endDate, mode } = req.query;
  if (mode === 'development') {
    console.log('Development mode: returning sample data');
    return res.status(200).send({ total: Math.round(1234.56) });
  }

  if (!startDate || !endDate) {
    console.error('Missing startDate or endDate');
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  const since = dayjs(startDate).format('YYYY-MM-DD');
  const until = dayjs(endDate).format('YYYY-MM-DD');

  console.log('Ad spend from', startDate, 'to', endDate);

  try {
    const response = await axios.request({
      method: 'GET',
      url: process.env.META_MARKETING_INSIGHTS_URL,
      params: {
        fields: 'spend',
        time_range: JSON.stringify({ since, until }),
        access_token: process.env.META_MARKETING_ACCESS_TOKEN,
      },
    });

    // Extract spend (if multiple rows, sum them)
    console.log('Meta response data:', response.data);
    const spend = Number(response.data['data'][0].spend);

    const totalSpend = spend || 0;

    console.log(
      `Total spend from ${startDate} to ${endDate}: $${totalSpend.toFixed(2)}`,
    );
    res.status(200).send({ total: Math.round(Number(totalSpend)) });
  } catch (error) {
    console.error(
      'Error fetching spend:',
      error.response?.data || error.message,
    );
    res.status(500).send({ error: 'Failed to fetch spend data' });
  }
});

// stripe
app.get('/stripe-charges', async (req, res) => {
  const { startDate, endDate, mode } = req.query;

  if (mode === 'development') {
    console.log('Development mode: returning sample data');
    return res.status(200).send({ total: Math.round(12345.67) });
  }

  if (!startDate || !endDate) {
    console.error('Missing startDate or endDate');
    return res.status(400).send({ error: 'Missing startDate or endDate' });
  }

  const startTimestamp = dayjs(startDate).startOf('day').unix();
  const endTimestamp = dayjs(endDate).endOf('day').unix();

  console.log('Reconciliation from', startDate, 'to', endDate);

  try {
    let totalRevenue = 0;
    let hasMore = true;
    let startingAfter = null;

    while (hasMore) {
      const response = await axios.get('https://api.stripe.com/v1/charges', {
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        params: {
          limit: 100,
          created: {
            gte: startTimestamp,
            lte: endTimestamp,
          },
          ...(startingAfter && { starting_after: startingAfter }),
        },
      });

      const charges = response.data.data;
      const DO_NOT_INCLUDE = ['sheamoralesffl@gmail.com'];
      charges.forEach((charge) => {
        if (
          charge.paid &&
          !charge.refunded &&
          !DO_NOT_INCLUDE.includes(charge.billing_details.email)
        ) {
          totalRevenue += charge.amount; // Amount is in cents
        }
      });

      hasMore = response.data.has_more;
      if (hasMore) {
        startingAfter = charges[charges.length - 1].id;
      }
    }

    console.log(
      `Total revenue from ${startDate} to ${endDate}: $${(
        totalRevenue / 100
      ).toLocaleString()}`,
    );

    const total = totalRevenue / 100; // Return in dollars
    res.status(200).send({ total });
  } catch (error) {
    console.error(
      'Error fetching Stripe revenue:',
      error.response?.data || error.message,
    );
    res.status(500).send({ error: 'Failed to fetch revenue data' });
  }
});

// webhook to receive leads from GetSeniorQuotes.com
app.post('/gsq-lead', async (req, res) => {
  const auth = req.headers['authorization']?.split(' ')[1];

  if (auth !== process.env.GSQ_TOKEN) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    dob,
    leadSource,
    issuedTo,
    state,
    sold,
  } = req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !dob ||
    !leadSource ||
    !issuedTo ||
    !state ||
    sold === undefined
  ) {
    return res.status(400).send({ message: 'Missing required fields' });
  }

  const getHyrosSource = async (email) => {
    const HYROS_BODY = {
      method: 'GET',
      url: 'https://api.hyros.com/v1/api/v1.0/leads',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': process.env.HYROS_SECRET_KEY,
      },
      params: {
        emails: email,
      },
    };

    try {
      const response = await axios.request(HYROS_BODY);
      const hyrosData = response.data.result[0] || [];

      let source = hyrosData?.lastSource?.sourceLinkAd?.name || null;

      if (!source) {
        source = hyrosData?.firstSource?.sourceLinkAd?.name || null;

        if (!source) {
          source =
            hyrosData.lastSource?.name ||
            hyrosData.firstSource?.name ||
            'unknown';
        }
      }

      return source;
    } catch (error) {
      console.error('Error fetching Hyros data:', error);
    }
  };

  try {
    const db = new Firestore();
    const leadsRef = db.collection('leads');

    const leadPhoneSnap = await db
      .collection('leads')
      .where('phone', '==', phone)
      .get();

    if (!leadPhoneSnap.empty) {
      await leadPhoneSnap.docs[0].ref.update({ issuedTo });
      return res
        .status(409)
        .send({ message: 'Lead with this phone number already exists' });
    }

    const leadEmailSnap = await db
      .collection('leads')
      .where('email', '==', email)
      .get();

    if (!leadEmailSnap.empty) {
      await leadEmailSnap.docs[0].ref.update({ issuedTo });
      return res
        .status(409)
        .send({ message: 'Lead with this email already exists' });
    }

    const hyrosSource = await getHyrosSource(email);

    await leadsRef.add({
      firstName,
      lastName,
      email,
      phone,
      dob,
      issuedTo,
      leadSource,
      source: hyrosSource,
      sold,
      createdAt: Timestamp.now(),
    });

    res.status(201).send({ message: 'Lead saved successfully' });
  } catch (error) {
    console.error('Error saving lead:', error);
    res.status(500).send({ message: 'Failed to save lead' });
  }
});

// const sendPasswordResetEmail = async (email) => {
//   const { error } = await supabaseService.auth.resetPasswordForEmail(email, {
//     redirectTo: 'https://crm-dev-dde35.web.app/reset-password',
//   });
//   if (error) {
//     console.error('Error sending password reset email:', error);
//   }
// };

// sendPasswordResetEmail('wilsonknjoroge98@gmail.com');

// seed-leads-supabase.js
//
// Usage:
//   SUPABASE_URL="https://xyzcompany.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
//   AGENT_ID="your-agent-uuid" \
//   LEAD_VENDOR_ID="your-lead-vendor-uuid" \
//   COUNT=100 \
//   node seed-leads-supabase.js
//
// Optional env vars:
//   BATCH_SIZE=500
//   DEFAULT_STATE=FL
//   GSQ_SOURCE=seed-script

// main().catch((err) => {
//   console.error('Fatal error:', err);
//   process.exit(1);
// });

// app.get('/insights', async (req, res) => {
//   const { mode } = req.query;

//   if (mode === 'development') {
//     return res.status(200).json({
//       sources: [
//         { name: 'WK | Annie Winner | 5/11/25', sales: 20, spend: 2000 },
//         { name: 'TJ | Alana Book | 8/1/25', sales: 20, spend: 2000 },
//         { name: 'WK | E Philip 4 | 9/4/25', sales: 20, spend: 2000 },
//         { name: 'TJ | Alana Mug 7/13/25', sales: 10, spend: 1000 },
//         { name: 'WK | E Philip 2 | 9/4/25', sales: 10, spend: 1000 },
//         { name: 'WK | Annie Scam Hook 2 | 9/7/25', sales: 10, spend: 1000 },
//       ],
//       total: 100,
//       unknownClients: 5,
//     });
//   }
//   const db = new Firestore();
//   const ref = db.collection('clients');

//   const snapshot = await ref.get();
//   const clients = snapshot.docs.map((doc) => ({
//     id: doc.id,
//     ...doc.data(),
//   }));

//   const maps = clients.reduce(
//     (acc, c) => {
//       const key = (c.source || 'unknown').trim();
//       acc.all[key] = (acc.all[key] || 0) + 1;
//       if (key !== 'unknown') acc.known[key] = (acc.known[key] || 0) + 1;
//       return acc;
//     },
//     { all: {}, known: {} },
//   );

//   const response = await axios.request({
//     method: 'GET',
//     url: process.env.META_MARKETING_URL,
//     params: {
//       fields: 'spend',
//       time_range: JSON.stringify({ since, until }),
//       access_token: process.env.META_MARKETING_ACCESS_TOKEN,
//     },
//   });

//   const total = Object.values(maps.known).reduce((s, n) => s + n, 0) || 1;
//   const unknownClients = maps.all['unknown'] || 0;

//   const sources = Object.entries(maps.known)
//     .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
//     .sort((a, b) => b.count - a.count);

//   res.status(200).send({ sources, total, unknownClients });
// });

app.post('/expense', async (req, res) => {
  console.log('Creating expense');
  const db = new Firestore();
  const { name, amount, date } = req.body;

  if (!name || !amount || !date) {
    return res.status(400).json({ error: 'Missing name, amount, or date' });
  }

  try {
    const expenseRef = await db.collection('expenses').add({
      name,
      amount: Math.round(Number(amount)),
      date,
      createdAt: Timestamp.now(),
    });
    res.status(201).json({
      id: expenseRef.id,
      name,
      amount: Math.round(Number(amount)),
      date,
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});
app.post('/error', async (req, res) => {
  const { message, stack, route, uid } = req.body;

  if (!message || !stack || !route || !uid) {
    res.status(400).send({ message: 'Invalid request' });
    return;
  }

  const firestore = new Firestore();
  const errorRef = firestore.collection('errors').doc(uid);

  const errorSnapshot = await errorRef.get();

  if (errorSnapshot.exists) {
    console.log('Error already exists:', uid);
    res.status(200).send({ message: 'Error already logged' });
    return;
  }

  const doc = {
    message,
    stack,
    route,
    uid,
    createdAt: Timestamp.now(),
  };

  if (errorSnapshot.exists) {
    await errorRef.update(doc);
  } else {
    await errorRef.set(doc);
  }

  res.status(200).send({ message: 'Error saved successfully' });
});

app.patch('/customer-account', async (req, res) => {
  const { account } = req.body;

  console.log('Updating account for', account);

  if (account.deliver === true) {
    try {
      const gsqRes = await axios.request({
        headers: { Authorization: `Bearer ${process.env.GSQ_TOKEN}` },
        params: { email: account.email },
        method: 'GET',
        url: `${process.env.GSQ_BASE_URL}/customer-account`,
      });
      const current = gsqRes.data;
      const eligible =
        current.ringyEnabled === false ||
        (current.ringySid && current.ringyToken);
      if (!eligible) {
        return res.status(400).json({
          message: 'Ringy credentials are required to enable lead delivery.',
        });
      }
    } catch (error) {
      console.error('Error fetching agent for deliver gate:', error.message);
      return res
        .status(500)
        .json({ message: 'Failed to verify agent credentials.' });
    }
  }

  const patchAgentAccount = async () => {
    try {
      const response = await axios.request({
        headers: {
          Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
        },
        data: {
          email: account.email,
          deliver: account.deliver,
          states: account.states,
        },
        method: 'PATCH',
        url: `${process.env.GSQ_BASE_URL}/customer-account`,
      });

      console.log('Account Fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching leads:', error.message);
      throw error;
    }
  };

  await patchAgentAccount();
  console.log('Account details', account);
  res.status(200).json({ message: 'Account updated' });
});

// const sendPasswordResetEmails = async () => {
//   const { data: agents, error } = await supabaseService
//     .from('agents')
//     .select('email');

//   const successfulEmails = [
//     'a2hogan@comcast.net',
//     'acipetric@gmail.com',
//     'adamlonginsurance@gmail.com',
//     'adampasqualefinancial@gmail.com',
//     'alexcrawfordpersonal@gmail.com',
//     'diegomendozafinancial@gmail.com',
//     'dylanramirezinsurance24@gmail.com',
//     'elibrandowfinancial@gmail.com',
//     'eric.strasser7@gmail.com',
//     'ethan.lopez@icloud.com',
//     'ethanbouche12@gmail.com',
//     'ethanlax77@gmail.com',
//     'ethomas.insurance@gmail.com',
//     'eva.ikonomakos@gmail.com',
//     'famoralesffl@gmail.com',
//     'garlandrayfielle@yahoo.com',
//     'garrettplekenpol4life@gmail.com',
//     'garriemannfinancial@gmail.com',
//     'gavinjohnstonfinancial@gmail.com',
//     'hayklein3@gmail.com',
//     'howardinsurance15@gmail.com',
//     'hugojeanbaptiste0@gmail.com',
//     'indestadjacob@gmail.com',
//     'info@finalexpensedigital.com',
//     'hertzoginsurance@gmail.com',
//     'marcusstepinsurance@gmail.com',
//     'reeselefinancial@gmail.com',
//     'wilhelmnoah@protonmail.com',
//     'alvinsellsins@gmail.com',
//     'andrewmerlamfinancial@gmail.com',
//     'andrewnixoninsurance@gmail.com',
//     'angelblib248@gmail.com',
//     'anthonyrichinsurance@gmail.com',
//     'austinmckoy2@gmail.com',
//     'baron4life2@gmail.com',
//     'bassettdeven@gmail.com',
//     'benmjacob@icloud.com',
//     'benmoreirafinancial@gmail.com',
//     'bert.ramos1997@gmail.com',
//     'ashleymysza@gmail.com',
//     'blackevan15@gmail.com',
//     'brayden.ricks.insurance@gmail.com',
//     'braymoffl@gmail.com',
//     'brianfurrerffl@gmail.com',
//     'bryanvaval09@gmail.com',
//     'callie.carr.98@gmail.com',
//     'calliecarrinsurance@gmail.com',
//     'cameron_05@icloud.com',
//     'caulinbrownfinancial@gmail.com',
//     'charlielacnyfinancial@gmail.com',
//     'chuy.n.rosales@gmail.com',
//     'cnmckenna@yahoo.com',
//     'connortietema@gmail.com',
//     'csullyyackel@gmail.com',
//     'daleherrodlife@gmail.com',
//     'davidjacobfinancial@gmail.com',
//     'deaganreppfinancial@gmail.com',
//     'diegomendozafinancial@gmail.com',
//     'dylanramirezinsurance24@gmail.com',
//     'elibrandowfinancial@gmail.com',
//     'eric.strasser7@gmail.com',
//     'ethan.lopez@icloud.com',
//     'ethanbouche12@gmail.com',
//     'ethanlax77@gmail.com',
//     'ethomas.insurance@gmail.com',
//     'eva.ikonomakos@gmail.com',
//     'famoralesffl@gmail.com',
//     'garlandrayfielle@yahoo.com',
//     'garrettplekenpol4life@gmail.com',
//     'garriemannfinancial@gmail.com',
//     'gavinjohnstonfinancial@gmail.com',
//     'hayklein3@gmail.com',
//     'howardinsurance15@gmail.com',
//     'hugojeanbaptiste0@gmail.com',
//     'indestadjacob@gmail.com',
//     'info@finalexpensedigital.com',
//     'haldiman.insurance@gmail.com',
//     'ddean3459@icloud.com',
//     'jakewoodrufffinancial@gmail.com',
//     'josiahfaucher@gmail.com',
//     'karsonyouchfinancial@gmail.com',
//     'kristi@kblifeandco.com',
//     'javierjurado768@gmail.com',
//     'keaton.artherton.insurance@gmail.com',
//     'kyle.vassau.insurance@gmail.com',
//     'jstrout14@yahoo.com',
//     'jaxonlogginsfinancial@gmail.com',
//     'julian.roberta.rodriguez@gmail.com',
//     'kendrammejia@gmail.com',
//     'kylecassidy4life@gmail.com',
//     'makennapenceffl@gmail.com',
//     'jaxson.vassau.insurance@gmail.com',
//     'julianharrisfinancial@gmail.com',
//     'kevinestradafinancial@gmail.com',
//     'litryborovikov@gmail.com',
//     'makkpence@gmail.com',
//     'joshdeberry3@gmail.com',
//     'karatripoli@gmail.com',
//     'kiara7lin@gmail.com',
//     'marcorico5656@gmail.com',
//     'marcuststep@gmail.com',
//     'markwallace.insurance@gmail.com',
//     'maxbillesdon2003@gmail.com',
//     'mcshaneffl@gmail.com',
//     'mellojacksonfinancial@gmail.com',
//     'meshach.nelson.insurance@gmail.com',
//     'mitchellsmithfinancial@gmail.com',
//     'morganjaylen6@gmail.com',
//     'oliviacox.business1@gmail.com',
//     'owenmclaughlinfinancial@gmail.com',
//     'ozziegonzalez777@gmail.com',
//     'rachelmoore2007@outlook.com',
//     'rayshawnnicholasfinancial@gmail.com',
//     'rightforlifewithantonio@gmail.com',
//     'sam.harline.insurance@gmail.com',
//     'samanthaplife@gmail.com',
//     'simonwilkinsonlife@gmail.com',
//     'sjbrownn15@gmail.com',
//     'stamisonbrody@gmail.com',
//     'stupps33@gmail.com',
//     'tanner.mccoy303@gmail.com',
//     'timcassidylifeinsurance@gmail.com',
//     'tklipschfinancial@gmail.com',
//     'wes.creer.insurance@gmail.com',
//     'williams.blaize9@gmail.com',
//     'westonwendt@gmail.com',
//     'garrett.lifeinsurance@gmail.com',
//   ];

//   for (const agent of agents.filter(
//     (a) => !successfulEmails.includes(a.email),
//   )) {
//     try {
//       const { error: resetError } =
//         await supabaseService.auth.resetPasswordForEmail(agent.email, {
//           redirectTo: 'https://hourglass-ef3ca.web.app/reset-password',
//         });

//       if (resetError) {
//         console.error(`Error sending to ${agent.email}:`, resetError);
//       } else {
//         console.log(`Sent to ${agent.email}`);
//       }
//     } catch (err) {
//       console.error(`Unexpected error for ${agent.email}:`, err);
//     }

//     await new Promise((resolve) => setTimeout(resolve, 3000));
//   }

//   console.log(`Done. Processed ${agents.length} agents.`);
// };

// sendPasswordResetEmails();

module.exports = app;
