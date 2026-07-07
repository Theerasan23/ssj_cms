const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/notifications — only this user's notifications (+ legacy broadcast rows)
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, icon, title, time_text AS time, unread, case_id AS caseId
       FROM notifications
       WHERE recipient_user_id = ? OR recipient_user_id IS NULL
       ORDER BY ord DESC, id DESC LIMIT 30`,
      [req.user.userId]
    );
    res.json(rows.map((n) => ({ ...n, unread: !!n.unread })));
  } catch (e) { next(e); }
});

// POST /api/notifications/read-all — mark only this user's notifications read
router.post("/read-all", async (req, res, next) => {
  try {
    await pool.query(
      "UPDATE notifications SET unread = 0 WHERE recipient_user_id = ? OR recipient_user_id IS NULL",
      [req.user.userId]
    );
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
