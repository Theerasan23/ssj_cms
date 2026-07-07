// Tiny dependency-free in-memory rate limiter (single-instance dev/small deployments).
// Counts requests per key within a sliding window; blocks over the limit with 429.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message = "คำขอมากเกินไป กรุณาลองใหม่ภายหลัง" } = {}) {
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

  return function (req, res, next) {
    const key = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) {
      const retryMs = windowMs - (now - arr[0]);
      res.set("Retry-After", String(Math.ceil(retryMs / 1000)));
      return res.status(429).json({ error: message });
    }
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}

module.exports = { rateLimit };
