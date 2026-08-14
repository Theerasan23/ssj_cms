// One-time migration (2026-08-14) — bring the `roles` table in line with the code:
//   * + deputy (รองหัวหน้ากลุ่มงาน คบส.) — สิทธิ์เทียบเท่าหัวหน้ากลุ่มงาน. auth/roles.js
//     already honours it (HEAD_ROLES) and seed.js already lists it, but a database seeded
//     before that never got the row — so the role appeared nowhere in Admin →
//     ผู้ใช้และสิทธิ์ and could not be picked when adding a user.
//   * supply relabelled เจ้าหน้าที่พัสดุ → เจ้าหน้าที่ธุรการ (ตัวย่อ พด → ธก)
//   * `ord` rewritten so the legend and the role dropdown follow the workflow order
//
// The UI shows `role_label` (master.service maps it to `role`), not `name` — both are
// updated here so no copy of the old wording survives.
//
// THIS is the script to run against an existing database. schema.sql drops and recreates
// every table, so it is only for a brand-new install — never run it on a live server.
// Idempotent: safe to re-run.
require("dotenv").config();
const pool = require("../db");

// Canonical workflow order — keep in sync with the `roles` array in seed.js.
// ธุรการสร้างเคส → หัวหน้า/รองหัวหน้าอนุมัติ+มอบหมาย → เจ้าหน้าที่ดำเนินการ → ค่าปรับ
const ROLE_ORDER = ["admin", "head", "deputy", "supply", "officer", "fine", "exec"];

const DEPUTY = {
  id: "deputy",
  label: "รองหัวหน้ากลุ่มงาน คบส.",
  initials: "รห",
  descr: "สิทธิ์เทียบเท่าหัวหน้ากลุ่มงาน — อนุมัติเคส มอบหมายเจ้าหน้าที่ และขยายกำหนด SLA",
};
const SUPPLY = { id: "supply", oldLabel: "เจ้าหน้าที่พัสดุ", label: "เจ้าหน้าที่ธุรการ", initials: "ธก" };

async function main() {
  const conn = await pool.getConnection();
  try {
    const [[roleTable]] = await conn.query(
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'roles'");
    if (!roleTable.n) throw new Error("ไม่พบตาราง 'roles' — ตรวจว่าชี้ไปยังฐานข้อมูลถูกตัวหรือไม่");

    // 1) รองหัวหน้ากลุ่มงาน
    const [[deputyRow]] = await conn.query("SELECT COUNT(*) AS n FROM roles WHERE id = ?", [DEPUTY.id]);
    await conn.query(
      `INSERT INTO roles (id, name, role_label, initials, descr, ord) VALUES (?, ?, ?, ?, ?, 0)
       ON DUPLICATE KEY UPDATE name = VALUES(name), role_label = VALUES(role_label),
                               initials = VALUES(initials), descr = VALUES(descr)`,
      [DEPUTY.id, DEPUTY.label, DEPUTY.label, DEPUTY.initials, DEPUTY.descr]);
    console.log(deputyRow.n ? `• บทบาท '${DEPUTY.id}' มีอยู่แล้ว — อัปเดตชื่อ/คำอธิบายให้ตรงกับโค้ด`
      : `✓ เพิ่มบทบาท '${DEPUTY.id}' (${DEPUTY.label})`);

    // 2) เจ้าหน้าที่พัสดุ → เจ้าหน้าที่ธุรการ. `name` ถูกเปลี่ยนเฉพาะเมื่อยังเป็นป้ายเดิม —
    // แถว officer เก็บชื่อคนจริงไว้ในคอลัมน์นี้ การเขียนทับแบบไม่มีเงื่อนไขจะทำข้อมูลหาย
    const [supplyRes] = await conn.query(
      "UPDATE roles SET role_label = ?, initials = ?, name = IF(name = ?, ?, name) WHERE id = ?",
      [SUPPLY.label, SUPPLY.initials, SUPPLY.oldLabel, SUPPLY.label, SUPPLY.id]);
    console.log(supplyRes.changedRows > 0
      ? `✓ เปลี่ยนป้ายบทบาท '${SUPPLY.id}' เป็น "${SUPPLY.label}"`
      : `• บทบาท '${SUPPLY.id}' เป็น "${SUPPLY.label}" อยู่แล้ว — ไม่ต้องแก้`);

    // 3) ลำดับการแสดงผล — บทบาทที่ไม่อยู่ในรายการถูกดันไปท้ายสุดโดยคงลำดับเดิมไว้
    const [existing] = await conn.query("SELECT id FROM roles ORDER BY ord, id");
    const known = ROLE_ORDER.filter((id) => existing.some((r) => r.id === id));
    const rest = existing.map((r) => r.id).filter((id) => !ROLE_ORDER.includes(id));
    const ordered = [...known, ...rest];
    for (let i = 0; i < ordered.length; i++) {
      await conn.query("UPDATE roles SET ord = ? WHERE id = ?", [i, ordered[i]]);
    }
    console.log(`✓ จัดลำดับบทบาทใหม่: ${ordered.join(" → ")}`);

    console.log("migration complete");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
