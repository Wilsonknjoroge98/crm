const cors = require('cors');
const express = require('express');
const app = express();

const { Firestore } = require('firebase-admin/firestore');

app.use(express.json());

app.use(
  cors({
    origin: [
      'https://hourglass-ef3ca.web.app',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
    ],
    methods: ['GET', 'POST', 'PATCH'],
  }),
);

app.get('/clients', async (req, res) => {
  const db = new Firestore();

  try {
    const clientData = await db.collection('clients').get();
    const clients = clientData.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

app.get('/policies', async (req, res) => {
  const db = new Firestore();
  console.log('Fetching policies...');
  try {
    const policyData = await db.collection('policies').get();
    const policies = policyData.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

app.post('/client', async (req, res) => {
  const db = new Firestore();
  const { client } = req.body;

  if (!client) {
    return res.status(400).json({ error: 'Missing client data' });
  }

  try {
    const docRef = await db.collection('clients').add(client);
    res.status(201).json({ client: { id: docRef.id, ...client } });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.post('/policy', async (req, res) => {
  const db = new Firestore();
  const { policy } = req.body;

  if (!policy) {
    return res.status(400).json({ error: 'Missing policy' });
  }

  try {
    const docRef = await db.collection('policies').add({
      ...policy,
    });
    res.status(201).json({ id: docRef.id, ...policy });
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

module.exports = app;
