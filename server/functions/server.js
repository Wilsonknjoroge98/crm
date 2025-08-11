const cors = require('cors');
const express = require('express');
const app = express();

const { Firestore, Timestamp } = require('firebase-admin/firestore');

app.use(express.json());

app.use(
  cors({
    origin: [
      'https://hourglass-ef3ca.web.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  }),
);

app.get('/clients', async (req, res) => {
  const db = new Firestore();

  const { agentId, agentRole } = req.query;

  if (!agentId || !agentRole) {
    return res.status(400).json({ error: 'Missing agentId' });
  }

  try {
    if (agentRole !== 'admin') {
      const clientData = await db
        .collection('clients')
        .where('agentId', '==', agentId)
        .get();
      const clients = clientData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      res.json(clients);
    } else {
      const clientData = await db.collection('clients').get();
      const clients = clientData.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log('Fetched clients:', clients);
      res.json(clients || []);
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/policies', async (req, res) => {
  const db = new Firestore();

  const { agentId, agentRole } = req.query;

  if (!agentId) {
    return res.status(400).json({ error: 'Missing agentId' });
  }

  try {
    if (agentRole !== 'admin') {
      const policyData = await db
        .collection('policies')
        .where('agentId', '==', agentId)
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
  const db = new Firestore();
  const { agent } = req.body;

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
  const db = new Firestore();
  const { client } = req.body;

  if (!client) {
    return res.status(400).json({ error: 'Missing client data' });
  }

  try {
    const docRef = await db.collection('clients').add({
      ...client,
      createdAt: Timestamp.now(),
    });
    res.status(201).json({ client: { id: docRef.id, ...client } });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.post('/policy', async (req, res) => {
  const db = new Firestore();
  const { policy, clientId, agentId } = req.body;

  if (!policy || !clientId || !agentId) {
    return res
      .status(400)
      .json({ error: 'Missing policy, client ID, or agent ID' });
  }

  const agentSnapshot = await db
    .collection('agents')
    .where('uid', '==', agentId)
    .get();

  if (agentSnapshot.empty) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const compRate = agentSnapshot.docs[0].data().compRate;

  // Beneficiary date of birth
  // Beneficiary phone numbers

  try {
    const docRef = await db.collection('policies').add({
      ...policy,
      clientId,
      agentId,
      compRate,
      createdAt: Timestamp.now(),
    });

    await db
      .collection('clients')
      .doc(clientId)
      .update({
        policyIds: Firestore.FieldValue.arrayUnion(docRef.id),
        policyData: Firestore.FieldValue.arrayUnion({
          id: docRef.id,
          carrier: policy.carrier,
          policyNumber: policy.policyNumber,
        }),
      });

    res.status(201).json({ id: docRef.id, ...policy, client: clientId });
  } catch (error) {
    console.error('Error creating policy:', error);
    res.status(500).json({ error: 'Failed to create policy' });
  }
});

app.patch('/client', async (req, res) => {
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
    const clientSnap = await clientRef.get();

    if (!clientSnap.exists) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const clientData = clientSnap.data();
    const policyData = Array.isArray(clientData.policyData)
      ? [...clientData.policyData]
      : [];

    // Replace the matching object
    const index = policyData.findIndex((p) => p.id === policyId);
    if (index !== -1) {
      policyData[index] = {
        ...policyData[index],
        carrier: policy.carrier,
        policyNumber: policy.policyNumber,
      };
    }

    // Update the client with the new array
    await clientRef.update({ policyData });

    // Also update the policies collection
    await db.collection('policies').doc(policyId).update(policy);

    res.status(200).json({ id: policyId, ...policy });
  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy' });
  }
});

app.delete('/client', async (req, res) => {
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

module.exports = app;
