const cors = require('cors');
const express = require('express');
const axios = require('axios');
const app = express();
const dayjs = require('dayjs');
const crypto = require('crypto');
const logger = require('firebase-functions/logger');
const { WebClient } = require('@slack/web-api');
const { PRODUCT_RATES, STATE_ABBREV_MAP } = require('./constants');

const { Firestore, Timestamp } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

app.use(express.json());

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

// app.use(authMiddleware);

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

app.get('/clients', async (req, res) => {
  const { agentId, agentRole, agency } = req.query;

  if (!agentId || !agentRole || !agency) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  console.log('Getting clients');
  const db = new Firestore();

  try {
    if (agentRole === 'agent') {
      const clientQuerySnapshot = await db
        .collection('clients')
        .where('agentIds', 'array-contains', agentId)
        .get();

      const clients = clientQuerySnapshot.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });

      const unknownClients = clients.filter(
        (c) => c.source == 'unknown',
      ).length;
      console.log({ unknownClients });
      res.status(200).json(clients || []);
    } else if (agentRole === 'owner') {
      const agentsSnap = await db.collection('agents').get();
      const agents = agentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const agencyAgentIds = agents
        .filter((a) => a.agency === agency)
        .map((a) => a.uid);

      const clientData = await db
        .collection('clients')
        .where('agentIds', 'array-contains-any', agencyAgentIds)
        .get();

      const clients = clientData.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });
      res.status(200).json(clients || []);
    } else {
      const clientData = await db.collection('clients').get();
      const clients = clientData.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });
      res.status(200).json(clients || []);
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/leads', async (req, res) => {
  const { agentId, agentRole, agency } = req.query;

  if (!agentId || !agentRole || !agency) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  const db = new Firestore();

  const agentSnapshot = await db
    .collection('agents')
    .where('uid', '==', agentId)
    .get();
  const agentData = agentSnapshot.docs.map((doc) => doc.data());
  const agentEmail = agentData[0].email;

  try {
    if (agentRole === 'agent') {
      const leadsQuerySnapshot = await db
        .collection('leads')
        .where('issuedTo', '==', agentEmail)
        .get();

      const leads = leadsQuerySnapshot.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });

      res.status(200).json(leads || []);
    } else if (agentRole === 'owner') {
      const agentsSnap = await db.collection('agents').get();
      const agents = agentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const agencyAgents = agents
        .filter((a) => a.agency === agency)
        .map((a) => a.email);

      const leadData = await db.collection('leads').get();
      const agencyLeads = leadData.docs.filter(
        (doc) => doc.data() && agencyAgents.includes(doc.data().issuedTo),
      );
      const leads = agencyLeads.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });
      res.status(200).json(leads || []);
    } else {
      const leadData = await db.collection('leads').get();
      const leads = leadData.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });
      res.status(200).json(leads || []);
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.get('/policies', async (req, res) => {
  console.log('Getting policies');
  const { agentId, agentRole, agency } = req.query;

  const db = new Firestore();

  if (!agentId || !agentRole || !agency) {
    return res.status(400).json({ error: 'Missing required query parameters' });
  }

  try {
    if (agentRole === 'agent') {
      const policyData = await db
        .collection('policies')
        .where('agentIds', 'array-contains', agentId)
        .get();
      const policies = policyData.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });

      res.json(policies || []);
    } else if (agentRole === 'owner') {
      const agentsSnap = await db.collection('agents').get();
      const agents = agentsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const agencyAgentIds = agents
        .filter((a) => a.agency === agency)
        .map((a) => a.uid);
      console.log('agencyAgentIds', agencyAgentIds);

      const policyData = await db
        .collection('policies')
        .where('agentIds', 'array-contains-any', agencyAgentIds)
        .get();

      const policies = policyData.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });
      res.json(policies || []);
    } else {
      const policyData = await db.collection('policies').get();
      const policies = policyData.docs.map((doc) => {
        const data = doc.data();
        let createdAtMs = null;

        if (data.createdAt) {
          if (typeof data.createdAt.toMillis === 'function') {
            // Firestore Timestamp
            createdAtMs = data.createdAt.toMillis();
          } else if (data.createdAt instanceof Date) {
            // Plain JS Date
            createdAtMs = data.createdAt.getTime();
          } else if (typeof data.createdAt === 'number') {
            // Already a timestamp (ms)
            createdAtMs = data.createdAt;
          } else if (typeof data.createdAt === 'string') {
            // Parseable string
            createdAtMs = Date.parse(data.createdAt);
          }
        }

        return {
          id: doc.id,
          createdAtMs,
          ...data,
        };
      });
      res.json(policies || []);
    }
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

