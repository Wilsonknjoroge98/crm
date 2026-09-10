const express = require('express');
const busboy = require('busboy');
const {
  agentInitials,
  buildPublishedAdName,
  buildUrlTags,
  filenameToAdName,
} = require('../adNaming');
const {
  createMetaMarketingClient,
} = require('../integrations/metaMarketing');

const ALLOWED_ROLES = ['admin', 'owner'];
const MAX_TOTAL_DAILY_BUDGET_CENTS = 50000;

const requirePublishingRole = (req, res, next) => {
  if (!ALLOWED_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

const parseMultipart = (req, res, next) => {
  let parser;
  try {
    parser = busboy({ headers: req.headers });
  } catch {
    return res.status(400).json({ error: 'Invalid multipart request' });
  }

  const fields = {};
  const files = [];
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    res.status(400).json({ error: 'Invalid multipart request' });
  };

  parser.on('field', (field, value) => {
    fields[field] = value;
  });
  parser.on('file', (field, stream, { filename, mimeType }) => {
    if (field !== 'assets') {
      stream.resume();
      return;
    }

    const file = { originalname: filename, mimetype: mimeType };
    const chunks = [];
    files.push(file);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => {
      file.buffer = Buffer.concat(chunks);
    });
    stream.on('error', fail);
  });
  parser.on('error', fail);
  parser.on('finish', () => {
    if (failed) return;
    req.body = fields;
    req.files = files;
    next();
  });

  if (Buffer.isBuffer(req.rawBody)) parser.end(req.rawBody);
  else req.pipe(parser);
  return undefined;
};

const parseDailyBudgetCents = (value) => {
  const dollars = String(value ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(dollars)) {
    throw new Error('Daily budget must be a positive dollar amount');
  }

  const [whole, fraction = ''] = dollars.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error('Daily budget must be a positive dollar amount');
  }
  return cents;
};

const parseAssetMetadata = (rawMetadata, files, agent) => {
  let metadata;
  try {
    metadata = JSON.parse(rawMetadata);
  } catch {
    throw new Error('assetMetadata must be valid JSON');
  }

  if (!Array.isArray(metadata) || metadata.length !== files.length) {
    throw new Error('assetMetadata must contain one entry per asset');
  }

  const defaultInitials = agentInitials(agent);
  return metadata.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error(`Invalid metadata for asset ${index + 1}`);
    }

    const adName = String(
      item.adName === undefined
        ? filenameToAdName(files[index].originalname)
        : item.adName,
    ).trim();
    const initials = String(
      item.initials === undefined ? defaultInitials : item.initials,
    )
      .trim()
      .toUpperCase();

    if (!adName) throw new Error(`Asset ${index + 1} is missing adName`);
    if (!initials) throw new Error(`Asset ${index + 1} is missing initials`);

    return { adName, initials };
  });
};

const parsePublishRequest = (req) => {
  const files = req.files || [];
  if (files.length === 0) throw new Error('At least one asset is required');
  if (
    files.some(
      ({ mimetype }) =>
        !mimetype.startsWith('image/') && !mimetype.startsWith('video/'),
    )
  ) {
    throw new Error('Only image and video assets are supported');
  }

  const dailyBudgetCents = parseDailyBudgetCents(req.body.dailyBudget);
  if (files.length * dailyBudgetCents > MAX_TOTAL_DAILY_BUDGET_CENTS) {
    throw new Error('Total daily budget cannot exceed $500');
  }

  return {
    files,
    dailyBudgetCents,
    metadata: parseAssetMetadata(req.body.assetMetadata, files, req.agent),
  };
};

const errorMessage = (error) =>
  error?.response?.data?.error?.error_user_msg ||
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  'Meta publishing failed';

const publishAsset = async ({
  client,
  file,
  metadata,
  dailyBudgetCents,
  publishedAt,
}) => {
  try {
    const name = buildPublishedAdName({
      initials: metadata.initials,
      adName: metadata.adName,
      publishedAt,
    });
    const urlTags = buildUrlTags({
      filename: file.originalname,
      publishedAt,
    });

    let uploadResult;
    if (file.mimetype.startsWith('image/')) {
      uploadResult = await client.uploadImage({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
      });
    } else {
      uploadResult = await client.uploadVideo({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
      });
    }

    const { adSetId } = await client.createAdSet({ name, dailyBudgetCents });

    const { creativeId } = await client.createAdCreative({
      name,
      imageHash: uploadResult.imageHash,
      videoId: uploadResult.videoId,
      videoThumbnailUrl: uploadResult.thumbnailUrl,
      urlTags,
    });

    const { adId } = await client.createAd({ name, adSetId, creativeId });

    return {
      filename: file.originalname,
      success: true,
      imageHash: uploadResult.imageHash,
      videoId: uploadResult.videoId,
      adSetId,
      creativeId,
      adId,
    };
  } catch (error) {
    return {
      filename: file.originalname,
      success: false,
      error: errorMessage(error),
    };
  }
};

const createAdPublishRouter = ({
  createClient = createMetaMarketingClient,
} = {}) => {
  // eslint-disable-next-line new-cap
  const router = express.Router();

  router.post(
    '/',
    requirePublishingRole,
    parseMultipart,
    async (req, res) => {
      let request;
      try {
        request = parsePublishRequest(req);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      const client = createClient();
      const publishedAt = new Date();
      const results = await Promise.all(
        request.files.map((file, index) =>
          publishAsset({
            client,
            file,
            metadata: request.metadata[index],
            dailyBudgetCents: request.dailyBudgetCents,
            publishedAt,
          }),
        ),
      );

      return res.status(200).json(results);
    },
  );

  return router;
};

module.exports = {
  createAdPublishRouter,
};
