const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../db");
const { sign } = require("../auth/jwt");
const { requireAuth } = require("../middleware/auth");
const { rateLimit } = require("../middleware/rateLimit");

const router = express.Router();

// Throttle login to slow credential brute-forcing: max 10 attempts / 15 min / IP.
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่" });

const USER_SELECT = `
  SELECT u.id, u.username, u.role_id, u.name, u.initials, u.email, u.phone, u.active,
         r.name AS role_name, r.role_label, r.initials AS role_initials, r.descr
  FROM users u JOIN roles r ON r.id = u.role_id
`;

function mapUser(u) {
  return {
    roleId: u.role_id,
    userId: u.id,
    name: u.name || u.role_name,
    role: u.role_label,
    initials: u.initials || u.role_initials,
    desc: u.descr,
    username: u.username,
    email: u.email || "",
    phone: u.phone || "",
    active: !!u.active,
  };
}

async function userById(id) {
  const [rows] = await pool.query(`${USER_SELECT} WHERE u.id = ?`, [id]);
  return rows.length ? mapUser(rows[0]) : null;
}

// POST /api/auth/login { username, password }
router.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "กรุณากรอก username และ password" });
    const [rows] = await pool.query("SELECT id, password_hash, active FROM users WHERE username = ?", [username]);
    if (!rows.length) return res.status(401).json({ error: "username หรือ password ไม่ถูกต้อง" });
    if (!rows[0].active) return res.status(403).json({ error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ" });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: "username หรือ password ไม่ถูกต้อง" });
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = ?", [rows[0].id]);
    const user = await userById(rows[0].id);
    res.json({ token: sign(user), user });
  } catch (e) { next(e); }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await userById(req.user.userId);
    if (!user) return res.status(401).json({ error: "ไม่พบผู้ใช้" });
    if (!user.active) return res.status(403).json({ error: "บัญชีถูกปิดใช้งาน" });
    res.json({ user });
  } catch (e) { next(e); }
});

module.exports = router;
