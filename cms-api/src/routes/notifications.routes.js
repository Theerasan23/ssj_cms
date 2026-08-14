const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications — strictly this user's own rows.
// There is deliberately no "OR recipient_user_id IS NULL" fallback: a row without a
// recipient would be shown to everyone, and marking it read would mark it read for
// everyone. Notifications are per-person.
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, icon, title, time_text AS time, created_at AS createdAt, unread, case_id AS caseId
       FROM notifications
       WHERE recipient_user_id = ?
       ORDER BY created_at DESC, ord DESC, id DESC LIMIT 30`,
      [req.user.userId]
    );
    res.json(rows.map((n) => ({ ...n, unread: !!n.unread })));
  } catch (e) { next(e); }
});

// POST /api/notifications/:id/read — mark a single notification read.
// Scoped by recipient so one user can never mark another user's row read.
router.post("/:id/read", async (req, res, next) => {
  try {
    const [r] = await pool.query(
      "UPDATE notifications SET unread = 0 WHERE id = ? AND recipient_user_id = ?",
      [req.params.id, req.user.userId]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: "ไม่พบการแจ้งเตือน" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/notifications/read-all — mark only this user's notifications read
router.post("/read-all", async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE notifications SET unread = 0 WHERE recipient_user_id = ?",
      [req.user.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
