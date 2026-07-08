const { verify } = require("../auth/jwt");

// Reads the Bearer token and attaches req.user = { roleId, userId, name, username }
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "ต้องเข้าสู่ระบบก่อน" });
  try {
    req.user = verify(token);
    next();
  } catch {
    return res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}

// Restricts a route to certain role ids (admin/head/supply/officer/fine/exec)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.roleId)) {
      return res.status(403).json({ error: "ไม่มีสิทธิ์ดำเนินการนี้" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
