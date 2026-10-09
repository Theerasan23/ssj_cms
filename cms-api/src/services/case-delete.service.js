// Admin: ลบเคสออกจากระบบ — เคสไม่หายไปเฉย ๆ แต่ถูกย้ายไปเก็บที่ตาราง temp_case
// snapshot เก็บแถวดิบจากทุกตารางที่ผูกกับเคส เพื่อให้กู้คืนกลับได้ตรงตามเดิมถ้าจำเป็น
const pool = require("../db");

const MAX_REASON = 500;

// FK ทั้งหมดที่ชี้มายังตาราง table (เช่น case_timeline.case_id → cases.id)
async function childFks(conn, table) {
  const [rows] = await conn.query(
    `SELECT table_name AS tbl, column_name AS col, referenced_column_name AS refCol
     FROM information_schema.key_column_usage
     WHERE table_schema = DATABASE() AND referenced_table_name = ?`, [table]);
  return rows;
}

// เก็บแถวดิบของตารางนี้แล้วไล่ลงไปตารางลูกต่อ (cases → case_board_meetings → case_board_meeting_*)
// อ่านความสัมพันธ์จาก FK จริงในฐานข้อมูล ตารางที่ผูกกับเคสซึ่งเพิ่มในอนาคตจะถูกเก็บด้วยเสมอ
// ไม่ใช่โดน ON DELETE CASCADE ลบทิ้งไปเงียบ ๆ โดยไม่มีสำเนา
async function collect(conn, table, rows, out) {
  out[table] = (out[table] || []).concat(rows);
  for (const fk of await childFks(conn, table)) {
    if (fk.tbl === table) continue;
    const keys = [...new Set(rows.map((r) => r[fk.refCol]).filter((v) => v != null))];
    if (!keys.length) continue;
    const [childRows] = await conn.query("SELECT * FROM ?? WHERE ?? IN (?)", [fk.tbl, fk.col, keys]);
    if (childRows.length) await collect(conn, fk.tbl, childRows, out);
  }
}

// ทุกเคสในระบบ รวมร่างของทุกคน (หน้ารายการเคสปกติซ่อนร่างของคนอื่น แต่ Admin ต้องลบได้)
async function listLiveCases() {
  const [rows] = await pool.query(
    `SELECT c.id, c.etracking, c.letter_no AS letterNo, c.title,
            c.respondent_business AS business, c.respondent_licensee AS licensee,
            c.status_code AS status, c.is_draft AS isDraft, c.created_at AS createdAt,
            (SELECT COUNT(*) FROM case_timeline t    WHERE t.case_id = c.id) AS timelineCount,
            (SELECT COUNT(*) FROM case_fines f       WHERE f.case_id = c.id) AS fineCount,
            (SELECT COUNT(*) FROM case_attachments a WHERE a.case_id = c.id) AS attachmentCount
     FROM cases c ORDER BY c.created_at DESC, c.id DESC`);
  return rows.map((r) => ({ ...r, isDraft: !!r.isDraft }));
}

async function listDeletedCases() {
  const [rows] = await pool.query(
    `SELECT id, case_id AS caseId, etracking, letter_no AS letterNo, title, business,
            status_code AS status, reason, deleted_by_name AS deletedBy, deleted_at AS deletedAt
     FROM temp_case ORDER BY deleted_at DESC, id DESC`);
  return rows;
}

// ไฟล์เอกสารแนบบนดิสก์ (uploads/<caseId>/) ไม่ลบ — แถว case_attachments ใน snapshot ยังชี้ไฟล์เดิมอยู่
// กู้คืนเคสแล้วไฟล์จะกลับมาเปิดได้ทันที
async function deleteCase(id, reason, user) {
  const why = String(reason || "").trim();
  if (why.length > MAX_REASON) { const e = new Error(`เหตุผลการลบยาวเกิน ${MAX_REASON} ตัวอักษร`); e.status = 400; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT * FROM cases WHERE id = ? FOR UPDATE", [id]);
    if (!rows.length) { const e = new Error("ไม่พบเคส (อาจถูกลบไปแล้ว)"); e.status = 404; throw e; }
    const c = rows[0];
    const tables = {};
    await collect(conn, "cases", rows, tables);
    const [res] = await conn.query(
      `INSERT INTO temp_case (case_id, etracking, letter_no, title, business, status_code, reason, deleted_by_user_id, deleted_by_name, snapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.id, c.etracking, c.letter_no, c.title, c.respondent_business || c.respondent_licensee, c.status_code,
        why || null, user.userId ?? null, user.name || user.username || null, JSON.stringify({ v: 1, tables })]);
    // notifications.case_id เป็น ON DELETE SET NULL — ถ้าไม่ลบเองจะเหลือแจ้งเตือนที่กดไปไหนไม่ได้
    // (แถวพวกนี้อยู่ใน snapshot แล้ว)
    await conn.query("DELETE FROM notifications WHERE case_id = ?", [id]);
    await conn.query("DELETE FROM cases WHERE id = ?", [id]);
    await conn.commit();
    return { ok: true, tempId: res.insertId };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { listLiveCases, listDeletedCases, deleteCase };
