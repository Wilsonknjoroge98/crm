const axios = require('axios');
const { getMetaPublishingConfig } = require('../config/metaPublishing');
const { META_REGION_KEYS } = require('../shared/constants/meta_region_keys');

const DEFAULT_VIDEO_POLL_INTERVAL_MS = 5000;
const DEFAULT_VIDEO_POLL_TIMEOUT_MS = 5 * 60 * 1000;

// We advertise everywhere in the US except New York, matching the bulk
// upload workflow's state exclusion. The testing campaign is a Special Ad
// Category, which rejects excluded_geo_locations entirely (#2909046), so we
// target every state's region key directly instead of excluding NY from a
// country-wide target.
const DEFAULT_TARGETING = {
  geo_locations: {
    regions: Object.entries(META_REGION_KEYS)
      .filter(([state]) => state !== 'New York')
      .map(([name, key]) => ({ key, name })),
  },
};

// These tests only vary the image/video creative — copy is fixed so Meta's
// dynamic creative optimization is isolating the asset, not the text.
// Replace with approved, compliant final-expense ad copy before publishing.
const CREATIVE_COPY = Object.freeze({
  primaryTexts: [
    'Seniors are discovering a better way to compare life insurance rates. ' +
      'GetSeniorQuotes shows real quotes side-by-side.',
    'Many seniors just want to see what life insurance costs, without the ' +
      'constant calls. GetSeniorQuotes makes it easy to compare real ' +
      'quotes online',
  ],
  headlines: [
    'Compare 100+ Carriers',
    'Life Insurance Made Simple',
    'No Doctors, No Exam, No Hassle',
  ],
  descriptions: [],
});

const requireText = (value, field) => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
};

const requireId = (data, operation) => {
  if (!data?.id) {
    throw new Error(`Meta ${operation} response did not include an ID`);
  }
  return String(data.id);
};

const toFormBody = (values) => {
  const body = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    body.set(
      key,
      typeof value === 'object' ? JSON.stringify(value) : String(value),
    );
  });
  return body;
};

const createFileForm = ({ field, buffer, filename, mimeType }) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new TypeError('A non-empty file buffer is required');
  }

  const form = new FormData();
  form.append(
    field,
    new Blob([buffer], { type: mimeType || 'application/octet-stream' }),
    requireText(filename, 'filename'),
  );
  return form;
};

