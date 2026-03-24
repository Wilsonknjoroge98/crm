const cors = require('cors');
const express = require('express');
const axios = require('axios');
const app = express();
const dayjs = require('dayjs');
const crypto = require('crypto');
const logger = require('firebase-functions/logger');
// eslint-disable-next-line no-unused-vars
const { WebClient } = require('@slack/web-api');
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
  publicRouter,
  inviteRouter,
  leadVendorsRouter,
  carriersRouter,
} = require('./endpoints');

admin.initializeApp();
app.use(
  cors({
    origin: [
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

app.get('/customer_account', async (req, res) => {
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

app.get('/expenses', async (req, res) => {
  const db = new Firestore();
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  try {
    const snapshot = await db
      .collection('expenses')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'desc')
      .get();

    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
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
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    console.error('Missing startDate or endDate');
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

  const startTimestamp = dayjs(startDate, 'YYYY-MM-DD').startOf('day');
  const endTimestamp = dayjs(endDate, 'YYYY-MM-DD').endOf('day');

  // if (mode === 'development') {
  //   console.log('Development mode: returning sample data');

  //   const sampleCommissions = {
  //     'Shea Morales': 12000,
  //     'Bob Brown': 2000,
  //     'John Doe': 8000,
  //     'Jane Smith': 6000,
  //     'Alice Johnson': 4000,
  //   };

  //   const sortedCommissions = Object.fromEntries(
  //     Object.entries(sampleCommissions).sort(([, a], [, b]) => b - a),
  //   );
  //   return res.status(200).send(sortedCommissions);
  // }

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

app.patch('/customer_account', async (req, res) => {
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

app.patch('/client', async (req, res) => {
  console.log('Updating client');
  // temp delete
  delete client.leadSource;
  delete client.notes;

  const { clientId, client } = req.body;
  delete client.source;
  delete client.policyIds;
  if (!clientId || !client) {
    return res.status(400).json({ error: 'Missing client ID or data' });
  }

  try {
    const { error } = await req.supabase
      .from('clients')
      .update([client])
      .eq('id', clientId);
    res.status(200).json({ id: clientId, ...client });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.patch('/policy', async (req, res) => {
  const { policyId, policy } = req.body;
  const { error: policyError } = await req.supabase
    .from('policies')
    .update([policy])
    .eq('id', policyId);
  if (policyError) {
    console.error('Error updating policy:', policyError);
    res.status(500).json({ error: 'Failed to update policy' });
  }
  res.status(200).json({ id: policyId, ...policy });
});

app.delete('/client', async (req, res) => {
  const { clientId } = req.query;
  if (!clientId) {
    return res.status(400).json({ error: 'Missing client ID' });
  }
  const { error } = req.supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .single();

  if (error) {
    console.error('Error deleting client:', error);
    return res.status(500).json({ error: 'Failed to delete client' });
  }
  res.status(200).json({ message: 'Client and associated policies deleted' });
});

app.delete('/policy', async (req, res) => {
  console.log('Deleting policy');
  const db = new Firestore();
  const { policyId } = req.body;

  if (!policyId) {
    return res.status(400).json({ error: 'Missing policy ID' });
  }

  try {
    const clientSnapshot = await db
      .collection('clients')
      .where('policyIds', 'array-contains', policyId)
      .get();

    if (clientSnapshot.empty) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Remove policy from client
    const clientDoc = clientSnapshot.docs[0];
    const policyData = clientDoc
      .data()
      .policyData.filter((policy) => policy.id !== policyId);

    const policyIds = clientDoc
      .data()
      .policyIds.filter((id) => id !== policyId);

    await db.collection('clients').doc(clientDoc.id).update({
      policyData: policyData,
      policyIds: policyIds,
    });

    await db.collection('policies').doc(policyId).delete();
    res.status(200).json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

app.delete('/expense', async (req, res) => {
  console.log('Deleting expense');
  const db = new Firestore();
  const { expenseId } = req.body;

  if (!expenseId) {
    return res.status(400).json({ error: 'Missing expense ID' });
  }

  try {
    await db.collection('expenses').doc(expenseId).delete();
    res.status(200).json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// const policyTypes = {
//   'Mutual of Omaha': [
//     'Accidental Death',
//     `Children's Whole Life`,
//     'Final Expense',
//     'IUL',
//   ],
//   'Foresters': ['Planright FEX', 'Strong Foundation', 'Smart UL'],
//   'Ameritas': ['CLEAR EDGE TERM', 'IUL'],
// };
// const leadSources = [
//   'GetSeniorQuotes.com',
//   'Facebook Ads',
//   'Referral',
//   'Direct Mail',
// ];
// const policyStatuses = [
//   'Active',
//   'Pending',
//   'Lapsed',
//   'Cancelled',
//   'Insufficient Funds',
// ];
// const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];
// const adSources = [
//   'annie_5_11_25',
//   'alana_winner_mug_7_13_25',
//   'alana_fridge_book_rent_7_27_25',
//   'alana_winner_book_8_1_25',
//   'states_annie_8_11_25',
//   'states_alana_mug_8_11_25',
//   'unknown',
// ];

// function randDate(start, end) {
//   const d = new Date(
//     start.getTime() + Math.random() * (end.getTime() - start.getTime()),
//   );
//   return d.toISOString().slice(0, 10); // YYYY-MM-DD
// }

// function randomPhone() {
//   return faker.string.numeric(10);
// }

// function pick(arr) {
//   return arr[Math.floor(Math.random() * arr.length)];
// }

// function chunk(arr, size) {
//   const out = [];
//   for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
//   return out;
// }

// async function getAgents() {
//   const firestore = new Firestore();
//   const snap = await firestore
//     .collection('agents')
//     .where('role', 'in', ['agent', 'admin'])
//     .get();
//   return snap.docs.map((d) => ({
//     uid: d.get('uid') ?? d.id,
//     name: d.get('name') ?? 'Agent',
//     email: d.get('email') ?? '',
//     compRate: d.get('level') ?? 105,
//     role: d.get('role') ?? 'agent',
//   }));
// }

// function buildClient(seedRunId, agentPool) {
//   const firstName = faker.person.firstName();
//   const lastName = faker.person.lastName();
//   const agentIds = faker.helpers.arrayElements(
//     agentPool.map((a) => a.uid),
//     faker.number.int({ min: 1, max: Math.min(2, agentPool.length) }),
//   );
//   return {
//     firstName,
//     lastName,
//     email: faker.internet.email({ firstName, lastName }).toLowerCase(),
//     phone: randomPhone(),
//     address: faker.location.streetAddress(),
//     city: faker.location.city(),
//     state: faker.location.state(),
//     zip: faker.location.zipCode(),
//     dob: randDate(new Date(1930, 0, 1), new Date(1975, 11, 31)),
//     income: faker.number.int({ min: 15000, max: 120000 }).toString(),
//     maritalStatus: pick(maritalStatuses),
//     occupation: faker.person.jobTitle(),
//     notes: faker.lorem.sentence(),
//     source: pick(adSources),
//     agentIds,
//     policyIds: [],
//     policyData: [],
//     createdAt: Timestamp.now(),
//     seedRunId,
//   };
// }

// function buildPolicy(seedRunId, clientId, clientName, agents, clientAgentIds) {
//   const agentIds = faker.helpers.arrayElements(
//     clientAgentIds.length ? clientAgentIds : agents.map((a) => a.uid),
//     faker.number.int({
//       min: 1,
//       max: Math.min(2, Math.max(1, clientAgentIds.length)),
//     }),
//   );

//   const carrier = pick(Object.keys(policyTypes));
//   const policyNumber = faker.string.alphanumeric({
//     length: 12,
//     casing: 'upper',
//   });
//   const policyType = pick(policyTypes[carrier]);
//   const premiumAmount = faker.finance.amount({ min: 35, max: 250, dec: 2 });
//   const coverageAmount = faker.number.int({ min: 5000, max: 30000 }).toString();
//   const level = 0.8;
//   const policyStatus = pick(policyStatuses);

//   const sold = new Date();
//   sold.setDate(sold.getDate() - faker.number.int({ min: 0, max: 120 }));
//   const effective = new Date(sold);
//   effective.setDate(sold.getDate() + faker.number.int({ min: 0, max: 14 }));

//   console.log(agentIds);

//   const splitPolicy = agentIds.length === 2 && Math.random() < 0.3;
//   const splitPolicyAgent = splitPolicy ? agentIds[1] : '';
//   const splitPolicyShare = splitPolicy
//     ? ['25', '50'][faker.number.int({ min: 0, max: 1 })]
//     : '';

//   return {
//     clientId,
//     clientName,
//     agentIds,
//     carrier,
//     policyNumber,
//     policyType,
//     premiumAmount, // string
//     premiumFrequency: 'Monthly',
//     coverageAmount, // string
//     level, // number
//     policyStatus,
//     effectiveDate: effective.toISOString().slice(0, 10),
//     dateSold: sold.toISOString().slice(0, 10),
//     draftDay: faker.number.int({ min: 1, max: 28 }).toString(),
//     leadSource: pick(leadSources),
//     source: pick(adSources),
//     notes: '',
//     beneficiaries: [
//       {
//         firstName: faker.person.firstName(),
//         lastName: faker.person.lastName(),
//         relationship: pick(['Spouse', 'Child', 'Sibling', 'Parent']),
//         share: '100',
//       },
//     ],
//     contingentBeneficiaries: [],
//     splitPolicy,
//     splitPolicyAgent,
//     splitPolicyShare, // string like "25" or "50"
//     createdAt: Timestamp.now(),
//     seedRunId,
//   };
// }

// function buildLead(seedRunId, agentEmails) {
//   return {
//     firstName: faker.person.firstName(),
//     lastName: faker.person.lastName(),
//     email: faker.internet.email().toLowerCase(),
//     phone: randomPhone(),
//     dob: randDate(new Date(1930, 0, 1), new Date(1975, 11, 31)),
//     issuedTo: pick(agentEmails),
//     leadSource: pick(leadSources),
//     source: pick(adSources),
//     sold: pick([true, false]),
//     createdAt: Timestamp.now(),
//     seedRunId,
//   };
// }

// async function seedOnce({
//   clients,
//   minPoliciesPerClient,
//   maxPoliciesPerClient,
//   seedRunId,
// }) {
//   if (!isEmulator) {
//     return;
//     // throw new functions.https.HttpsError(
//     //   'failed-precondition',
//     //   'Seeding is blocked outside of the emulator. Start emulators and try again.',
//     // );
//   }

//   const db = new Firestore();
//   const agents = await getAgents();
//   if (agents.length < 2) {
//     console.error('Need at least two agents for seeding.');
//     // throw new functions.https.HttpsError(
//     //   'failed-precondition',
//     //   "Need at least two agents in 'agents' collection (created via Auth callback) before seeding.",
//     // );
//   }

//   for (let i = 0; i < 50; i++) {
//     const agentsSnapshot = await db.collection('agents').get();
//     const emails = agentsSnapshot.docs.map((d) => d.data().email);
//     const leadRef = db.collection('leads').doc();
//     const lead = buildLead(seedRunId, emails);
//     await leadRef.set(lead);
//   }

//   const clientDocs = [];
//   const policyDocs = [];

//   for (let i = 0; i < clients; i++) {
//     const clientRef = db.collection('clients').doc();
//     const c = buildClient(seedRunId, agents);
//     clientDocs.push({ ref: clientRef, data: c });

//     const policyCount = faker.number.int({
//       min: minPoliciesPerClient,
//       max: maxPoliciesPerClient,
//     });
//     for (let k = 0; k < policyCount; k++) {
//       const pRef = db.collection('policies').doc();
//       const p = buildPolicy(
//         seedRunId,
//         clientRef.id,
//         `${c.firstName} ${c.lastName}`,
//         agents,
//         c.agentIds,
//       );
//       p.id = pRef.id;

//       c.policyIds.push(pRef.id);
//       c.policyData.push({
//         id: pRef.id,
//         carrier: p.carrier,
//         policyNumber: p.policyNumber,
//       });

//       policyDocs.push({ ref: pRef, data: p });
//     }
//   }

//   const writes = [
//     ...clientDocs.map((cd) => ({ type: 'client', ...cd })),
//     ...policyDocs.map((pd) => ({ type: 'policy', ...pd })),
//   ];

//   const chunks = chunk(writes, 450);
//   for (const group of chunks) {
//     const batch = db.batch();
//     for (const w of group) {
//       batch.set(w.ref, w.data);
//     }
//     await batch.commit();
//   }

//   return {
//     seedRunId,
//     clientsCreated: clientDocs.length,
//     policiesCreated: policyDocs.length,
//   };
// }

// async function wipeSeed(seedRunId) {
//   if (!isEmulator) {
//     console.error('Wipe is blocked outside of the emulator.');
//     // throw new functions.https.HttpsError(
//     //   'failed-precondition',
//     //   'Wipe is blocked outside of the emulator.',
//     // );
//   }

// seedOnce({
//   clients: 60,
//   minPoliciesPerClient: 0,
//   maxPoliciesPerClient: 1,
//   seedRunId: 'test-seed-run',
// });

// const getLeads = async () => {
//   try {
//     const response = await axios.request({
//       headers: {
//         Authorization: `Bearer ${process.env.LEADS_BEARER_TOKEN}`,
//       },
//       method: 'GET',
//       url: `${process.env.GSQ_BASE_URL}/get-leads`,
//     });

//     console.log('Leads fetched:', response.data.length);
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching leads:', error);
//     throw error;
//   }
// };

// const updateClients = async () => {
//   const leads = await getLeads();
//   console.log(leads);
//   const db = new Firestore();
//   const clientsSnapshot = await db.collection('clients').get();

//   try {
//     const noMatchesArr = [];
//     clientsSnapshot.forEach((clientDoc) => {
//       const clientData = clientDoc.data();

//       const matchingLeadPhone = leads.find((lead) => {
//         if (lead?.phone) {
//           return lead.phone.replace('+1', '') === clientData.phone;
//         }
//         return false;
//       });

//       let matchingLeadName = undefined;

//       if (!matchingLeadPhone) {
//         matchingLeadName = leads.find((lead) => {
//           if (lead?.name) {
//             return (
//               lead.name.toLowerCase() ===
//               `${clientData.firstName} ${clientData.lastName}`.toLowerCase()
//             );
//           }
//           return false;
//         });
//       }

//       const noMatches = !matchingLeadName && !matchingLeadPhone;

//       if (noMatches) {
//         // Handle case where no matching lead is found
//         noMatchesArr.push(`${clientData.firstName} ${clientData.lastName}`);
//       }

//       const source = matchingLeadName?.ad || matchingLeadPhone?.ad || 'unknown';
//       // Update client data with matching lead information
//       db.collection('clients')
//         .doc(clientDoc.id)
//         .update({
//           source,
//           leadId: matchingLeadName?.id || matchingLeadPhone?.id || null,
//         });
//     });

//     if (noMatchesArr.length > 0) {
//       console.log('No matching leads found for clients:', noMatchesArr);
//       console.log('Total no matches:', noMatchesArr.length);
//     }
//   } catch (error) {
//     console.error('Error processing leads:', error);
//   }
// };

// updateClients();

// const updatePolicies = async () => {
//   const db = new Firestore();
//   const policiesSnapshot = await db.collection('policies').get();
//   const policies = policiesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

//   for (const policy of policies) {
//     const clientId = policy.clientId;
//     const clientRef = db.collection('clients').doc(clientId);
//     const clientDoc = await clientRef.get();

//     const clientData = clientDoc.data();
//     const source = clientData?.source || 'unknown';

//     if (policy.source !== source) {
//       console.log(`Updating policy ${policy.id} source from ${policy.source} to ${source}`);
//       await db.collection('policies').doc(policy.id).update({ source });
//     }
//   }
// };

// updatePolicies();

// ---------------------------------------------------------------------------
// Dev seed — populates the leads collection when running in the emulator
// ---------------------------------------------------------------------------
// const seedLeads = async () => {
//   if (process.env.FUNCTIONS_EMULATOR !== 'true') return;

//   const db = new Firestore();
//   const leadsRef = db.collection('leads');
//   const existing = await leadsRef.limit(1).get();
//   if (!existing.empty) {
//     console.log('[seed] Leads already seeded, skipping.');
//     return;
//   }

//   const now = Date.now();
//   const min = 60 * 1000;

//   const SEED_LEADS = [
//     {
//       firstName: 'Margaret',
//       lastName: 'Sullivan',
//       email: 'margaret.sullivan@email.com',
//       phone: '5124839201',
//       dob: '1952-07-14',
//       age: 72,
//       state: 'TX',
//       smoker: false,
//       faceAmount: '25000',
//       premium: '62',
//       selectedPlan: 'Whole Life',
//       selectedCarrier: 'Mutual of Omaha',
//       beneficiary: 'Spouse',
//       priority: 'End of life expenses',
//       why: 'Leave something behind for family',
//       bmi: '5ft 4in 148lbs',
//       cholesterol: 'No',
//       bloodPressure: 'Yes',
//       verified: true,
//       sold: false,
//       issuedTo: 'andrewblevins.ins@gmail.com',
//       leadSource: 'GetSeniorQuotes.com',
//       source: 'WK | Annie Winner | 5/11/25',
//       createdAt: Timestamp.fromMillis(now - 5 * min),
//     },
//     {
//       firstName: 'Robert',
//       lastName: 'Kimura',
//       email: 'rkimura55@gmail.com',
//       phone: '9042817364',
//       dob: '1958-03-02',
//       age: 67,
//       state: 'FL',
//       smoker: false,
//       faceAmount: '15000',
//       premium: '44',
//       selectedPlan: 'Guaranteed Issue',
//       selectedCarrier: 'AIG',
//       beneficiary: 'Child',
//       priority: 'Funeral costs',
//       why: "Don't want to be a burden",
//       bmi: '5ft 10in 195lbs',
//       cholesterol: 'Yes',
//       bloodPressure: 'Yes',
//       verified: true,
//       sold: false,
//       issuedTo: 'andrewblevins.ins@gmail.com',
//       leadSource: 'GetSeniorQuotes.com',
//       source: 'TJ | Alana Book | 8/1/25',
//       createdAt: Timestamp.fromMillis(now - 18 * min),
//     },
//     {
//       firstName: 'Dorothy',
//       lastName: 'Chambers',
//       email: 'dorothy.chambers@yahoo.com',
//       phone: '6023948571',
//       dob: '1945-11-28',
//       age: 79,
//       state: 'AZ',

//       why: 'Peace of mind',
//       bmi: '5ft 2in 162lbs',
//       cholesterol: 'No',
//       bloodPressure: 'No',
//       verified: false,
//       sold: false,
//       issuedTo: 'andrewblevins.ins@gmail.com',
//       leadSource: 'GetSeniorQuotes.com',
//       source: 'WK | E Philip 4 | 9/4/25',
//       createdAt: Timestamp.fromMillis(now - 42 * min),
//     },
//     {
//       firstName: 'James',
//       lastName: 'Pruitt',
//       email: 'jamespruitt@hotmail.com',
//       phone: '3365920847',
//       dob: '1955-08-19',

//       smoker: false,
//       faceAmount: '20000',
//       premium: '53',

//       cholesterol: 'Yes',
//       bloodPressure: 'No',
//       verified: true,
//       sold: true,
//       issuedTo: 'andrewblevins.ins@gmail.com',
//       leadSource: 'GetSeniorQuotes.com',
//       source: 'TJ | Alana Mug 7/13/25',
//       createdAt: Timestamp.fromMillis(now - 3 * 24 * 60 * min),
//     },
//     {
//       firstName: 'Linda',
//       lastName: 'Vasquez',
//       email: 'lindav1961@gmail.com',
//       phone: '7138402956',
//       age: 64,
//       state: 'TX',
//       smoker: false,
//       faceAmount: '50000',
//       premium: '110',
//       verified: true,
//       sold: false,
//       issuedTo: 'andrewblevins.ins@gmail.com',
//       createdAt: Timestamp.fromMillis(now - 2 * min),
//     },
//     {
//       firstName: 'Eugene',
//       lastName: 'Mallory',
//       email: 'eugenemallory@outlook.com',
//       phone: '5023719482',
//       dob: '1949-01-30',
//       age: 76,
//       state: 'KY',
//       smoker: true,
//       faceAmount: '10000',
//       premium: '74',
//       selectedPlan: 'Guaranteed Issue',
//       verified: false,
//       sold: false,
//       issuedTo: 'andrewblevins.ins@gmail.com',
//       leadSource: 'GetSeniorQuotes.com',
//       source: 'unknown',
//       createdAt: Timestamp.fromMillis(now - 90 * min),
//     },
//   ];

//   const batch = db.batch();
//   SEED_LEADS.forEach((lead) => batch.set(leadsRef.doc(), lead));
//   await batch.commit();
//   console.log(`[seed] Seeded ${SEED_LEADS.length} leads.`);
// };

// seedLeads().catch(console.error);

module.exports = app;
