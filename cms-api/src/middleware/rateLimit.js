// Tiny dependency-free in-memory rate limiter (single-instance dev/small deployments).
// Counts requests per key within a sliding window; blocks over the limit with 429.
//
// options:
//   keyFn          — derive the bucket key from the request (default: client IP)
//   skipSuccessful — only count responses with status >= 400. Use this for login so a
//                    user who signs in normally never spends their own budget; without
//                    it, ten successful logins lock the bucket out for the whole window.
function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = "คำขอมากเกินไป กรุณาลองใหม่ภายหลัง",
  keyFn = null,
  skipSuccessful = false,
} = {}) {
  const hits = new Map(); // key → [timestamps]

  // periodic cleanup so the map doesn't grow unbounded
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, arr] of hits) {
      const kept = arr.filter((t) => now - t < windowMs);
      if (kept.length) hits.set(key, kept); else hits.delete(key);
    }
  }, windowMs);
  if (timer.unref) timer.unref();

  const record = (key) => {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(key, arr);
  };

  return function (req, res, next) {
    const fallback = req.ip || req.connection?.remoteAddress || "unknown";
    const key = keyFn ? keyFn(req) : fallback;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      const retryMs = windowMs - (now - arr[0]);
      res.set("Retry-After", String(Math.ceil(retryMs / 1000)));
      return res.status(429).json({ error: message });
    }
    if (skipSuccessful) res.on("finish", () => { if (res.statusCode >= 400) record(key); });
    else record(key);
    next();
  };
}

module.exports = { rateLimit };
