const express = require('express');
const logger = require('firebase-functions/logger');
const { randomUUID } = require('crypto');
const { Storage } = require('@google-cloud/storage');
const { Firestore } = require('firebase-admin/firestore');

// eslint-disable-next-line new-cap
const gsqRouter = express.Router();

const getImageDimensions = (buffer, contentType) => {
  if (contentType === 'image/png') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (contentType === 'image/jpeg') {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }

  if (contentType === 'image/webp' && buffer.toString('ascii', 12, 16) === 'VP8X') {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }

  return null;
};

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
      bio,
      imageUrl,
      image,
      specialties,
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

  if (bio !== undefined) {
    if (typeof bio !== 'string' || bio.trim().length > 200) {
      return res
        .status(400)
        .send({ message: 'Bio must be 200 characters or fewer' });
    }
    updateObject.bio = bio.trim();
  }

  updateObject.name = [req.agent?.first_name, req.agent?.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();
  updateObject.npn = req.agent?.npn || '';

  if (imageUrl !== undefined) {
    if (typeof imageUrl !== 'string') {
      return res.status(400).send({ message: 'Image URL must be text' });
    }
    updateObject.imageUrl = imageUrl.trim();
  }

  if (image !== undefined) {
    const imageTypes = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };
    const { data, contentType } = image || {};
    if (!imageTypes[contentType] || typeof data !== 'string') {
      return res.status(400).send({ message: 'Invalid image' });
    }
    const buffer = Buffer.from(data.split(',').pop(), 'base64');
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
      return res.status(400).send({ message: 'Image must be 2MB or smaller' });
    }
    let dimensions;
    try {
      dimensions = getImageDimensions(buffer, contentType);
    } catch {
      dimensions = null;
    }
    if (
      !dimensions ||
      dimensions.width !== dimensions.height ||
      dimensions.width > 400
    ) {
      return res
        .status(400)
        .send({ message: 'Image must be square and 400x400 or smaller' });
    }
    const credentials = JSON.parse(process.env.GSQ_SERVICE_ACCOUNT_KEY);
    const projectId = credentials.project_id;
    const bucketName = `${projectId}.firebasestorage.app`;
    const token = randomUUID();
    const filePath =
      `agent-profile-images/${email}/profile.${imageTypes[contentType]}`;
    const storage = new Storage({
      projectId,
      credentials,
    });
    await storage.bucket(bucketName).file(filePath).save(buffer, {
      resumable: false,
      contentType,
      metadata: { metadata: { firebaseStorageDownloadTokens: token } },
    });
    updateObject.imageUrl =
      `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/` +
      `${encodeURIComponent(filePath)}?alt=media&token=${token}`;
  }

  if (specialties !== undefined) {
    const allowedSpecialties = [
      'Final Expense',
      'Whole Life',
      'Term Life',
      'Indexed Universal Life',
    ];
    if (
      !Array.isArray(specialties) ||
      specialties.some((specialty) => !allowedSpecialties.includes(specialty))
    ) {
      return res.status(400).send({ message: 'Invalid specialties' });
    }
    updateObject.specialties = [...new Set(specialties)];
  }

  for (const integration of integrationUpdates) {
    if (integration.value !== undefined) {
      updateObject[integration.field] = integration.value;
    }
  }

  await ref.update(updateObject);
  res.status(200).send({ message: 'Agent account updated successfully' });
});

module.exports = gsqRouter;
