const express = require("express");
const multer = require("multer");
const { requireAuth, requireRole } = require("../middleware/auth");
const cases = require("../services/cases.service");
const attachments = require("../services/attachments.service");

const router = express.Router();
router.use(requireAuth);

// In-memory upload (files are written to disk by the service). 20 MB/file, 10 files/request.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: attachments.MAX_BYTES, files: 10 },
  fileFilter: (req, file, cb) => cb(null, attachments.ALLOWED_MIME.has(file.mimetype)),
});

function asArray(v) {
  if (!v) return [];
  return Array.isArray(v) ? v : String(v).split(",").map((s) => s.trim()).filter(Boolean);
}

// Workflow writes are restricted to head/admin or the case creator.
async function requireCaseActor(req, res, next) {
  try {
    const c = await cases.getCaseById(req.params.id);
    if (!c) return res.status(404).json({ error: "ไม่พบเคส" });
    if (!["head", "admin"].includes(req.user.roleId) && c.createdByUserId !== req.user.userId) {
      return res.status(403).json({ error: "เฉพาะหัวหน้า แอดมิน หรือเจ้าหน้าที่ผู้สร้างเคสเท่านั้น" });
    }
    next();
  } catch (e) { next(e); }
}

// GET /api/cases — list with filters
router.get("/", async (req, res, next) => {
  try {
    const filters = {
      q: req.query.q || "",
      status: asArray(req.query.status),
      law: asArray(req.query.law),
      slaFilter: req.query.sla || "",
      scope: req.query.scope || "all",
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
    };
    const currentRole = { id: req.user.roleId, userId: req.user.userId, officerId: req.user.officerId };
    res.json(await cases.listCases(filters, currentRole));
  } catch (e) { next(e); }
});

// GET /api/cases/:id
router.get("/:id", async (req, res, next) => {
  try {
    const c = await cases.getCaseById(req.params.id);
    if (!c) return res.status(404).json({ error: "ไม่พบเคส" });
    // drafts are private to their creator (admin may see them too)
    if (c.isDraft && c.createdByUserId !== req.user.userId && req.user.roleId !== "admin") {
      return res.status(404).json({ error: "ไม่พบเคส" });
    }
    res.json(c);
  } catch (e) { next(e); }
});

// POST /api/cases — create (officer/head/admin)
router.post("/", requireRole("officer", "head", "admin"), async (req, res, next) => {
  try {
    const id = await cases.createCase(req.body || {}, req.user);
    const c = await cases.getCaseById(id);
    res.status(201).json(c);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") { e.status = 409; e.message = "เลข E-tracking นี้มีในระบบแล้ว"; }
    next(e);
  }
});

// PATCH /api/cases/:id — edit a pending case (creator or head/admin)
router.patch("/:id", requireRole("officer", "head", "admin"), async (req, res, next) => {
  try {
    res.json(await cases.updateCase(req.params.id, req.body || {}, req.user));
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") { e.status = 409; e.message = "เลข E-tracking นี้มีในระบบแล้ว"; }
    next(e);
  }
});

