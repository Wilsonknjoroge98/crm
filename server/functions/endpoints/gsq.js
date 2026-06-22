const express = require('express');
const logger = require('firebase-functions/logger');
const { Firestore } = require('firebase-admin/firestore');

// eslint-disable-next-line new-cap
const gsqRouter = express.Router();

gsqRouter.get('/insurdial-config', async (req, res) => {
  const email = req.agent?.email;
  if (!email) {
    return res.status(403).send({ message: 'Forbidden' });
  }

  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });
  const snapshot = await db.collection('id_config').doc(email).get();
  const token = snapshot.data()?.token;

  res.status(200).send({
    configured: snapshot.exists && typeof token === 'string' && token.length > 0,
    tokenLength: typeof token === 'string' ? token.length : 0,
  });
});

gsqRouter.get('/', async (req, res) => {
  const { email } = req.query;

  const db = new Firestore({
    projectId: 'life-quoter',
    credentials: JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY),
  });

  const ref = db.doc(`agents/${email}`);
  const snapshot = await ref.get();

  const liveTransfersRef = db.collection('live_transfers').doc(email);
  const liveTransfersSnapshot = await liveTransfersRef.get();

  const liveTransfers =
    liveTransfersSnapshot?.data()?.outstandingLiveTransfers || 0;

  const data = { ...snapshot.data(), liveTransfers };

  if (!snapshot.exists) {
    if (email === 'info@finalexpensedigital.com') {
      const col = db.collection('agents');

      const snap = await col.get();
      const docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const data = docs.filter((doc) => doc.id !== 'hello@getseniorquotes.com');

      for (const doc of data) {
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

      const outstandingLeads = data.reduce(
        (acc, curr) => acc + (curr.outstandingLeads || 0),
        0,
      );
      const verified = data.reduce(
        (acc, curr) => acc + (curr.verified || 0),
        0,
      );
      const unverified = data.reduce(
        (acc, curr) => acc + (curr.unverified || 0),
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

    return res.status(404).send({ message: 'Agent not found' });
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
      token,
    },
  } = req.body;

  // Don't log API keys
  logger.log('Agent account update request received:', {
    email,
    fields: Object.keys(req.body.account).filter((field) => field !== 'token'),
    includesToken: token !== undefined,
  });

  if (token !== undefined) {
    if (typeof token !== 'string' || !token.trim()) {
      return res.status(400).send({ message: 'API key is required' });
    }

    if (token.length > 4096) {
      return res.status(400).send({ message: 'API key is too long' });
    }

    if (!req.agent?.email || req.agent.email !== email) {
      return res.status(403).send({ message: 'Forbidden' });
    }
  }

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

    const tokenWillConfigureInsurDial =
      integration.field === 'insurDialEnabled' && token !== undefined;

    if (integration.value === true && !tokenWillConfigureInsurDial) {
      const configSnapshot = await db
        .collection(integration.configCollection)
        .doc(email)
        .get();

      if (!configSnapshot.exists) {
        return res.status(422).send({
          message: `${integration.label} integration is not configured`,
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

  const batch = db.batch();

  if (token !== undefined) {
    const configRef = db.collection('id_config').doc(email);
    batch.set(configRef, { token: token.trim() }, { merge: true });
    updateObject.insurDialEnabled = true;
  }

  batch.update(ref, updateObject);
  await batch.commit();
  res.status(200).send({ message: 'Agent account updated successfully' });
});

module.exports = gsqRouter;
