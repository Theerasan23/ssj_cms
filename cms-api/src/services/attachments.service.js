// File attachment storage — writes uploaded files to disk and tracks them in case_attachments.
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const pool = require("../db");

const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "..", "uploads");

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

function caseDir(caseId) {
  // caseId comes from our own DB (never user free-text) but keep it path-safe anyway
  const safe = String(caseId).replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(UPLOAD_ROOT, safe);
}

function humanSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}
function kindFromMime(mime) {
  if (mime && mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return "other";
}

// Persist multer in-memory files to disk + DB rows. Returns count saved.
async function saveAttachments(caseId, files, byName) {
  if (!files || !files.length) { const e = new Error("ไม่มีไฟล์ที่อัปโหลด"); e.status = 400; throw e; }
  const dir = caseDir(caseId);
  fs.mkdirSync(dir, { recursive: true });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const f of files) {
      if (!ALLOWED_MIME.has(f.mimetype)) { const e = new Error(`ชนิดไฟล์ไม่รองรับ: ${f.originalname}`); e.status = 400; throw e; }
      if (f.size > MAX_BYTES) { const e = new Error(`ไฟล์ใหญ่เกิน 20 MB: ${f.originalname}`); e.status = 400; throw e; }
      const storedName = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}${path.extname(f.originalname) || ""}`;
      // multer's latin1→utf8 fix for the original filename
      const original = Buffer.from(f.originalname, "latin1").toString("utf8");
      fs.writeFileSync(path.join(dir, storedName), f.buffer);
      await conn.query(
        "INSERT INTO case_attachments (case_id, name, size, type, stored_name, mime, bytes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [caseId, original, humanSize(f.size), kindFromMime(f.mimetype), storedName, f.mimetype, f.size]
      );
    }
    const seq = await conn.query("SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM case_timeline WHERE case_id = ?", [caseId]);
    await conn.query(
      "INSERT INTO case_timeline (case_id, date, time, title, user_name, kind, status, seq) VALUES (?, CURDATE(), DATE_FORMAT(NOW(), '%H:%i'), ?, ?, 'create', 'in-time', ?)",
      [caseId, `อัปโหลดเอกสารแนบ ${files.length} ไฟล์`, byName, seq[0][0].n]
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Fetch one attachment's DB row + resolved disk path (for streaming/download).
async function getAttachment(caseId, attId) {
  const [rows] = await pool.query(
    "SELECT id, name, mime, type, stored_name FROM case_attachments WHERE id = ? AND case_id = ?",
    [attId, caseId]
  );
  if (!rows.length) { const e = new Error("ไม่พบเอกสารแนบ"); e.status = 404; throw e; }
  const row = rows[0];
  if (!row.stored_name) { const e = new Error("เอกสารนี้ไม่มีไฟล์แนบจริง (ข้อมูลเก่า)"); e.status = 404; throw e; }
  const filePath = path.join(caseDir(caseId), row.stored_name);
  if (!fs.existsSync(filePath)) { const e = new Error("ไฟล์หายไปจากที่จัดเก็บ"); e.status = 404; throw e; }
  return { ...row, filePath };
}

async function deleteAttachment(caseId, attId) {
  const [rows] = await pool.query("SELECT stored_name FROM case_attachments WHERE id = ? AND case_id = ?", [attId, caseId]);
  if (!rows.length) { const e = new Error("ไม่พบเอกสารแนบ"); e.status = 404; throw e; }
  await pool.query("DELETE FROM case_attachments WHERE id = ? AND case_id = ?", [attId, caseId]);
  if (rows[0].stored_name) {
    const filePath = path.join(caseDir(caseId), rows[0].stored_name);
    fs.promises.unlink(filePath).catch(() => { /* file already gone — ignore */ });
  }
}

module.exports = { saveAttachments, getAttachment, deleteAttachment, UPLOAD_ROOT, MAX_BYTES, ALLOWED_MIME };