// POST /api/cases/:id/assign (head/admin)
router.post("/:id/assign", requireRole("head", "admin"), async (req, res, next) => {
  try {
    const { officerIds = [], note = "" } = req.body || {};
    if (!officerIds.length) return res.status(400).json({ error: "กรุณาเลือกเจ้าหน้าที่อย่างน้อย 1 คน" });
    res.json(await cases.assignCase(req.params.id, officerIds, req.user.roleId, req.user.name, note));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/reassign (head/admin) — change officers on an active case, status unchanged
router.post("/:id/reassign", requireRole("head", "admin"), async (req, res, next) => {
  try {
    const { officerIds = [], note = "" } = req.body || {};
    if (!officerIds.length) return res.status(400).json({ error: "กรุณาเลือกเจ้าหน้าที่อย่างน้อย 1 คน" });
    res.json(await cases.reassignCase(req.params.id, officerIds, req.user.roleId, req.user.name, note));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/investigation  (legacy single save)
router.post("/:id/investigation", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    res.json(await cases.saveInvestigation(req.params.id, req.body || {}, req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/investigation/event  { kind: 'site'|'meeting', date, place, result }
router.post("/:id/investigation/event", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    res.json(await cases.addInvestigationEvent(req.params.id, req.body || {}, req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/decision { path }
router.post("/:id/decision", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    res.json(await cases.decision(req.params.id, (req.body || {}).path, req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/board
router.post("/:id/board", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    res.json(await cases.saveBoard(req.params.id, req.body || {}, req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/board/apply — apply the latest resolution (move case forward)
router.post("/:id/board/apply", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    res.json(await cases.applyBoardResolution(req.params.id, req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/payment { fineId, paidDate, amount } — amount may be partial
router.post("/:id/payment", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    const { fineId, paidDate, amount } = req.body || {};
    if (!fineId || !paidDate || amount == null) return res.status(400).json({ error: "ข้อมูลการชำระไม่ครบ" });
    res.json(await cases.savePayment(req.params.id, fineId, paidDate, Number(amount), req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/followup { date, destination, detail } — repeatable record for 06/07/09
router.post("/:id/followup", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    res.json(await cases.addFollowup(req.params.id, req.body || {}, req.user));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/close — 04 (ค่าปรับครบ) → 05; follow-up statuses 06/07/09 → explicit close
router.post("/:id/close", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    const c = await cases.getCaseById(req.params.id);
    if (c && ["06", "07", "09"].includes(c.status)) {
      res.json(await cases.closeFollowupCase(req.params.id, req.user));
    } else {
      res.json(await cases.closeFineCase(req.params.id, req.user.name));
    }
  } catch (e) { next(e); }
});

// POST /api/cases/:id/cancel { reason }  (head/admin) → status 08
router.post("/:id/cancel", requireRole("head", "admin"), async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    res.json(await cases.cancelCase(req.params.id, reason, req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/unlock  (admin only) → lift the SLA lock
router.post("/:id/unlock", requireRole("admin"), async (req, res, next) => {
  try {
    res.json(await cases.unlockCase(req.params.id, req.user.name));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/submit — creator submits a draft for head approval
router.post("/:id/submit", requireRole("officer", "head", "admin"), async (req, res, next) => {
  try {
    res.json(await cases.submitCase(req.params.id, req.user));
  } catch (e) { next(e); }
});

// POST /api/cases/:id/return { reason }  (head/admin) → send back to officer to fix
router.post("/:id/return", requireRole("head", "admin"), async (req, res, next) => {
  try {
    res.json(await cases.returnCase(req.params.id, (req.body || {}).reason, req.user));
  } catch (e) { next(e); }
});

// ---- Attachments ----
// POST /api/cases/:id/attachments  (multipart "files") — upload real files
router.post("/:id/attachments", requireRole("officer", "head", "admin"), requireCaseActor, upload.array("files", 10), async (req, res, next) => {
  try {
    await cases.getCaseById(req.params.id).then((c) => { if (!c) { const e = new Error("ไม่พบเคส"); e.status = 404; throw e; } });
    await attachments.saveAttachments(req.params.id, req.files, req.user.name);
    res.status(201).json(await cases.getCaseById(req.params.id));
  } catch (e) { next(e); }
});

// GET /api/cases/:id/attachments/:attId — stream/download the file (auth required)
router.get("/:id/attachments/:attId", async (req, res, next) => {
  try {
    const a = await attachments.getAttachment(req.params.id, req.params.attId);
    res.setHeader("Content-Type", a.mime || "application/octet-stream");
    const disp = req.query.download ? "attachment" : "inline";
    res.setHeader("Content-Disposition", `${disp}; filename*=UTF-8''${encodeURIComponent(a.name)}`);
    res.sendFile(a.filePath);
  } catch (e) { next(e); }
});

// DELETE /api/cases/:id/attachments/:attId
router.delete("/:id/attachments/:attId", requireRole("officer", "head", "admin"), requireCaseActor, async (req, res, next) => {
  try {
    await attachments.deleteAttachment(req.params.id, req.params.attId);
    res.json(await cases.getCaseById(req.params.id));
  } catch (e) { next(e); }
});

// POST /api/cases/import { rows: [...] }  (admin) → bulk import legacy cases
router.post("/import", requireRole("admin"), async (req, res, next) => {
  try {
    const rows = (req.body && req.body.rows) || [];
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: "ไม่มีข้อมูลให้นำเข้า" });
    if (rows.length > 5000) return res.status(400).json({ error: "นำเข้าได้ครั้งละไม่เกิน 5000 แถว" });
    res.json(await cases.importCases(rows, req.user));
  } catch (e) { next(e); }
});

module.exports = router;
