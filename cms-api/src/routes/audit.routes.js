const express = require("express");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/audit — recent activity, derived from real case timelines
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.date, t.time, t.user_name AS who, t.title AS what, COALESCE(c.etracking, c.title) AS target
       FROM case_timeline t JOIN cases c ON c.id = t.case_id
       ORDER BY t.date DESC, t.id DESC LIMIT 40`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
