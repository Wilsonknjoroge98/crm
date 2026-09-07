const EMPTY_PREMIUM = Object.freeze({
  raw: null,
  min: null,
  max: null,
});

const AMOUNT_PATTERN = '\\$?\\s*(\\d+(?:\\.\\d+)?)';
const RANGE_PATTERN = new RegExp(
  `^${AMOUNT_PATTERN}\\s*[-–—]\\s*${AMOUNT_PATTERN}$`,
);
const SINGLE_AMOUNT_PATTERN = new RegExp(`^${AMOUNT_PATTERN}$`);
// Open-ended bucket, e.g. "100+": at least this much, no known ceiling.
const OPEN_ENDED_PATTERN = new RegExp(`^${AMOUNT_PATTERN}\\s*\\+$`);

const parsePremium = (value) => {
  if (value === null || value === undefined) {
    return { ...EMPTY_PREMIUM };
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0
      ? { raw: value, min: null, max: null }
      : { ...EMPTY_PREMIUM };
  }

  if (typeof value !== 'string') {
    return { ...EMPTY_PREMIUM };
  }

  const normalized = value.trim();
  if (!normalized) {
    return { ...EMPTY_PREMIUM };
  }

  const rangeMatch = normalized.match(RANGE_PATTERN);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);

    if (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min >= 0 &&
      min <= max
    ) {
      return { raw: null, min, max };
    }

    return { ...EMPTY_PREMIUM };
  }

  const openEndedMatch = normalized.match(OPEN_ENDED_PATTERN);
  if (openEndedMatch) {
    const min = Number(openEndedMatch[1]);
    return Number.isFinite(min) && min >= 0
      ? { raw: null, min, max: null }
      : { ...EMPTY_PREMIUM };
  }

  const singleMatch = normalized.match(SINGLE_AMOUNT_PATTERN);
  if (!singleMatch) {
    return { ...EMPTY_PREMIUM };
  }

  const raw = Number(singleMatch[1]);
  return Number.isFinite(raw) && raw >= 0
    ? { raw, min: null, max: null }
    : { ...EMPTY_PREMIUM };
};

module.exports = { parsePremium };
