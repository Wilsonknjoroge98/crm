const express = require('express');
const logger = require('firebase-functions/logger');
const {
  Firestore,
  FieldValue,
  Timestamp,
} = require('firebase-admin/firestore');
const { supabaseService } = require('../services/supabase');

// eslint-disable-next-line new-cap
const gsqRouter = express.Router();

gsqRouter.get('/insurdial-config', async (req, res) => {
  const { data: authData, error: authError } =
    await req.supabase.auth.getUser();
  const email = authData?.user?.email;
  if (authError || !email) {
    return res.status(403).send({ message: 'Forbidden' });
  }

  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });
  const snapshot = await db.collection('id_config').doc(email).get();
  const token = snapshot.data()?.token;

  res.status(200).send({
    configured:
      snapshot.exists && typeof token === 'string' && token.length > 0,
    tokenLength: typeof token === 'string' ? token.length : 0,
  });
});

gsqRouter.patch('/insurdial-config', async (req, res) => {
  const {
    account: { email, token },
  } = req.body;

  const { data: authData, error: authError } =
    await req.supabase.auth.getUser();
  const authenticatedEmail = authData?.user?.email;

  if (authError || !authenticatedEmail || email !== authenticatedEmail) {
    return res.status(403).send({ message: 'Forbidden' });
  }

  if (typeof token !== 'string' || !token.trim()) {
    return res.status(400).send({ message: 'API key is required' });
  }

  if (token.length > 4096) {
    return res.status(400).send({ message: 'API key is too long' });
  }

  logger.log('InsurDial config update request received:', { email });

  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const ref = db.doc(`agents/${email}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return res.status(404).send({ message: 'Agent not found' });
  }

  const batch = db.batch();
  batch.set(
    db.collection('id_config').doc(email),
    { token: token.trim() },
    { merge: true },
  );
  batch.update(ref, { insurDialEnabled: true });
  await batch.commit();

  res.status(200).send({ message: 'InsurDial API key saved successfully' });
});

gsqRouter.get('/', async (req, res) => {
  const SUPER_ADMIN_EMAIL = 'info@finalexpensedigital.com';
  const { data: authData, error: authError } =
    await req.supabase.auth.getUser();
  const authenticatedEmail = authData?.user?.email;
  const { email } = req.query;

  if (authError || !authenticatedEmail || email !== authenticatedEmail) {
    return res.status(403).send({ message: 'Forbidden' });
  }

  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const ref = db.doc(`agents/${email}`);
  const snapshot = await ref.get();

  const liveTransfersRef = db.collection('live_transfers').doc(email);
  const liveTransfersSnapshot = await liveTransfersRef.get();

  let liveTransfers = 0;
  liveTransfers = liveTransfersSnapshot?.data()?.outstandingLiveTransfers || 0;

  const data = { ...snapshot.data(), liveTransfers };

  if (!snapshot.exists && email !== SUPER_ADMIN_EMAIL) {
    return res.status(404).send({ message: 'Agent not found' });
  }

  if (email === SUPER_ADMIN_EMAIL) {
    const liveTransfersRef = db.collection('live_transfers');
    const liveTransfersSnap = await liveTransfersRef.get();
    const liveTransfersDocs = liveTransfersSnap.docs.map((doc) => doc.data());

    const agentCollection = db.collection('agents');

    const agentSnap = await agentCollection.get();
    const agentDocs = agentSnap.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    }));
    const agents = agentDocs.filter(
      (doc) => doc.id !== 'hello@getseniorquotes.com',
    );

    for (const doc of agents) {
      const outstandingLeads = doc.outstandingLeads || 0;
      const verified = doc.verified || 0;
      const unverified = doc.unverified || 0;

      const sum = verified + unverified;
      if (outstandingLeads !== sum) {
        logger.warn('Data inconsistency found for agent:', {
          email: doc.email,
          outstandingLeads,
          verified,
          unverified,
        });
      }
    }

    const outstandingLeads = agents.reduce(
      (acc, curr) => acc + (curr.outstandingLeads || 0),
      0,
    );
    const verified = agents.reduce(
      (acc, curr) => acc + (curr.verified || 0),
      0,
    );
    const unverified = agents.reduce(
      (acc, curr) => acc + (curr.unverified || 0),
      0,
    );

    liveTransfers = liveTransfersDocs.reduce(
      (acc, curr) => acc + (curr.outstandingLiveTransfers || 0),
      0,
    );

    return res.status(200).send({
      name: 'Admin',
      email: 'info@finalexpensedigital.com',
      outstandingLeads,
      verified,
      unverified,
      liveTransfers,
    });
  }

  res.status(200).send(data);
});

gsqRouter.patch('/', async (req, res) => {
  const {
    account: {
      email,
      deliver,
      states,
      ringyEnabled,
      ghlEnabled,
      insurDialEnabled,
    },
  } = req.body;

  const { data: authData, error: authError } =
    await req.supabase.auth.getUser();
  const authenticatedEmail = authData?.user?.email;

  if (authError || !authenticatedEmail || email !== authenticatedEmail) {
    return res.status(403).send({ message: 'Forbidden' });
  }

  logger.log('Agent account update request received:', {
    email,
    fields: Object.keys(req.body.account),
  });

  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const ref = db.doc(`agents/${email}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return res.status(404).send({ message: 'Agent not found' });
  }

  const integrationUpdates = [
    {
      field: 'ringyEnabled',
      value: ringyEnabled,
      configCollection: 'ringy_config',
      label: 'Ringy',
    },
    {
      field: 'ghlEnabled',
      value: ghlEnabled,
      configCollection: 'ghl_config',
      label: 'GHL',
    },
    {
      field: 'insurDialEnabled',
      value: insurDialEnabled,
      configCollection: 'id_config',
      label: 'InsurDial',
    },
  ];

  for (const integration of integrationUpdates) {
    if (
      integration.value !== undefined &&
      typeof integration.value !== 'boolean'
    ) {
      return res.status(400).send({
        message: `${integration.field} must be a boolean`,
      });
    }

    if (integration.value === true) {
      const configSnapshot = await db
        .collection(integration.configCollection)
        .doc(email)
        .get();

      if (!configSnapshot.exists) {
        return res.status(422).send({
          message: `${integration.label} integration is not configured`,
          crm: integration.field,
        });
      }
    }
  }

  const updateObject = {};

  if (deliver !== undefined) {
    updateObject.deliver = deliver;
  }

  if (states !== undefined) {
    updateObject.states = states;
  }

  for (const integration of integrationUpdates) {
    if (integration.value !== undefined) {
      updateObject[integration.field] = integration.value;
    }
  }

  await ref.update(updateObject);
  res.status(200).send({ message: 'Agent account updated successfully' });
});