app.get('/agent', async (req, res) => {
  console.log('Getting agent');
  const db = new Firestore();

  const { uid } = req.query;

  console.log('Fetching agent', uid);
  if (!uid) {
    return res.status(400).json({ error: 'Missing agent UID' });
  }

  try {
    const doc = await db.collection('agents').where('uid', '==', uid).get();
    if (doc.empty) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const agentData = doc.docs[0].data();

    res.json(agentData);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

app.get('/agents', async (req, res) => {
  console.log('Getting all agents');
  const db = new Firestore();

  console.log('Fetching all agents');

  try {
    const agents = await db.collection('agents').get();
    const agentData = agents.docs.map((doc) => doc.data());
    res.json(agentData);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

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
      console.error('Error fetching leads:', error.message);
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

    const topLeaderboardArray = leaderboardArray.slice(0, 10);

    logger.log('Leaderboard data:', topLeaderboardArray);

    res.status(200).json(topLeaderboardArray);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

app.get('/persistency-rates', async (req, res) => {
  console.log('Getting persistency data');
  const { agency } = req.query;

  const db = new Firestore();
  try {
    const agentsSnapshot = await db.collection('agents').get();
    const agents = agentsSnapshot.docs.map((doc) => doc.data());

    const agencyAgentIds = agents
      .filter((a) => (agency ? a.agency === agency : true))
      .map((a) => a.uid);

    const persistencyData = {};

    for (const id of agencyAgentIds) {
      if (id === 'lBGucpmk50Vkc75M4wgojbGIIic2') continue;

      const agent = agents.find((a) => a.uid === id);

      const policies = await db
        .collection('policies')
        .where('agentIds', 'array-contains', id)
        .get();

      const totalPolicies = policies.size;

      if (totalPolicies === 0) {
        continue;
      }

      const activeOrPendingPolicies = policies.docs.filter((doc) => {
        const data = doc.data();
        return (
          data.policyStatus === 'Active' || data.policyStatus === 'Pending'
        );
      }).length;

      const persistencyRate = totalPolicies
        ? (activeOrPendingPolicies / totalPolicies) * 100
        : 0;

      persistencyData[agent.name] = {
        totalPolicies,
        activeOrPendingPolicies,
        persistencyRate: Math.floor(Math.round(persistencyRate * 100) / 100),
      };
    }

    const persistencyDataArray = Object.entries(persistencyData).map(
      ([agentName, data]) => ({
        name: agentName,
        ...data,
      }),
    );

    persistencyDataArray.sort((a, b) => b.persistencyRate - a.persistencyRate);

    res.status(200).json(persistencyDataArray);
  } catch (error) {
    console.error('Error getting premiums per lead:', error);
    res.status(500).json({ error: 'Failed to get premiums per lead' });
  }
});

app.get('/close-rates', async (req, res) => {
  console.log('Getting close rates data');
  const { agency } = req.query;

  const db = new Firestore();
  try {
    const agentsSnapshot = await db.collection('agents').get();
    const agents = agentsSnapshot.docs.map((doc) => doc.data());

    const agencyAgentIds = agents
      .filter((a) => (agency ? a.agency === agency : true))
      .map((a) => a.uid);

    const closeRates = {};

    for (const id of agencyAgentIds) {
      if (id === 'lBGucpmk50Vkc75M4wgojbGIIic2') continue;
      const agent = agents.find((a) => a.uid === id);
      console.log('Agency Agent ID:', id, 'Agent Name:', agent?.name);

      const leads = await db
        .collection('leads')
        .where('issuedTo', '==', agent.email)
        .get();

      const clients = await db
        .collection('clients')
        .where('agentIds', 'array-contains', id)
        .get();

      const totalClients = clients.size;

      const totalLeads = leads.size;
      const closeRate = totalLeads ? (totalClients / totalLeads) * 100 : 0;

      if (totalLeads === 0) {
        continue;
      }

      closeRates[agent.name] = {
        leadCount: totalLeads,
        totalClients,
        closeRate: Math.floor(Math.round(closeRate * 100) / 100),
      };
    }

    const closeRatesArray = Object.entries(closeRates).map(
      ([agentName, data]) => ({
        name: agentName,
        ...data,
      }),
    );

    closeRatesArray.sort((a, b) => b.closeRate - a.closeRate);

    res.status(200).json(closeRatesArray);
  } catch (error) {
    console.error('Error getting premiums per lead:', error);
    res.status(500).json({ error: 'Failed to get premiums per lead' });
  }
});

app.get('/policies/statuses', async (req, res) => {
  console.log('Getting policy statuses');
  const { agency } = req.query;

  const db = new Firestore();

  try {
    const agentsSnapshot = await db.collection('agents').get();
    const agents = agentsSnapshot.docs.map((doc) => doc.data());

    const agencyAgentIds = agents
      .filter((a) => (agency ? a.agency === agency : true))
      .map((a) => a.uid);

    // 3. Fetch policies
    const policiesSnapshot = await db.collection('policies').get();

    const policies = policiesSnapshot.docs.map((doc) => doc.data());

    const agencyPolicies = policies.filter((policy) => {
      const policyAgentIds = policy.agentIds || [];
      return policyAgentIds.some((id) => agencyAgentIds.includes(id));
    });

    const activePolicies = agencyPolicies.filter(
      (p) => p.policyStatus === 'Active',
    ).length;
    const pendingPolicies = agencyPolicies.filter(
      (p) => p.policyStatus === 'Pending',
    ).length;
    const lapsedPolicies = agencyPolicies.filter(
      (p) =>
        p.policyStatus === 'Lapsed' ||
        p.policyStatus === 'Cancelled' ||
        p.policyStatus === 'Insufficient Funds',
    ).length;

    res.status(200).json([
      {
        label: 'Active',
        value: activePolicies,
      },
      {
        label: 'Pending',
        value: pendingPolicies,
      },
      {
        label: 'Lapsed',
        value: lapsedPolicies,
      },
    ]);
  } catch (error) {
    console.error('Error getting policy statuses:', error);
    res.status(500).json({ error: 'Failed to get policy statuses' });
  }
});

app.get('/insights', async (req, res) => {
  const { mode, startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    console.error('Missing startDate or endDate');
    return res.status(400).json({ error: 'Missing startDate or endDate' });
  }

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

  const totalSales = Object.values(maps.known).reduce((s, n) => s + n, 0) || 1;
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

  // Helper: Get spend for a single ad ID
  async function getSpendForAd(adId) {
    try {
      const insightsResp = await axios.get(
        `https://graph.facebook.com/v20.0/${adId}/insights`,
        {
          params: {
            fields: 'spend',
            time_range: JSON.stringify({ since, until }),
            access_token: accessToken,
          },
        },
      );

      const data = insightsResp.data.data;
      if (!data || data.length === 0) return 0;

      return parseFloat(data[0].spend || 0);
    } catch (error) {
      console.error(
        `Error fetching spend for ad ${adId}:`,
        error.response?.data || error,
      );
      return 0;
    }
  }

  const policiesRef = db.collection('policies');
  const policiesSnapshot = await policiesRef.get();
  const policies = policiesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const leadsSnapshot = await db.collection('leads').get();
  const leadsData = leadsSnapshot.docs.map((doc) => ({
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

    if (adId) {
      spend = await getSpendForAd(adId);
    }

    const leads = leadsData.filter((lead) => {
      return (lead.source || 'unknown').trim() === creative;
    }).length;

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

app.get('/premiums/per-lead', async (req, res) => {
  console.log('Getting premiums per lead');
  const { agency } = req.query;

  const db = new Firestore();
  try {
    // 2. Fetch agents
    const agentsSnapshot = await db.collection('agents').get();
    const agents = agentsSnapshot.docs.map((doc) => doc.data());

    const agencyAgentIds = agents
      .filter((a) => (agency ? a.agency === agency : true))
      .map((a) => a.uid);

    const perLeadData = {};

    for (const id of agencyAgentIds) {
      if (id === 'lBGucpmk50Vkc75M4wgojbGIIic2') continue;

      const agent = agents.find((a) => a.uid === id);
      console.log('Agency Agent ID:', id, 'Agent Name:', agent?.name);

      const leads = await db
        .collection('leads')
        .where('issuedTo', '==', agent.email)
        .get();

      const policies = await db
        .collection('policies')
        .where('agentIds', 'array-contains', id)
        .get();

      const gsqPolicies = policies.docs.filter((doc) => {
        const data = doc.data();
        return data.leadSource === 'GetSeniorQuotes.com';
      });

      let totalPremium = 0;
      gsqPolicies.forEach((policyDoc) => {
        const policyData = policyDoc.data();
        totalPremium += Number(policyData.premiumAmount) * 12 || 0;
      });

      const leadCount = leads.size;

      if (leadCount === 0) {
        continue;
      }

      const premiumPerLead = totalPremium / leadCount;

      perLeadData[agent.name] = {
        leadCount,
        totalPremium,
        premiumPerLead: Math.round(premiumPerLead),
      };
    }

    const perLeadDataArray = Object.entries(perLeadData).map(
      ([name, data]) => ({
        name,
        ...data,
      }),
    );

    perLeadDataArray.sort((a, b) => b.premiumPerLead - a.premiumPerLead);

    res.status(200).json(perLeadDataArray);
  } catch (error) {
    console.error('Error getting premiums per lead:', error);
    res.status(500).json({ error: 'Failed to get premiums per lead' });
  }
});

app.get('/premiums/monthly', async (req, res) => {
  console.log('Getting monthly premiums');
  const { agency } = req.query;
  const db = new Firestore();

  const getLast12Months = () => {
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = Number(
        `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`,
      );

      months.push({
        key, // "2025-03"
        label: d.toLocaleString('default', { month: 'short' }), // "Mar"
        year: d.getFullYear(),
        month: d.getMonth(), // 0-indexed
        premium: 0,
      });
    }

    return months;
  };

  try {
    // 1. Build month buckets
    const months = getLast12Months();

    const startDate = new Date(months[0].year, months[0].month, 1);
    const endDate = new Date(
      months[11].year,
      months[11].month + 1,
      0,
      23,
      59,
      59,
    );

    // 2. Fetch agents
    const agentsSnapshot = await db.collection('agents').get();
    const agents = agentsSnapshot.docs.map((doc) => doc.data());

    const agencyAgentIds = agents
      .filter((a) => (agency ? a.agency === agency : true))
      .map((a) => a.uid);

    if (!agencyAgentIds.length) {
      return res.status(200).json(months);
    }

    // 3. Fetch policies
    const policiesSnapshot = await db.collection('policies').get();

    const policies = policiesSnapshot.docs.map((doc) => doc.data());

    const agencyPolicies = policies.filter((policy) => {
      const policyAgentIds = policy.agentIds || [];
      return policyAgentIds.some((id) => agencyAgentIds.includes(id));
    });

    // 4. Bucket policies into months
    for (const policy of agencyPolicies) {
      if (!policy.effectiveDate || !policy.premiumAmount) continue;

      const effectiveDate = new Date(policy.effectiveDate);
      if (effectiveDate < startDate || effectiveDate > endDate) continue;

      const monthKey = Number(
        `${effectiveDate.getFullYear()}${String(
          effectiveDate.getMonth() + 1,
        ).padStart(2, '0')}`,
      );

      const bucket = months.find((m) => m.key === monthKey);
      if (!bucket) continue;

      const monthlyPremium = Number(policy.premiumAmount) * 12 || 0;
      bucket.premium += monthlyPremium;
    }

    // 5. Return chart-ready structure
    res.status(200).json(
      months.map((m) => ({
        month: m.key,
        premium: Math.round(m.premium),
      })),
    );
  } catch (err) {
    console.error('Monthly premium error:', err);
    res.status(500).json({ error: 'Failed to fetch monthly premiums' });
  }
});

app.post('/agent', async (req, res) => {
  console.log('Creating agent');
  const db = new Firestore();
  const { agent } = req.body;

  console.log('Creating agent:', agent);

  if (!agent || !agent.email) {
    return res.status(400).json({ error: 'Missing agent data or email' });
  }

  const emailId = agent.email.toLowerCase(); // optional: normalize

  try {
    await db.collection('agents').doc(emailId).set(agent);
    res.status(201).json({ agent: { id: emailId, role: 'agent', ...agent } });
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

app.post('/client', async (req, res) => {
  console.log('Creating client');
  const db = new Firestore();
  const { client } = req.body;
  const isGSQ = client.leadSource === 'GetSeniorQuotes.com';

  logger.log('Posting client:', client);

  if (!client) {
    return res.status(400).json({ error: 'Missing client data' });
  }

  if (isGSQ) {
    const getGSQLeads = async () => {
      try {
        const response = await axios.request({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
          },
          params: {
            phone: client.phone,
            name: `${client.firstName} ${client.lastName}`,
            email: client.email,
          },
          url: `${process.env.GSQ_BASE_URL}/find-leads`,
        });

        console.log('Leads fetched:', response.data.length);
        return response.data;
      } catch (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }
    };

    const leads = await getGSQLeads();

    for (const lead of leads) {
      if (lead?.id) {
        client.leadId = lead.id;
        break;
      }
    }

    const getHyrosSource = async () => {
      const HYROS_BODY = {
        method: 'GET',
        url: 'https://api.hyros.com/v1/api/v1.0/leads',
        headers: {
          'Content-Type': 'application/json',
          'API-Key': process.env.HYROS_SECRET_KEY,
        },
        params: {
          emails: client.email,
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

    client.source = await getHyrosSource();
  } else {
    client.source = 'non_gsq';
  }

  try {
    const docRef = await db.collection('clients').add({
      ...client,
      createdAt: Timestamp.now(),
    });
    console.log('successfully created client');
    res.status(201).json({ client: { id: docRef.id, ...client } });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.post('/policy', async (req, res) => {
  console.log('Creating policy');
  const db = new Firestore();
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

  const policySnapshot = await db
    .collection('policies')
    .where('policyNumber', '==', policyNumber)
    .get();

  if (policySnapshot.size > 0) {
    return res.status(409).json({ error: 'Policy number already exists' });
  }

  const agentSnapshot = await db
    .collection('agents')
    .where('uid', 'in', agentIds)
    .get();

  if (agentSnapshot.empty) {
    console.error('Agent not found for ID:', agentIds);
    return res.status(404).json({ error: 'Agent not found' });
  }

  const sendToGSQ = async (client) => {
    try {
      const BODY = {
        url: `${process.env.GSQ_BASE_URL}/sold`,
        headers: {
          Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
        },
        method: 'POST',
        data: {
          email: client.email,
          phone: client.phone,
        },
      };
      const response = await axios.request(BODY);
      console.log('GSQ response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending mark lead sold:', error);
      throw error;
    }
  };

  const getGSQLeads = async (client) => {
    try {
      const response = await axios.request({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
        },
        params: {
          phone: client.phone,
          name: `${client.firstName} ${client.lastName}`,
          email: client.email,
        },
        url: `${process.env.GSQ_BASE_URL}/find-leads`,
      });

      console.log('Leads fetched:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  };

  const hash = (data) => {
    return `${crypto.createHash('sha256').update(data).digest('hex')}`;
  };

  const sendSaleToPixel = async (commission, lead, policy) => {
    if (!lead || !lead.email || !lead.name || !lead.phone || !lead.state) {
      console.error('Missing lead information');
      return;
    }

    if (!policy) {
      console.error('Missing policy information');
      return;
    }

    if (!policy.premiumAmount) {
      console.error('Missing policy premium amount');
      return;
    }

    if (!commission || commission <= 0) {
      console.error('Invalid commission amount');
      return;
    }

    const eventTime = Math.floor(Date.now() / 1000);

    const META_PURCHASE_PAYLOAD = {
      data: [
        {
          event_name: 'Purchase',
          event_time: eventTime,
          action_source: 'website',
          event_source_url: 'https://getseniorquotes.com',
          event_id: `purchase-${lead.email}-${eventTime}`,
          user_data: {
            client_ip_address: lead.ip,
            client_user_agent: lead.userAgent,
            em: hash(lead.email),
            fn: hash(lead.name.split(' ')[0]),
            ln: hash(lead.name.split(' ')[1]),
            ph: hash(lead.phone),
            db: hash(`${lead.birthYear}${lead.birthMonth}${lead.birthDay}`),
            country: hash('US'),
            ge: lead.sex === 'Male' ? hash('m') : hash('f'),
            st: hash(STATE_ABBREV_MAP[lead.state]),
          },
          custom_data: {
            currency: 'USD',
            value: commission,
            content_type: 'product',
            content_name: `${policy.carrier} - ${policy.policyType}`,
            contents: [
              {
                id: `purchase-${lead.email}-${eventTime}`,
                quantity: 1,
                item_price: policy.premiumAmount * 12,
              },
            ],
          },
        },
      ],
    };

    // Attach click identifiers if available
    if (lead.fbc) META_PURCHASE_PAYLOAD.data[0].user_data.fbc = lead.fbc;
    if (lead.fbp) META_PURCHASE_PAYLOAD.data[0].user_data.fbp = lead.fbp;

    // Optional: add test_event_code for sandbox testing
    if (process.env.NODE_ENV === 'development') {
      META_PURCHASE_PAYLOAD.test_event_code = 'TEST12345';
    }

    try {
      const res = await axios.post(
        process.env.META_CONVERSIONS_URL,
        META_PURCHASE_PAYLOAD,
        {
          params: {
            access_token: process.env.META_CONVERSIONS_TOKEN,
          },
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Meta Purchase event sent:', res.data);
    } catch (err) {
      console.error(
        'Meta Purchase event error:',
        err.response?.data || err.message,
      );
    }
  };

  // send sale to Hyros
  const sendSaleToHyros = async (commission, client, policy) => {
    if (!client || !client.email || !client.phone) {
      console.error('Missing client information for Hyros');
      return;
    }

    if (!policy) {
      console.error('Missing policy information for Hyros');
      return;
    }

    if (!commission || commission <= 0) {
      console.error('Invalid commission amount for Hyros');
      return;
    }

    const HYROS_BODY = {
      method: 'POST',
      url: 'https://api.hyros.com/v1/api/v1.0/orders',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': process.env.HYROS_SECRET_KEY,
      },
      data: {
        stage: 'Sale',
        phoneNumbers: [client.phone],
        email: client.email,
        items: [
          {
            name: `${policy.carrier} - ${policy.policyType}`,
            price: commission,
            quantity: 1,
          },
        ],
      },
    };

    try {
      const hyrosResponse = await axios.request(HYROS_BODY);
      console.log('Hyros order created:', hyrosResponse.data);
    } catch (error) {
      console.error(
        'Error creating Hyros order:',
        error.response?.data || error.message,
      );
    }
  };

  const getRate = (productRates, level, defaultValue = 1) => {
    const raw = Number(productRates?.[String(level)]);
    return Number.isFinite(raw) && raw > 0 ? raw / 100 : defaultValue;
  };

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

  const calculateCommissions = async (agentData, agent, policy, premium) => {
    let sheaCommission = 0;

    const carrierRates = PRODUCT_RATES[policy.carrier?.trim()];
    const productRates = carrierRates?.[policy.policyType?.trim()];

    let agentLevel = await getLevel(agent, policy);
    if (!agentLevel) {
      agentLevel = agent.level;
    }

    let agentProductRate = getRate(productRates, agentLevel);

    if (!agentProductRate) {
      agentProductRate = 1;
    }

    const agentCommission = Math.round(premium * agentProductRate);

    console.log('agent commission:', {
      agent: agent.name,
      agentCommission,
      premium,
      agentProductRate,
    });

    if (agent.uid === process.env.SHEA_UID) {
      sheaCommission += agentCommission;
      console.log('Shea commission from sale:', agentCommission);
    }

    if (agent.uplineUid) {
      const upline = agentData.find((a) => a.uid === agent.uplineUid);

      if (!upline) {
        console.error('Upline not found for agent:', agent.uid, agent.name);
        return sheaCommission;
      }

      let uplineLevel = await getLevel(upline, policy);
      if (!uplineLevel) {
        uplineLevel = upline.level;
      }

      let uplineProductRate = getRate(productRates, uplineLevel);
      if (!uplineProductRate) {
        uplineProductRate = 1;
      }

      const uplineCommission = Math.round(
        premium * (uplineProductRate - agentProductRate),
      );
      if (upline.uid === process.env.SHEA_UID) {
        sheaCommission += uplineCommission;
        console.log('Shea commission from upline:', uplineCommission);
      }

      if (upline.uplineUid) {
        const secondUpline = agentData.find((a) => a.uid === upline.uplineUid);

        if (!secondUpline) {
          console.error(
            'Second upline not found for agent:',
            upline.uid,
            upline.name,
          );
          return sheaCommission;
        }

        let secondUplineLevel = await getLevel(secondUpline, policy);
        if (!secondUplineLevel) {
          secondUplineLevel = secondUpline.level;
        }

        let secondUplineProductRate =
          productRates?.[String(secondUplineLevel)] / 100;
        if (!secondUplineProductRate) {
          secondUplineProductRate = 1;
        }

        const secondUplineCommission = Math.round(
          premium * (secondUplineProductRate - uplineProductRate),
        );

        if (secondUpline.uid === process.env.SHEA_UID) {
          sheaCommission += secondUplineCommission;
          console.log(
            'Shea commission from second upline:',
            secondUplineCommission,
          );
        }
      }
    }

    return sheaCommission;
  };

  function buildPolicySlackPayload({
    agentName,
    product,
    annualPremium,
    carrier,
    effectiveDate,
  }) {
    return {
      text: 'New GSQ Sale!',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `
*🚨 POLICY SOLD 🚨*
Agent: ${agentName}
Product: ${product}
Carrier: ${carrier}
AP: $${Number(annualPremium).toLocaleString()}
EFT: ${effectiveDate || dayjs().format('MM/DD')}
          `.trim(),
          },
        },
        {
          type: 'divider',
        },
      ],
    };
  }

  try {
    const payload = buildPolicySlackPayload({
      agentName: agentSnapshot.docs[0].data().name,
      product: policy.policyType,
      effectiveDate: dayjs(policy.effectiveDate).format('MM/DD'),
      annualPremium: Math.round(policy.premiumAmount * 12),
      carrier: policy.carrier,
    });
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    const response = await client.chat.postMessage({
      channel: '#sales',
      text: payload.text,
      blocks: payload.blocks,
    });
    console.log('Slack bot test message sent:', response.ts);
  } catch (error) {
    console.error(
      'Error testing Slack bot:',
      error.response?.data || error.message,
    );
  }

  try {
    const clientRef = db.collection('clients').doc(clientId);

    const clientSnap = await clientRef.get();
    const client = clientSnap.data();

    try {
      if (isGSQ) await sendToGSQ(client);
    } catch (error) {
      console.error('Error marking lead as sold in GSQ:', error);
    }

    const source = client?.source ?? 'unknown';

    const agents = await db.collection('agents').get();
    const agentData = agents.docs.map((doc) => doc.data());

    let commission = 0;

    if (agentIds.length === 2 && policy.splitPolicy) {
      const splitPremium = Math.round((policy.premiumAmount * 12) / 2);

      const agent1 = agentData.find((a) => a.uid === agentIds[0]);
      const agent2 = agentData.find((a) => a.uid === agentIds[1]);

      const agent1Commission = await calculateCommissions(
        agentData,
        agent1,
        policy,
        splitPremium,
      );
      const agent2Commission = await calculateCommissions(
        agentData,
        agent2,
        policy,
        splitPremium,
      );

      commission = commission + agent1Commission;
      commission = commission + agent2Commission;
    } else {
      const agent = agentData.find((a) => a.uid === agentIds[0]);
      const premium = Math.round(policy.premiumAmount * 12);

      const agentCommission = await calculateCommissions(
        agentData,
        agent,
        policy,
        premium,
      );

      commission = commission + agentCommission;
    }

    if (isGSQ) {
      const clientLeads = await getGSQLeads(client);
      await sendSaleToPixel(commission, clientLeads[0], policy);
      await sendSaleToHyros(commission, client, policy);
    }

    const policyRef = await db.collection('policies').add({
      ...policy,
      policyNumber,
      clientId,
      agentIds,
      source,
      createdAt: Timestamp.now(),
    });

    await clientRef.update({
      agentIds: agentIds,
      policyIds: Firestore.FieldValue.arrayUnion(policyRef.id),
      policyData: Firestore.FieldValue.arrayUnion({
        id: policyRef.id,
        carrier: policy.carrier,
        policyNumber: policy.policyNumber,
      }),
    });

    // mark lead as sold in CRM DB
    const leadRef = db.collection('leads').where('phone', '==', client.phone);
    const leadSnap = await leadRef.get();

    if (!leadSnap.empty) {
      leadSnap.forEach(async (doc) => {
        await doc.ref.update({ sold: true });
      });
    }

    res.status(201).json({
      id: policyRef.id,
      ...policy,
      agentIds: agentIds,
      client: clientId,
    });
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

// webhook to receive leads from GetSeniorQuotes.com
app.post('/gsq-lead', async (req, res) => {
  const auth = req.headers['authorization']?.split(' ')[1];

  if (auth !== process.env.GSQ_TOKEN) {
    return res.status(401).send({ message: 'Unauthorized' });
  }

  const { firstName, lastName, email, phone, dob, leadSource, issuedTo, sold } =
    req.body;

  if (
    !firstName ||
    !lastName ||
    !email ||
    !phone ||
    !dob ||
    !leadSource ||
    !issuedTo ||
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

app.patch('/customer-account', async (req, res) => {
  const { account } = req.body;

  console.log('Updating account for', account);

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
        // url: `${process.env.GSQ_BASE_URL}/customer-account`,
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
  const db = new Firestore();
  const { clientId, client } = req.body;

  if (!clientId || !client) {
    return res.status(400).json({ error: 'Missing client ID or data' });
  }

  try {
    await db.collection('clients').doc(clientId).update(client);
    res.status(200).json({ id: clientId, ...client });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.patch('/policy', async (req, res) => {
  const db = new Firestore();
  const { policyId, policy } = req.body;

  if (!policyId || !policy || !policy.clientId) {
    return res
      .status(400)
      .json({ error: 'Missing policy ID, data, or client ID' });
  }

  try {
    const clientRef = db.collection('clients').doc(policy.clientId);
    const clientSnapshot = await clientRef.get();

    if (!clientSnapshot.exists) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientData = clientSnapshot.data();
    const policyData = [...clientData.policyData] || [];

    // Replace the matching object
    const index = policyData.findIndex((p) => p.id === policyId);
    if (index !== -1) {
      policyData[index] = {
        ...policyData[index],
        carrier: policy.carrier,
        policyNumber: policy.policyNumber,
      };
    }

    console.log('Updated client data:', clientData);

    // Update the client with the new array
    await clientRef.update({ policyData, agentIds: policy.agentIds });

    // Also update the policies collection
    await db.collection('policies').doc(policyId).update(policy);

    res.status(200).json({ id: policyId, ...policy });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

app.delete('/client', async (req, res) => {
  console.log('Deleting client');
  const db = new Firestore();
  const { clientId } = req.body;

  if (!clientId) {
    return res.status(400).json({ error: 'Missing client ID' });
  }

  try {
    // Delete associated policies
    const policiesSnapshot = await db
      .collection('policies')
      .where('clientId', '==', clientId)
      .get();

    const batch = db.batch();
    policiesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the client
    batch.delete(db.collection('clients').doc(clientId));

    await batch.commit();

    res.status(200).json({ message: 'Client and associated policies deleted' });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
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

module.exports = app;
