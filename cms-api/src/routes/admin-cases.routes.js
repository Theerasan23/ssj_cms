const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const caseDelete = require("../services/case-delete.service");

// หน้า ตั้งค่าระบบ → ลบเคส (admin เท่านั้น)
const router = express.Router();
router.use(requireAuth, requireRole("admin"));

// GET /api/admin/cases — ทุกเคสในระบบ (รวมร่างของทุกคน) แบบสรุป สำหรับเลือกลบ
router.get("/", async (req, res, next) => {
  try {
    res.json(await caseDelete.listLiveCases());
  } catch (e) { next(e); }
});

// GET /api/admin/cases/deleted — เคสที่ลบแล้ว (ตาราง temp_case)
router.get("/deleted", async (req, res, next) => {
  try {
    res.json(await caseDelete.listDeletedCases());
  } catch (e) { next(e); }
});

// DELETE /api/admin/cases/:id { reason } — ย้ายเคสไป temp_case แล้วลบออกจากระบบ
router.delete("/:id", async (req, res, next) => {
  try {
    res.json(await caseDelete.deleteCase(req.params.id, (req.body || {}).reason, req.user));
  } catch (e) { next(e); }
});

module.exports = router;
