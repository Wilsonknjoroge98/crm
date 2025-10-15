const cors = require('cors');
const express = require('express');
const axios = require('axios');
const app = express();
const dayjs = require('dayjs');
// const { faker } = require('@faker-js/faker');
const { PRODUCT_RATES } = require('./constants');

const { Firestore, Timestamp } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

admin.initializeApp();

app.use(express.json());

app.use(
  cors({
    origin: [
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

const authMiddleware = async (req, res, next) => {
  try {
    const idToken = (req.headers.authorization || '').replace('Bearer ', '');
    if (!idToken) {
      return res.status(401).json({ error: 'Missing Authorization' });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    // derive identity & role ONLY from the verified token
    req.user = {
      uid: decoded.uid,
      role: decoded.role || 'agent',
      email: decoded.email,
    };
    next();
  } catch (e) {
    console.error('Auth error', e);
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.use(authMiddleware);

app.get('/clients', async (req, res) => {
  const { agentId, agentRole } = req.query;

  if (!agentId || !agentRole) {
    return res.status(400).json({ error: 'Missing agentId' });
  }

  console.log('Getting clients');
  const db = new Firestore();

  try {
    if (agentRole !== 'admin') {
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

      const unknownClients = clients.filter((c) => c.source == 'unknown').length;
      console.log({ unknownClients });
      res.json(clients);
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
      res.json(clients || []);
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/policies', async (req, res) => {
  console.log('Getting policies');
  const db = new Firestore();

  const { agentId, agentRole } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: 'Missing agentId' });
  }

  try {
    if (agentRole !== 'admin') {
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

app.get('/agent-account', async (req, res) => {
  const { email } = req.query;

  console.log('Getting account for', email);

  const getAgentAccount = async () => {
    try {
      const response = await axios.request({
        headers: {
          Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
        },
        params: {
          email: email,
        },
        method: 'GET',
        url: `${process.env.GSQ_BASE_URL}/agent-account`,
      });

      console.log('Account Fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching leads:', error.message);
      throw error;
    }
  };

  const account = await getAgentAccount();
  console.log('Account details', account);
  res.status(200).json(account);
});

app.post('/client', async (req, res) => {
  console.log('Creating client');
  const db = new Firestore();
  const { client } = req.body;

  console.log('Posting client:', client);

  if (!client) {
    return res.status(400).json({ error: 'Missing client data' });
  }

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
        email: client.email,
      },
    };

    try {
      const response = await axios.request(HYROS_BODY);
      const lead = response.data.result[0] || [];

      let source = lead?.lastSource?.sourceLinkAd?.name || null;

      if (!source) {
        source = lead?.firstSource?.sourceLinkAd?.name || null;

        if (!source) {
          return 'unknown';
        }
      }

      return source;
    } catch (error) {
      console.error('Error fetching Hyros data:', error);
    }
  };

  client.source = await getHyrosSource();

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

  console.log('Posting policy:', policy);

  if (!policy || !clientId || !agentIds) {
    console.log('Missing data');
    return res.status(400).json({ error: 'Missing policy, client ID, or agent ID' });
  }

  const policyNumber = policy.policyNumber.trim();

  console.log('Updating policy', policyNumber);

  const policySnapshot = await db
    .collection('policies')
    .where('policyNumber', '==', policyNumber)
    .get();

  if (policySnapshot.size > 0) {
    return res.status(409).json({ error: 'Policy number already exists' });
  }

  const agentSnapshot = await db.collection('agents').where('uid', 'in', agentIds).get();

  if (agentSnapshot.empty) {
    console.error('Agent not found for ID:', agentIds);
    return res.status(404).json({ error: 'Agent not found' });
  }

  const sendGSQEvent = async (client) => {
    try {
      const BODY = {
        headers: {
          Authorization: `Bearer ${process.env.GSQ_TOKEN}`,
        },
        method: 'POST',
        url: `${process.env.GSQ_BASE_URL}/sold`,
        data: {
          email: client.email,
          phone: client.phone,
        },
      };
      const response = axios.request(BODY);
      console.log(response.date);
    } catch (error) {
      console.error('Error sending mark lead sold:', error);
      throw error;
    }
  };

  const sendHyrosEvent = async (commission, client, policy) => {
    const HYROS_BODY = {
      method: 'POST',
      url: 'https://api.hyros.com/v1/api/v1.0/orders',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': process.env.HYROS_SECRET_KEY,
      },
      data: {
        'stage': 'Sale',
        'phoneNumbers': [client.phone],
        'email': client.email,
        'items': [
          {
            'name': `${policy.carrier} - ${policy.policyType}`,
            'price': commission,
            'quantity': 1,
          },
        ],
      },
    };

    try {
      const hyrosResponse = await axios.request(HYROS_BODY);
      console.log('Hyros order created:', hyrosResponse.data);
    } catch (error) {
      console.error('Error creating Hyros order:', error.response?.data || error.message);
    }
  };

  const calculateCommissions = (agentData, agent, policy, premium) => {
    let sheaCommission = 0;

    const carrierRates = PRODUCT_RATES[policy.carrier?.trim()];
    const productRates = carrierRates?.[policy.policyType?.trim()];

    const agentProductRate = productRates?.[String(agent.level)] / 100 || 1;

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

      const uplineProductRate = productRates?.[String(upline.level)] / 100 || 1;
      const uplineCommission = Math.round(premium * (uplineProductRate - agentProductRate));

      if (upline.uid === process.env.SHEA_UID) {
        sheaCommission += uplineCommission;
        console.log('Shea commission from upline:', uplineCommission);
      }

      if (upline.uplineUid) {
        const secondUpline = agentData.find((a) => a.uid === upline.uplineUid);

        if (!secondUpline) {
          console.error('Second upline not found for agent:', upline.uid, upline.name);
          return sheaCommission;
        }
        const secondUplineProductRate = productRates?.[String(secondUpline.level)] / 100 || 1;
        const secondUplineCommission = Math.round(
          premium * (secondUplineProductRate - uplineProductRate),
        );

        if (secondUpline.uid === process.env.SHEA_UID) {
          sheaCommission += secondUplineCommission;
          console.log('Shea commission from second upline:', secondUplineCommission);
        }
      }
    }

    return sheaCommission;
  };

  try {
    const clientRef = db.collection('clients').doc(clientId);

    const clientSnap = await clientRef.get();
    const client = clientSnap.data();

    await sendGSQEvent(client);

    const source = client?.source ?? 'unknown';

    const agents = await db.collection('agents').get();
    const agentData = agents.docs.map((doc) => doc.data());

    let commission = 0;

    if (agentIds.length === 2 && policy.splitPolicy) {
      const splitPremium = Math.round((policy.premiumAmount * 12) / 2);

      const agent1 = agentData.find((a) => a.uid === agentIds[0]);
      const agent2 = agentData.find((a) => a.uid === agentIds[1]);

      commission = commission + calculateCommissions(agentData, agent1, policy, splitPremium);
      commission = commission + calculateCommissions(agentData, agent2, policy, splitPremium);
    } else {
      const agent = agentData.find((a) => a.uid === agentIds[0]);
      const premium = Math.round(policy.premiumAmount * 12);
      commission = commission + calculateCommissions(agentData, agent, policy, premium);
    }

    await sendHyrosEvent(commission, client, policy);

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
    return res.status(400).json({ error: 'Missing policy ID, data, or client ID' });
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
    const policyData = clientDoc.data().policyData.filter((policy) => policy.id !== policyId);

    const policyIds = clientDoc.data().policyIds.filter((id) => id !== policyId);

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

app.get('/premiums', async (req, res) => {
  const { mode, startDate, endDate } = req.query;

  if (mode === 'development') {
    return res.status(200).json([
      { name: 'Alice Johnson', count: 15, premiumAmount: 18000 },
      { name: 'Bob Smith', count: 12, premiumAmount: 15000 },
      { name: 'Charlie Brown', count: 10, premiumAmount: 12000 },
      { name: 'Diana Prince', count: 8, premiumAmount: 10000 },
      { name: 'Ethan Hunt', count: 7, premiumAmount: 9000 },
      { name: 'Fiona Glenanne', count: 6, premiumAmount: 8000 },
      { name: 'George Bailey', count: 5, premiumAmount: 7000 },
      { name: 'Hannah Montana', count: 4, premiumAmount: 6000 },
    ]);
  }

  console.log('Getting leaderboard');
  const db = new Firestore();
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const policiesSnapshot = await db.collection('policies').get();
    const policies = policiesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const agentsSnapshot = await db.collection('agents').get();
    const agents = agentsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const leaderboard = {};

    for (const policy of policies) {
      const effectiveDate = new Date(policy.effectiveDate);

      if (new Date(effectiveDate) < start) {
        console.log('Skipping policy before start date:', policy.policyNumber, effectiveDate);
        continue;
      }

      if (new Date(effectiveDate) > end) {
        console.log('Skipping policy after end date:', policy.policyNumber, effectiveDate);
        continue;
      }

      policy.agentIds = policy.agentIds || [];
      policy.premiumAmount = Number(policy.premiumAmount) || 0;

      // Calculate leaderboard points
      for (const agentId of policy.agentIds) {
        const agentName = agents.find((a) => a.uid === agentId)?.name || 'Unknown Agent';

        const premiumPoints = Math.round(Number(policy.premiumAmount * 12));

        leaderboard[agentName] = leaderboard[agentName] || { count: 0, premiumAmount: 0 };
        leaderboard[agentName].count += 1;
        leaderboard[agentName].premiumAmount += premiumPoints;
      }
    }

    delete leaderboard['Shea Morales'];

    // Convert leaderboard object to array
    const leaderboardArray = Object.entries(leaderboard).map(([name, data]) => ({
      name,
      ...data,
    }));

    // Sort leaderboard by points
    leaderboardArray.sort((a, b) => b.premiumAmount - a.premiumAmount);

    console.log('Leaderboard data:', leaderboardArray);

    res.status(200).json(leaderboardArray);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

app.get('/insights', async (req, res) => {
  const { mode } = req.query;

  if (mode === 'development') {
    return res.status(200).json({
      sources: [
        { name: 'WK | Annie Winner | 5/11/25', count: 20, pct: 20 },
        { name: 'TJ | Alana Book | 8/1/25', count: 20, pct: 20 },
        { name: 'WK | E Philip 4 | 9/4/25', count: 20, pct: 20 },
        { name: 'TJ | Alana Mug 7/13/25', count: 10, pct: 10 },
        { name: 'WK | E Philip 2 | 9/4/25', count: 10, pct: 10 },
        { name: 'WK | Annie Scam Hook 2 | 9/7/25', count: 10, pct: 10 },
      ],
      total: 100,
      unknownClients: 5,
    });
  }
  const db = new Firestore();
  const ref = db.collection('clients');

  const snapshot = await ref.get();
  const clients = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const maps = clients.reduce(
    (acc, c) => {
      const key = (c.source || 'unknown').trim();
      acc.all[key] = (acc.all[key] || 0) + 1;
      if (key !== 'unknown') acc.known[key] = (acc.known[key] || 0) + 1;
      return acc;
    },
    { all: {}, known: {} },
  );

  const total = Object.values(maps.known).reduce((s, n) => s + n, 0) || 1;
  const unknownClients = maps.all['unknown'] || 0;

  const sources = Object.entries(maps.known)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);

  res.status(200).send({ sources, total, unknownClients });
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

  console.log('Calculating commissions from', startDate, 'to', endDate);
  const db = new Firestore();

  const policySnapshot = await db.collection('policies').get();
  const policies = policySnapshot.docs.map((doc) => doc.data());
  const agentSnapshot = await db.collection('agents').get();
  const agents = agentSnapshot.docs.map((doc) => doc.data());

  const commissions = {};
  let annualPremiumTotal = 0;

  for (const policy of policies) {
    const effectiveDate = policy.effectiveDate;

    if (dayjs(effectiveDate).isBefore(startTimestamp)) {
      console.log('Skipping policy before start date:', policy.policyNumber, effectiveDate);
      continue;
    }

    if (dayjs(effectiveDate).isAfter(endTimestamp)) {
      console.log('Skipping policy after end date:', policy.policyNumber, effectiveDate);
      continue;
    }

    const commissionsTotal = Object.values(commissions).reduce((a, b) => a + b, 0);

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

      const [agent1, agent2] = agents.filter((agent) => policy.agentIds.includes(agent.uid));
      const splitPremium = Math.round(annualPremium / 2);
      console.log('Split premium:', splitPremium);

      const agent1Level = agent1.level;
      const agent2Level = agent2.level;

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

      commissions[agent1.name] = (commissions[agent1.name] || 0) + agent1Commission;
      commissions[agent2.name] = (commissions[agent2.name] || 0) + agent2Commission;

      // ---- agent 1 uplines ----
      if (agent1.uplineUid) {
        const upline = agents.find((a) => a.uid === agent1.uplineUid);
        let uplineProductRate = productRates?.[String(upline?.level)] / 100;

        if (!upline) {
          console.error('No upline found for agent 1', agent1.name);
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
          commissions[upline.name] = (commissions[upline.name] || 0) + uplineCommission;

          console.log('Commission upline:', uplineCommission);

          if (upline.uplineUid) {
            const secondUpline = agents.find((a) => a.uid === upline.uplineUid);
            let secondUplineProductRate = productRates?.[String(secondUpline?.level)] / 100;

            if (!secondUpline) {
              console.error('No upline found for upline agent', upline.name);
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
        let uplineProductRate = productRates?.[String(upline?.level)] / 100;

        if (!uplineProductRate) {
          const id = `${policy.carrier}-${policyType}`;

          const docRef = db.collection('missingRates').doc(id);
          const docSnap = await docRef.get();

          if (!docSnap.exists) {
            await docRef.set({
              carrier: policy.carrier,
              policyType: policyType,
              type: 'split',
              agent2Level: upline.level,
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
          console.log(`Found upline for agent 2: ${upline?.name} level: ${upline?.level}`);
          const uplineCommission = Math.round(
            splitPremium * (uplineProductRate - agent2ProductRate),
          );
          commissions[upline.name] = (commissions[upline.name] || 0) + uplineCommission;

          console.log('Commission upline:', uplineCommission);

          if (upline.uplineUid) {
            const secondUpline = agents.find((a) => a.uid === upline.uplineUid);
            let secondUplineProductRate = productRates?.[String(secondUpline?.level)] / 100;

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
                  agent2Level: upline.level,
                  createdAt: Timestamp.now(),
                });
              }
              secondUplineProductRate = 1;
            }

            if (secondUpline) {
              console.log(
                `Found upline for upline of agent 2: ${secondUpline?.name} level: ${secondUpline?.level}`,
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

      console.log('policy processed:', policy.policyNumber, agent1.name, agent2.name);
    } else {
      console.log('Single agent policy detected');
      const agent = agents.find((a) => a.uid === policy.agentIds[0]);
      const agentLevel = agent.level;

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
      commissions[agent.name] = (commissions[agent.name] || 0) + sellerCommission;

      console.log(
        `Agent commission: ${agent?.name} ${sellerCommission} product rate: ${agentProductRate}`,
      );

      if (agent.uplineUid) {
        const upline = agents.find((a) => a.uid === agent.uplineUid);
        let uplineProductRate = productRates?.[String(upline?.level)] / 100;

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
              agentLevel: upline.level,
              createdAt: Timestamp.now(),
            });
          }
          uplineProductRate = 1;
        }

        if (upline && uplineProductRate) {
          console.log(`Found upline for agent: ${upline?.name} product rate: ${uplineProductRate}`);
          const uplineCommission = Math.round(
            annualPremium * (uplineProductRate - agentProductRate),
          );
          commissions[upline.name] = (commissions[upline.name] || 0) + uplineCommission;

          console.log('Commission upline:', uplineCommission);

          if (upline.uplineUid) {
            const secondUpline = agents.find((a) => a.uid === upline.uplineUid);
            let secondUplineProductRate = productRates?.[String(secondUpline?.level)] / 100;

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
                  agentLevel: upline.level,
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

  const startTimestamp = dayjs(startDate, 'YYYY-MM-DD').startOf('day');
  const endTimestamp = dayjs(endDate, 'YYYY-MM-DD').endOf('day');

  console.log('Ad spend from', startDate, 'to', endDate);

  try {
    const response = await axios.request({
      method: 'GET',
      url: process.env.META_MARKETING_URL,
      params: {
        fields: 'spend',
        time_range: JSON.stringify({ since: startTimestamp, until: endTimestamp }),
        access_token: process.env.META_MARKETING_ACCESS_TOKEN,
      },
    });

    // Extract spend (if multiple rows, sum them)
    console.log('Meta response data:', response.data);
    const spend = Number(response.data['data'][0].spend);

    const totalSpend = spend || 0;

    console.log(`Total spend from ${startDate} to ${endDate}: $${totalSpend.toFixed(2)}`);
    res.status(200).send({ total: Math.round(Number(totalSpend)) });
  } catch (error) {
    console.error('Error fetching spend:', error.response?.data || error.message);
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
      `Total revenue from ${startDate} to ${endDate}: $${(totalRevenue / 100).toLocaleString()}`,
    );

    const total = totalRevenue / 100; // Return in dollars
    res.status(200).send({ total });
  } catch (error) {
    console.error('Error fetching Stripe revenue:', error.response?.data || error.message);
    res.status(500).send({ error: 'Failed to fetch revenue data' });
  }
});

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
    res.status(201).json({ id: expenseRef.id, name, amount: Math.round(Number(amount)), date });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
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
//   'Mutual of Omaha': ['Accidental Death', `Children's Whole Life`, 'Final Expense', 'IUL'],
//   'Foresters': ['Planright FEX', 'Strong Foundation', 'Smart UL'],
//   'Ameritas': ['CLEAR EDGE TERM', 'IUL'],
// };
// const leadSources = ['GetSeniorQuotes.com', 'Facebook Ads', 'Referral', 'Direct Mail'];
// const policyStatuses = ['Active', 'Pending', 'Lapsed', 'Cancelled', 'Insufficient Funds'];
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
//   const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
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
//   const snap = await firestore.collection('agents').where('role', 'in', ['agent', 'admin']).get();
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
//   const splitPolicyShare = splitPolicy ? ['25', '50'][faker.number.int({ min: 0, max: 1 })] : '';

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

// async function seedOnce({ clients, minPoliciesPerClient, maxPoliciesPerClient, seedRunId }) {
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

//   const db = new Firestore();
//   const collections = ['policies', 'clients']; // delete policies first (refs live on clients)

//   for (const col of collections) {
//     while (true) {
//       const snap = await db.collection(col).where('seedRunId', '==', seedRunId).limit(500).get();
//       if (snap.empty) break;
//       const batch = db.batch();
//       snap.docs.forEach((d) => batch.delete(d.ref));
//       await batch.commit();
//       if (snap.size < 500) break;
//     }
//   }
//   return { seedRunId, status: 'wiped' };
// }

// seedOnce({
//   clients: 40,
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