gsqRouter.get('/reviews/unmatched', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).send({ message: 'Forbidden' });
  }

  const db = new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const snapshot = await db.collection('unmatched_agent_reviews').get();
  const reviews = snapshot.docs.map((doc) => ({
    docId: doc.id,
    ...doc.data(),
  }));

  res.status(200).send({ reviews });
});

gsqRouter.post('/reviews/match', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).send({ message: 'Forbidden' });
  }

  const { reviewId, agentEmail } = req.body;

  if (typeof reviewId !== 'string' || !reviewId.trim()) {
    return res.status(400).send({ message: 'reviewId is required' });
  }
  if (typeof agentEmail !== 'string' || !agentEmail.trim()) {
    return res.status(400).send({ message: 'agentEmail is required' });
  }

  const { data: agent, error: agentError } = await supabaseService
    .from('agents')
    .select('email')
    .eq('email', agentEmail.trim())
    .maybeSingle();

  if (agentError) {
    logger.error('Failed to verify agent for review match', { agentError });
    return res.status(500).send({ message: 'Failed to verify agent' });
  }
  if (!agent) {
    return res.status(404).send({ message: 'Agent not found' });
  }

  const db = new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const unmatchedRef = db.doc(`unmatched_agent_reviews/${reviewId}`);
  const unmatchedSnapshot = await unmatchedRef.get();
  if (!unmatchedSnapshot.exists) {
    return res.status(404).send({ message: 'Review not found' });
  }

  const { date, id, rating, reviewerName, reviewerPhotoUrl, text } =
    unmatchedSnapshot.data();
  const reviewEntry = Object.fromEntries(
    Object.entries({
      date,
      id,
      rating,
      reviewerName,
      reviewerPhotoUrl,
      text,
    }).filter(([, value]) => value !== undefined),
  );

  const batch = db.batch();
  batch.set(
    db.doc(`agent_reviews/${agentEmail.trim()}`),
    {
      reviews: FieldValue.arrayUnion(reviewEntry),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
  batch.delete(unmatchedRef);
  await batch.commit();

  logger.log('Matched review to agent', { reviewId, agentEmail });

  res.status(200).send({ message: 'Review matched successfully' });
});

gsqRouter.delete('/reviews/unmatched/:reviewId', async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).send({ message: 'Forbidden' });
  }

  const { reviewId } = req.params;

  const db = new Firestore({
    projectId: process.env.GSQ_PROJECT_ID,
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const ref = db.doc(`unmatched_agent_reviews/${reviewId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return res.status(404).send({ message: 'Review not found' });
  }

  await ref.delete();
  logger.log('Dismissed unmatched review', { reviewId });

  res.status(200).send({ message: 'Review dismissed successfully' });
});

module.exports = gsqRouter;
