const META_GRAPH_API_VERSION = 'v26.0';

const META_PUBLISHING_ENV = Object.freeze({
  accessToken: 'META_MARKETING_ACCESS_TOKEN',
  adAccountId: 'META_PUBLISHING_AD_ACCOUNT_ID',
  pageId: 'META_PAGE_ID',
  testingCampaignId: 'META_TESTING_CAMPAIGN_ID',
  pixelId: 'META_PIXEL_ID',
  destinationUrl: 'META_DESTINATION_URL',
});

const requireEnv = (name, env = process.env) => {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const getMetaPublishingConfig = (env = process.env) => {
  return Object.freeze({
    accessToken: requireEnv(META_PUBLISHING_ENV.accessToken, env),
    adAccountId: requireEnv(META_PUBLISHING_ENV.adAccountId, env).replace(
      /^act_/,
      '',
    ),
    pageId: requireEnv(META_PUBLISHING_ENV.pageId, env),
    testingCampaignId: requireEnv(
      META_PUBLISHING_ENV.testingCampaignId,
      env,
    ),
    pixelId: requireEnv(META_PUBLISHING_ENV.pixelId, env),
    destinationUrl: requireEnv(META_PUBLISHING_ENV.destinationUrl, env),
    graphApiVersion: META_GRAPH_API_VERSION,
  });
};

module.exports = {
  META_GRAPH_API_VERSION,
  META_PUBLISHING_ENV,
  getMetaPublishingConfig,
  requireEnv,
};
