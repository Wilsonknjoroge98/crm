// A small per-caller rate limit for routes anyone can reach without signing
// in. Counts live in this instance's memory, so with several instances
// running a caller can get a few more through than `max`; it is here to
// stop one address hammering a route, not to be an exact quota. Routes that
// write to the database add their own shared cap on top (see the hourly cap
// in endpoints/access_requests.js).

// Above this many tracked callers, finished windows are swept out.
const SWEEP_AT = 5000;

// The caller's address. Google's front end appends the address it saw to
// X-Forwarded-For, so the last entry is the one a caller can't forge; the
// earlier entries are whatever the caller sent.
const callerOf = (req) => {
  const forwarded = req.headers?.['x-forwarded-for'];
  const last =
    typeof forwarded === 'string' ? forwarded.split(',').pop().trim() : '';
  return last || req.ip || req.socket?.remoteAddress || 'unknown';
};

// Allows `max` requests per caller in each `windowMs`, then answers 429 with
// a Retry-After header until the window ends.
const createRateLimiter = ({ windowMs, max, now = () => Date.now() }) => {
  const windows = new Map(); // caller -> { count, resetAt }

  return (req, res, next) => {
    const time = now();
    if (windows.size > SWEEP_AT) {
      for (const [key, entry] of windows) {
        if (entry.resetAt <= time) windows.delete(key);
      }
    }

    const caller = callerOf(req);
    let entry = windows.get(caller);
    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowMs };
      windows.set(caller, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - time) / 1000)));
      return res
        .status(429)
        .json({
          error: 'Too many requests. Please try again in a few minutes.',
        });
    }
    return next();
  };
};

module.exports = { createRateLimiter, callerOf };
