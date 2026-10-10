// Shared helpers for the serverless functions. The leading underscore keeps
// Vercel from exposing this file as a route.

const buckets = new Map();

// Best-effort, in-memory rate limiting. Serverless instances are ephemeral, so
// this only slows down casual abuse; set a spend limit on the OpenAI key too.
function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
  }
  let bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    bucket = { count: 0, reset: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Browsers always send Origin on cross-site POSTs; reject any that isn't us.
function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

// Returns true if the request may proceed; otherwise it has already responded.
function guard(req, res, { bucket, limit, windowMs }) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    send(res, 405, { error: 'Method not allowed.' });
    return false;
  }
  if (!isSameOrigin(req)) {
    send(res, 403, { error: 'Forbidden.' });
    return false;
  }
  if (!rateLimit(`${bucket}:${clientIp(req)}`, limit, windowMs)) {
    send(res, 429, { error: 'Too many requests. Please wait a moment and try again.' });
    return false;
  }
  return true;
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

module.exports = { guard, parseBody, send };