const createMetaMarketingClient = ({
  config = getMetaPublishingConfig(),
  request = axios.request.bind(axios),
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  now = () => Date.now(),
} = {}) => {
  const graphUrl = `https://graph.facebook.com/${config.graphApiVersion}`;
  const adAccountPath = `act_${config.adAccountId}`;

  const makeRequest = async ({ method, path, data, params, headers }) => {
    const response = await request({
      method,
      url: `${graphUrl}/${path}`,
      data,
      headers,
      params: {
        ...params,
        access_token: config.accessToken,
      },
    });
    return response.data;
  };

  const uploadImage = async ({ buffer, filename, mimeType }) => {
    const form = createFileForm({
      field: 'filename',
      buffer,
      filename,
      mimeType,
    });
    const data = await makeRequest({
      method: 'POST',
      path: `${adAccountPath}/adimages`,
      data: form,
    });
    const image = Object.values(data?.images || {})[0];

    if (!image?.hash) {
      throw new Error(
        'Meta image upload response did not include an image hash',
      );
    }

    return { imageHash: String(image.hash) };
  };

  const getVideoStatus = async (videoId) => {
    const data = await makeRequest({
      method: 'GET',
      path: requireText(String(videoId || ''), 'videoId'),
      params: { fields: 'status,thumbnails{uri,is_preferred}' },
    });
    const status = data?.status?.video_status;

    if (!status) {
      throw new Error(
        'Meta video status response did not include video_status',
      );
    }

    const thumbnails = data?.thumbnails?.data || [];
    const preferredThumbnail = thumbnails.find((item) => item.is_preferred);

    return {
      status,
      thumbnailUrl: preferredThumbnail?.uri || thumbnails[0]?.uri || null,
    };
  };

  const pollVideoUntilReady = async (
    videoId,
    {
      intervalMs = DEFAULT_VIDEO_POLL_INTERVAL_MS,
      timeoutMs = DEFAULT_VIDEO_POLL_TIMEOUT_MS,
    } = {},
  ) => {
    const startedAt = now();
    const inProgressStatuses = ['uploading', 'processing'];
    let status = 'uploading';

    while (inProgressStatuses.includes(status)) {
      const videoState = await getVideoStatus(videoId);
      status = videoState.status;
      if (videoState.status === 'ready') {
        if (!videoState.thumbnailUrl) {
          throw new Error('Meta video response did not include a thumbnail');
        }
        return videoState;
      }

      if (!inProgressStatuses.includes(videoState.status)) {
        throw new Error(
          `Meta video processing failed with status: ${videoState.status}`,
        );
      }
      if (now() - startedAt >= timeoutMs) {
        throw new Error('Meta video processing timed out');
      }
      await sleep(intervalMs);
    }
  };

  const uploadVideo = async ({ buffer, filename, mimeType, pollOptions }) => {
    const form = createFileForm({
      field: 'source',
      buffer,
      filename,
      mimeType,
    });
    const data = await makeRequest({
      method: 'POST',
      path: `${adAccountPath}/advideos`,
      data: form,
    });
    const videoId = requireId(data, 'upload_video');
    const videoState = await pollVideoUntilReady(videoId, pollOptions);
    return { videoId, ...videoState };
  };

  const createAdSet = async ({
    name,
    dailyBudgetCents,
    targeting = DEFAULT_TARGETING,
  }) => {
    if (!Number.isInteger(dailyBudgetCents) || dailyBudgetCents <= 0) {
      throw new TypeError('dailyBudgetCents must be a positive integer');
    }

    const data = await makeRequest({
      method: 'POST',
      path: `${adAccountPath}/adsets`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: toFormBody({
        name: requireText(name, 'name'),
        campaign_id: config.testingCampaignId,
        daily_budget: dailyBudgetCents,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        is_dynamic_creative: true,
        targeting,
        promoted_object: {
          pixel_id: config.pixelId,
          custom_event_type: 'OTHER',
          custom_event_str: 'TextVerified',
        },
        status: 'PAUSED',
      }),
    });
    return { adSetId: requireId(data, 'create_ad_set') };
  };

  const uploadImageFromUrl = async (url) => {
    const response = await request({
      method: 'GET',
      url,
      responseType: 'arraybuffer',
    });
    return uploadImage({
      buffer: Buffer.from(response.data),
      filename: 'video-thumbnail.jpg',
      mimeType: response.headers?.['content-type'] || 'image/jpeg',
    });
  };

  const createAdCreative = async ({
    name,
    imageHash,
    videoId,
    videoThumbnailUrl,
    urlTags,
  }) => {
    if (Boolean(imageHash) === Boolean(videoId)) {
      throw new TypeError('Exactly one of imageHash or videoId is required');
    }
    if (videoId && !videoThumbnailUrl) {
      throw new TypeError('videoThumbnailUrl is required for video creatives');
    }

    const assetFeedSpec = {
      bodies: CREATIVE_COPY.primaryTexts.map((text) => ({ text })),
      titles: CREATIVE_COPY.headlines.map((text) => ({ text })),
      descriptions: CREATIVE_COPY.descriptions.map((text) => ({ text })),
      link_urls: [{ website_url: config.destinationUrl }],
      call_to_action_types: ['GET_QUOTE'],
      ad_formats: [imageHash ? 'SINGLE_IMAGE' : 'SINGLE_VIDEO'],
    };

    if (imageHash) {
      assetFeedSpec.images = [{ hash: String(imageHash) }];
    } else {
      const { imageHash: thumbnailHash } =
        await uploadImageFromUrl(videoThumbnailUrl);
      assetFeedSpec.videos = [
        { video_id: String(videoId), thumbnail_hash: thumbnailHash },
      ];
    }

    const data = await makeRequest({
      method: 'POST',
      path: `${adAccountPath}/adcreatives`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: toFormBody({
        name: requireText(name, 'name'),
        object_story_spec: {
          page_id: config.pageId,
          // instagram_user_id: config.instagramUserId,
        },
        asset_feed_spec: assetFeedSpec,
        url_tags: requireText(urlTags, 'urlTags'),
        contextual_multi_ads: { enroll_status: 'OPT_OUT' },
      }),
    });
    return { creativeId: requireId(data, 'create_ad_creative') };
  };

  const createAd = async ({ name, adSetId, creativeId }) => {
    const data = await makeRequest({
      method: 'POST',
      path: `${adAccountPath}/ads`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: toFormBody({
        name: requireText(name, 'name'),
        adset_id: requireText(String(adSetId || ''), 'adSetId'),
        creative: {
          creative_id: requireText(String(creativeId || ''), 'creativeId'),
        },
        status: 'PAUSED',
      }),
    });
    return { adId: requireId(data, 'create_ad') };
  };

  return {
    uploadImage,
    uploadVideo,
    getVideoStatus,
    pollVideoUntilReady,
    createAdSet,
    createAdCreative,
    createAd,
  };
};

module.exports = {
  DEFAULT_TARGETING,
  DEFAULT_VIDEO_POLL_INTERVAL_MS,
  DEFAULT_VIDEO_POLL_TIMEOUT_MS,
  createMetaMarketingClient,
};
