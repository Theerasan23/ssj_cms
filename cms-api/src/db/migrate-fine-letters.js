// One-time migration (2026-09-07) — case_fine_letters added:
//   * "บันทึกการส่งหนังสือ" ในขั้นเปรียบเทียบปรับ (สถานะ 04) — เก็บหนังสือแจ้งปรับที่ส่งถึง
//     ผู้ถูกร้องได้หลายครั้ง (ทวงถามครั้งที่ 2/3) พร้อมเลขที่หนังสือ ลงวันที่ วันที่นัดชำระปรับ
//     และชื่อผู้รับหนังสือ ("เรียน")
//
// เคสเดิมไม่มีข้อมูลนี้มาก่อน จึงไม่ต้อง back-fill — ตารางเริ่มว่าง
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
    if (await tableExists(conn, "case_fine_letters")) {
      console.log("• case_fine_letters already present — nothing to do");
    } else {
      await conn.query(`
        CREATE TABLE case_fine_letters (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          case_id      VARCHAR(32) NOT NULL,
          round        INT NOT NULL DEFAULT 1,
          letter_no    VARCHAR(64),
          letter_date  DATE,
          due_date     DATE,
          recipient    VARCHAR(191),
          user_name    VARCHAR(128),
          created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          seq          INT NOT NULL DEFAULT 0,
          INDEX idx_fine_letter_case (case_id, seq),
          CONSTRAINT fk_fine_letter_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✓ case_fine_letters created");
    }
    console.log("migration complete");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
