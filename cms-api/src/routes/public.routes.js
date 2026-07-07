const express = require("express");
const pool = require("../db");
const cases = require("../services/cases.service");
const sla = require("../services/sla.service");

const router = express.Router();

// GET /api/public/stats  (no auth) — aggregate numbers for the login page, no case data
router.get("/stats", async (req, res, next) => {
  try {
    const all = await cases.getAllCases();
    const total = all.length;
    const onTime = all.filter((c) => sla.caseSla(c).kind !== "overdue").length;
    const [statusRows] = await pool.query("SELECT COUNT(*) AS n FROM statuses");
    res.json({
      totalCases: total,
      onTimePercent: total ? Math.round((onTime / total) * 100) : 100,
      statusCount: statusRows[0].n,
    });
  } catch (e) { next(e); }
});

// (public tracking endpoint removed 2026-07 — the /track page was retired)

module.exports = router;
