const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const master = require("../services/master.service");
const settings = require("../services/settings.service");

const router = express.Router();
const adminOnly = [requireAuth, requireRole("admin")];

// GET /api/master — all lookup data + SLA config
router.get("/", requireAuth, async (req, res, next) => {
  try {
    res.json(await master.getMaster());
  } catch (e) { next(e); }
});

// PUT /api/master/sla  { assign, invest, board, fine }  (admin) — update SLA durations
router.put("/sla", adminOnly, async (req, res, next) => {
  try {
    res.json(await settings.updateSlaConfig(req.body || {}));
  } catch (e) { next(e); }
});

// GET /api/master/:entity  (admin) — full rows with ids for the admin table
router.get("/:entity", adminOnly, async (req, res, next) => {
  try {
    res.json(await master.listEntity(req.params.entity));
  } catch (e) { next(e); }
});

// POST /api/master/:entity  (admin) — add a lookup item
router.post("/:entity", adminOnly, async (req, res, next) => {
  try {
    res.status(201).json(await master.createItem(req.params.entity, req.body || {}));
  } catch (e) { next(e); }
});

// PATCH /api/master/:entity/:id  (admin) — edit a lookup item
router.patch("/:entity/:id", adminOnly, async (req, res, next) => {
  try {
    res.json(await master.updateItem(req.params.entity, req.params.id, req.body || {}));
  } catch (e) { next(e); }
});

// DELETE /api/master/:entity/:id  (admin)
router.delete("/:entity/:id", adminOnly, async (req, res, next) => {
  try {
    res.json(await master.deleteItem(req.params.entity, req.params.id));
  } catch (e) { next(e); }
});

module.exports = router;
