// One-time migration (2026-10-09) — temp_case added:
//   * หน้า "ลบเคส" ในตั้งค่าระบบ (Admin) — เคสที่ลบจะไม่หายไปเฉย ๆ แต่ถูกย้ายมาเก็บที่ตารางนี้
//     snapshot = แถวดิบของเคสจากทุกตารางที่ผูกกับเคส (cases + case_* + notifications)
//     เก็บแบบแถวดิบเพื่อให้กู้คืนกลับได้ตรงตามเดิมถ้าจำเป็น
//   * คอลัมน์ etracking/letter_no/title/business/status_code คัดลอกจากเคสไว้ใช้แสดงรายการ
//     โดยไม่ต้องแกะ snapshot · ไม่มี FK เพราะเคสต้นทางถูกลบไปแล้ว
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

async function main() {
  const conn = await pool.getConnection();
  try {
    if (!(await tableExists(conn, "cases"))) {
      throw new Error("ไม่พบตาราง 'cases' — ตรวจว่าชี้ไปยังฐานข้อมูลถูกตัวหรือไม่");
    }
    if (await tableExists(conn, "temp_case")) {
      console.log("• temp_case already present — nothing to do");
    } else {
      await conn.query(`
        CREATE TABLE temp_case (
          id                 INT AUTO_INCREMENT PRIMARY KEY,
          case_id            VARCHAR(32) NOT NULL,
          etracking          VARCHAR(64),
          letter_no          VARCHAR(64),
          title              VARCHAR(255),
          business           VARCHAR(191),
          status_code        VARCHAR(2),
          reason             VARCHAR(500),
          deleted_by_user_id INT,
          deleted_by_name    VARCHAR(128),
          deleted_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          snapshot           JSON NOT NULL,
          INDEX idx_temp_case_case (case_id),
          INDEX idx_temp_case_deleted (deleted_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✓ temp_case created");
    }
    console.log("migration complete");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
