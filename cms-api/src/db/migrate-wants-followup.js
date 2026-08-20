// One-time migration (2026-08-19) — cases.wants_followup added:
//   * "ต้องการติดตาม/ตอบกลับเรื่องร้องเรียน" — ผู้ร้องเรียนแจ้งว่าต้องการทราบความคืบหน้า/ผล
//     ถามคู่กับสินบนนำจับบนฟอร์มสร้างเคส (/cases/new) และหน้าแก้ไขเคส
//
// เคสเดิมทั้งหมดตกเป็น 0 (ไม่ได้ระบุ) — ตอนสร้างยังไม่มีคำถามนี้ให้ตอบ จึงไม่ back-fill
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
    if (!(await tableExists(conn, "cases"))) {
      throw new Error("ไม่พบตาราง 'cases' — ตรวจว่าชี้ไปยังฐานข้อมูลถูกตัวหรือไม่");
    }
    await addColumn(conn, "cases", "wants_followup", "TINYINT(1) NOT NULL DEFAULT 0");
    console.log("migration complete");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
