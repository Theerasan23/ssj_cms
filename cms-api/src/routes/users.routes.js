const express = require("express");
const { requireAuth, requireRole } = require("../middleware/auth");
const users = require("../services/users.service");

const router = express.Router();
const adminOnly = [requireAuth, requireRole("admin")];

// PATCH /api/users/me — any user edits their own profile (name/email/phone/password)
router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    res.json(await users.updateProfile(req.user.userId, req.body || {}));
  } catch (e) { next(e); }
});

// GET /api/users (admin)
router.get("/", adminOnly, async (req, res, next) => {
  try { res.json(await users.listUsers()); } catch (e) { next(e); }
});

// POST /api/users (admin) — add staff. Returns generated username + default password.
router.post("/", adminOnly, async (req, res, next) => {
  try { res.status(201).json(await users.createUser(req.body || {})); } catch (e) { next(e); }
});

// PATCH /api/users/:id (admin)
router.patch("/:id", adminOnly, async (req, res, next) => {
  try { res.json(await users.updateUser(req.params.id, req.body || {})); } catch (e) { next(e); }
});

// POST /api/users/:id/active { active } (admin) — enable/disable
router.post("/:id/active", adminOnly, async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.userId) return res.status(400).json({ error: "ไม่สามารถปิดการใช้งานบัญชีตัวเองได้" });
    res.json(await users.setActive(req.params.id, !!(req.body || {}).active));
  } catch (e) { next(e); }
});

// DELETE /api/users/:id (admin)
router.delete("/:id", adminOnly, async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.userId) return res.status(400).json({ error: "ไม่สามารถลบบัญชีตัวเองได้" });
    res.json(await users.deleteUser(req.params.id));
  } catch (e) { next(e); }
});

module.exports = router;
