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

// GET /api/public/track?etracking=...  (no auth; hides personal data — PDPA)
router.get("/track", async (req, res, next) => {
  try {
    const et = (req.query.etracking || "").trim();
    if (!et) return res.status(400).json({ error: "กรุณากรอกเลข E-tracking" });
    const [rows] = await pool.query("SELECT id FROM cases WHERE etracking = ? LIMIT 1", [et]);
    if (!rows.length) return res.json({ found: false });
    const c = await cases.getCaseById(rows[0].id);

    // Strip personal information — keep only status/progress fields
    const sanitized = {
      etracking: c.etracking,
      status: c.status,
      postDate: c.postDate,
      laws: c.laws,
      assignedAt: c.assignedAt,
      investigation: {
        siteVisitDate: c.investigation.siteVisitDate,
        meetingDate: c.investigation.meetingDate,
      },
      board: c.board ? { meetingDate: c.board.meetingDate } : null,
      fines: c.fines.map((f) => ({ paid: f.paid, paidDate: f.paidDate })),
      timeline: c.timeline.map((t) => ({ date: t.date })),
    };
    res.json({ found: true, case: sanitized });
  } catch (e) { next(e); }
});

module.exports = router;
