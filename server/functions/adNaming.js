const PUBLISH_TIME_ZONE = 'America/Los_Angeles';

const filenameStem = (filename) =>
  String(filename || '')
    .trim()
    .split(/[\\/]/)
    .pop()
    .replace(/\.[^.]*$/, '');

const filenameToAdName = (filename) => {
  const name = filenameStem(filename)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name) throw new Error('Filename must include an ad name');
  return name.replace(
    /\S+/g,
    (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
  );
};

const formatPublishDate = (publishedAt = new Date()) => {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: PUBLISH_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(publishedAt));
  const [month, day, year] = formatted.split('/');

  return {
    display: `${day}/${month}/${year}`,
    slug: `${month}_${day}_${year}`,
  };
};

const filenameToAdSlug = (filename, publishedAt = new Date()) => {
  const slug = filenameStem(filename)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!slug) throw new Error('Filename must include an ad slug');
  return `${slug}_${formatPublishDate(publishedAt).slug}`;
};

const agentInitials = (agent = {}) =>
  [agent.first_name, agent.last_name]
    .map((name) => String(name || '').trim().charAt(0).toUpperCase())
    .join('');

const buildPublishedAdName = ({ initials, adName, publishedAt = new Date() }) =>
  `${String(initials || '').trim().toUpperCase()} | ` +
  `${String(adName || '').trim()} | ${formatPublishDate(publishedAt).display}`;

const buildUrlTags = ({ filename, publishedAt = new Date() }) => {
  const slug = filenameToAdSlug(filename, publishedAt);
  return `ad=${slug}&fbc_id={{adset.id}}&h_ad_id={{ad.id}}`;
};

module.exports = {
  agentInitials,
  buildPublishedAdName,
  buildUrlTags,
  filenameToAdName,
  filenameToAdSlug,
  formatPublishDate,
};
