const axios = require('axios');
const { getMetaPublishingConfig } = require('../config/metaPublishing');

const DEFAULT_VIDEO_POLL_INTERVAL_MS = 5000;
const DEFAULT_VIDEO_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const DEFAULT_TARGETING = {
  geo_locations: { countries: ['US'] },
};

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

  const makeRequest = async ({
    method,
    path,
    data,
    params,
    headers,
  }) => {
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

  const uploadVideo = async ({
    buffer,
    filename,
    mimeType,
    pollOptions,
  }) => {
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

  const createAdCreative = async ({
    name,
    imageHash,
    videoId,
    videoThumbnailUrl,
    primaryText,
    headline,
    description,
    urlTags,
  }) => {
    if (Boolean(imageHash) === Boolean(videoId)) {
      throw new TypeError('Exactly one of imageHash or videoId is required');
    }
    if (videoId && !videoThumbnailUrl) {
      throw new TypeError('videoThumbnailUrl is required for video creatives');
    }

    const callToAction = {
      type: 'LEARN_MORE',
      value: { link: config.destinationUrl },
    };
    const commonCreative = {
      message: requireText(primaryText, 'primaryText'),
      call_to_action: callToAction,
    };
    const objectStorySpec = imageHash
      ? {
          page_id: config.pageId,
          link_data: {
            ...commonCreative,
            image_hash: String(imageHash),
            link: config.destinationUrl,
            name: requireText(headline, 'headline'),
            description: requireText(description, 'description'),
          },
        }
      : {
          page_id: config.pageId,
          video_data: {
            ...commonCreative,
            video_id: String(videoId),
            image_url: requireText(videoThumbnailUrl, 'videoThumbnailUrl'),
            title: requireText(headline, 'headline'),
            link_description: requireText(description, 'description'),
          },
        };

    const data = await makeRequest({
      method: 'POST',
      path: `${adAccountPath}/adcreatives`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      data: toFormBody({
        name: requireText(name, 'name'),
        object_story_spec: objectStorySpec,
        url_tags: requireText(urlTags, 'urlTags'),
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
