// One-time migration (2026-08-13) — two related case-form changes:
//   * cases.letter_no / letter_date keep meaning "เลขที่/วันที่ลงรับ สสจ."
//   * cases.doc_no / doc_date added for "เลขที่หนังสือ" / "ลงวันที่" of the source document
//     (both optional — captured under ข้อมูลผู้ร้องเรียน on the case form)
//   * cases.assign_sla_waived added — POST no./date are now optional, and a case assigned
//     while they were still empty must never have its ขั้นมอบหมาย SLA judged, even after
//     a POST date is entered later
//   * cases.problem_other added — free text for the "อื่น ๆ" ประเภทปัญหา option, and the
//     "อื่น ๆ" row itself is ensured in the problems master table
//   * notifications.created_at added — every row stored the frozen label "เมื่อสักครู่",
//     so the bell could never show when anything actually happened
//   * notifications.recipient_user_id forced NOT NULL — a row without a recipient lands in
//     everyone's bell and is marked read for everyone
//
// THIS is the script to run against an existing database. schema.sql drops and recreates
// every table, so it is only for a brand-new install — never run it on a live server.
// Idempotent: safe to re-run.
require("dotenv").config();
const pool = require("../db");

async function tableExists(conn, table) {
  const [r] = await conn.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?", [table]);
  return r.length > 0;
}
async function columnExists(conn, table, column) {
  const [r] = await conn.query(
    "SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
    [table, column]);
  return r.length > 0;
}
async function indexExists(conn, table, index) {
  const [r] = await conn.query(
    "SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
    [table, index]);
  return r.length > 0;
}
// Column position is cosmetic; adding without AFTER keeps this working even if the live
// table's column order has drifted from schema.sql.
async function addColumn(conn, table, column, ddl) {
  if (await columnExists(conn, table, column)) {
    console.log(`• ${table}.${column} already present — nothing to do`);
    return false;
  }
  await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  console.log(`✓ ${table}.${column} added`);
  return true;
}

async function main() {
  const conn = await pool.getConnection();
  try {
    for (const t of ["cases", "problems", "notifications"]) {
      if (!(await tableExists(conn, t))) throw new Error(`ไม่พบตาราง '${t}' — ตรวจว่าชี้ไปยังฐานข้อมูลถูกตัวหรือไม่`);
    }

    await addColumn(conn, "cases", "doc_no", "VARCHAR(64) NULL");
    await addColumn(conn, "cases", "doc_date", "DATE NULL");
    await addColumn(conn, "cases", "problem_other", "VARCHAR(191) NULL");

    if (await addColumn(conn, "cases", "assign_sla_waived", "TINYINT(1) NOT NULL DEFAULT 0")) {
      // Existing cases assigned without a POST date were never measurable either.
      const [r] = await conn.query(
        "UPDATE cases SET assign_sla_waived = 1 WHERE assigned_at IS NOT NULL AND post_date IS NULL");
      console.log(`  ↳ back-filled ${r.affectedRows} เคสที่มอบหมายไปแล้วโดยไม่มีวันลงรับ POST`);
    }

    // Without this row the "อื่น ๆ" chip never appears, and a case sent with it would have
    // that selection silently dropped (case_problems is keyed on problems.id).
    const [[{ n }]] = await conn.query(
      "SELECT COUNT(*) AS n FROM problems WHERE REPLACE(name, ' ', '') = 'อื่นๆ'");
    if (n > 0) {
      console.log("• problems: 'อื่น ๆ' already present — nothing to do");
    } else {
      const [[{ maxOrd }]] = await conn.query("SELECT COALESCE(MAX(ord), 0) AS maxOrd FROM problems");
      await conn.query("INSERT INTO problems (name, ord, active) VALUES ('อื่น ๆ', ?, 1)", [maxOrd + 1]);
      console.log("✓ problems: 'อื่น ๆ' added");
    }
    // existing rows all get "now"; ord preserves their true relative order
    await addColumn(conn, "notifications", "created_at", "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP");

    // per-person only: a NULL recipient row would be shown to (and marked read by) everyone
    const [[{ n: orphans }]] = await conn.query(
      "SELECT COUNT(*) AS n FROM notifications WHERE recipient_user_id IS NULL");
    if (orphans > 0) {
      await conn.query("DELETE FROM notifications WHERE recipient_user_id IS NULL");
      console.log(`✓ ลบ notification แบบ broadcast ${orphans} รายการ (ไม่มีผู้รับเจาะจง)`);
    } else {
      console.log("• notifications: ไม่มีรายการ broadcast ค้างอยู่");
    }

    // enforce it at the table so a future bug can't reintroduce a bell-for-everyone row
    const [[recipientCol]] = await conn.query(
      `SELECT is_nullable AS nullable FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'notifications' AND column_name = 'recipient_user_id'`);
    if (recipientCol && recipientCol.nullable === "NO") {
      console.log("• notifications.recipient_user_id เป็น NOT NULL อยู่แล้ว");
    } else {
      await conn.query("ALTER TABLE notifications MODIFY recipient_user_id INT NOT NULL");
      console.log("✓ notifications.recipient_user_id → NOT NULL");
    }

    // idx_notif_recipient (recipient_user_id) มีอยู่แล้วและครอบคลุมการค้นของแต่ละคน
    // จึงไม่เพิ่ม index ซ้ำซ้อน
    if (!(await indexExists(conn, "notifications", "idx_notif_recipient"))) {
      await conn.query("CREATE INDEX idx_notif_recipient ON notifications (recipient_user_id)");
      console.log("✓ notifications: เพิ่ม index ผู้รับ");
    }
    console.log("migration complete");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
