const cors = require('cors');
const express = require('express');
const axios = require('axios');
const app = express();
// const { faker } = require('@faker-js/faker');

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
      const clientData = await db
        .collection('clients')
        .where('agentIds', 'array-contains', agentId)
        .get();
      const clients = clientData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const unknownClients = clients.filter((c) => c.source == 'unknown').length;
      console.log({ unknownClients });
      res.json(clients);
    } else {
      const clientData = await db.collection('clients').get();
      const clients = clientData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
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
      const policies = policyData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json(policies);
    } else {
      const policyData = await db.collection('policies').get();
      const policies = policyData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
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

app.post('/client', async (req, res) => {
  console.log('Creating client');
  const db = new Firestore();
  const { client } = req.body;

  console.log('Posting client:', client);

  if (!client) {
    return res.status(400).json({ error: 'Missing client data' });
  }

  const getLeads = async () => {
    try {
      const response = await axios.request({
        headers: {
          Authorization: `Bearer ${process.env.LEADS_BEARER_TOKEN}`,
        },
        params: {
          phone: client.phone,
          name: `${client.firstName} ${client.lastName}`,
        },
        method: 'GET',
        url: 'https://us-central1-life-quoter.cloudfunctions.net/app/get-leads',
      });

      console.log('Leads fetched:', response.data.length);
      return response.data;
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  };

  const leads = await getLeads();

  for (const lead of leads) {
    if (lead?.ad) {
      client.source = lead.ad;
      client.leadId = lead.id;
      break;
    }
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

  console.log('Posting policy:', policy);

  if (!policy || !clientId || !agentIds) {
    console.log('Missing data');
    return res.status(400).json({ error: 'Missing policy, client ID, or agent ID' });
  }

  const policyNumber = policy.policyNumber.trim();

  console.log('Updating policy', policy.policyId, policyNumber);

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

  const compRate = agentSnapshot.docs[0].data().compRate;

  // Beneficiary date of birth
  // Beneficiary phone numbers

  try {
    const policyRef = await db.collection('policies').add({
      ...policy,
      policyNumber,
      clientId,
      agentIds,
      compRate,
      createdAt: Timestamp.now(),
    });

    const clientRef = db.collection('clients').doc(clientId);

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

app.get('/leaderboard', async (req, res) => {
  console.log('Getting leaderboard');
  const db = new Firestore();
  try {
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
      policy.agentIds = policy.agentIds || [];
      policy.premiumAmount = Number(policy.premiumAmount) || 0;

      // Calculate leaderboard points
      for (const agentId of policy.agentIds) {
        const agentName = agents.find((a) => a.uid === agentId)?.name || 'Unknown Agent';

        leaderboard[agentName] = leaderboard[agentName] || { count: 0, premiumAmount: 0 };
        leaderboard[agentName].count += 1;
        leaderboard[agentName].premiumAmount += Number(policy.premiumAmount * 12);
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

// const carriers = [
//   'Mutual of Omaha',
//   'SBLI',
//   'Baltimore Life',
//   'American Amicable',
//   'Royal Neighbors',
// ];
// const policyTypes = ['FEX Level Death Benefit', 'iProvide', 'Whole Life', 'Term 20'];
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
//     compRate: d.get('compRate') ?? 0.8,
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

//   const carrier = pick(carriers);
//   const policyNumber = faker.string.alphanumeric({
//     length: 12,
//     casing: 'upper',
//   });
//   const policyType = pick(policyTypes);
//   const premiumAmount = faker.finance.amount({ min: 35, max: 250, dec: 2 });
//   const coverageAmount = faker.number.int({ min: 5000, max: 30000 }).toString();
//   const compRate = 0.8;
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
//     compRate, // number
//     policyStatus,
//     effectiveDate: effective.toISOString().slice(0, 10),
//     dateSold: sold.toISOString().slice(0, 10),
//     draftDay: faker.number.int({ min: 1, max: 28 }).toString(),
//     leadSource: pick(leadSources),
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
//       url: 'https://us-central1-life-quoter.cloudfunctions.net/app/get-leads',
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

module.exports = app;
