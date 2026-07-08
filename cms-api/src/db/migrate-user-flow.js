// One-time migration (2026-07-08) — workflow rework:
//   * roles: + supply (เจ้าหน้าที่พัสดุ), + fine (เจ้าหน้าที่ค่าปรับ),
//     officer relabelled "เจ้าหน้าที่ดำเนินการ"
//   * every officer gets a login (user account) — assignment now targets users
//   * case_assignees.officer_id → user_id (FK users)
//   * officers master table + users/roles.officer_id columns removed
// Idempotent: safe to re-run. Prints any credentials it creates.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../db");

const ROLES = [
  { id: "supply", label: "เจ้าหน้าที่พัสดุ", initials: "พด", descr: "สร้างเคสใหม่และส่งขออนุมัติหัวหน้ากลุ่มงาน" },
  { id: "fine", label: "เจ้าหน้าที่ค่าปรับ", initials: "คป", descr: "บันทึกการชำระค่าปรับและปิดเคสขั้นเปรียบเทียบปรับ" },
];
const OFFICER_ROLE = { label: "เจ้าหน้าที่ดำเนินการ", descr: "รับมอบหมายจากหัวหน้า ตรวจสอบข้อเท็จจริง บันทึกมติ และติดตามผล" };

// known seed officers → readable usernames (fallback: officerNN)
const USERNAME_BY_OFFICER_NAME = {
  "นายพันธ์เทพ เพชรผึ้ง": "pantep.p",
  "นายณรงค์เดช นนทเบญจวรรณ": "narongdet.n",
  "นางณัฐสิรี เปี้ยปลูก": "natsiri.p",
  "นางสาวโสภิฏดา สิรยากร": "sopitda.s",
  "นางวิมลรัตน์ อ่อนชุลี": "wimonrat.o",
  "นายกรกฤษณ์ สิงห์ป้อง": "korakrit.s",
};

function initialsFromName(name) {
  const cleaned = (name || "").trim().replace(/^(นาย|นาง|นางสาว|นพ\.|พญ\.|ดร\.)/, "").trim();
  return cleaned.split(/\s+/).slice(0, 2).map((p) => p[0]).join("") || "จน";
}

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
async function dropForeignKeys(conn, table, column) {
  const [fks] = await conn.query(
    `SELECT constraint_name AS fkName FROM information_schema.key_column_usage
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? AND referenced_table_name IS NOT NULL`,
    [table, column]);
  for (const fk of fks) {
    await conn.query(`ALTER TABLE ${table} DROP FOREIGN KEY \`${fk.fkName}\``);
  }
}

async function main() {
  const conn = await pool.getConnection();
  const created = [];
  try {
    // 1) roles: add supply + fine, relabel officer
    const [[{ maxOrd }]] = await conn.query("SELECT COALESCE(MAX(ord), 0) AS maxOrd FROM roles");
    let ord = maxOrd;
    for (const r of ROLES) {
      await conn.query(
        `INSERT INTO roles (id, name, role_label, initials, descr, ord) VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE role_label = VALUES(role_label), descr = VALUES(descr)`,
        [r.id, r.label, r.label, r.initials, r.descr, ++ord]);
    }
    await conn.query("UPDATE roles SET role_label = ?, descr = ? WHERE id = 'officer'",
      [OFFICER_ROLE.label, OFFICER_ROLE.descr]);
    console.log("✓ roles: supply/fine added, officer relabelled");

    if (await tableExists(conn, "officers")) {
      // 2) every officer needs a login — create accounts for those without one
      const [officers] = await conn.query("SELECT id, name, phone, active FROM officers");
      const passwordHash = bcrypt.hashSync("123456", 10);
      for (const off of officers) {
        const [existing] = await conn.query("SELECT id FROM users WHERE officer_id = ? ORDER BY id LIMIT 1", [off.id]);
        if (existing.length) continue;
        let username = USERNAME_BY_OFFICER_NAME[off.name];
        if (username) {
          const [dup] = await conn.query("SELECT 1 FROM users WHERE username = ?", [username]);
          if (dup.length) username = null;
        }
        if (!username) {
          const [[{ n }]] = await conn.query("SELECT COUNT(*) + 1 AS n FROM users");
          username = "officer" + String(n).padStart(2, "0");
        }
        await conn.query(
          `INSERT INTO users (username, password_hash, role_id, name, initials, email, phone, officer_id, active)
           VALUES (?, ?, 'officer', ?, ?, ?, ?, ?, ?)`,
          [username, passwordHash, off.name, initialsFromName(off.name), `${username}@nbthealth.go.th`, off.phone || null, off.id, off.active ? 1 : 0]);
        created.push({ name: off.name, username, password: "123456" });
      }
      console.log(`✓ users: ${created.length} officer account(s) created`);

      // 3) case_assignees: officer_id → user_id (rebuild + swap so the new PK
      //    dedupes rows that collapse onto the same user)
      if (await columnExists(conn, "case_assignees", "officer_id")) {
        const [[{ missing }]] = await conn.query(
          `SELECT COUNT(*) AS missing FROM case_assignees ca
           WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.officer_id = ca.officer_id)`);
        if (missing > 0) throw new Error(`case_assignees: ${missing} row(s) could not be mapped to a user`);
        await conn.query("DROP TABLE IF EXISTS case_assignees_new");
        await conn.query(
          `CREATE TABLE case_assignees_new (
             case_id VARCHAR(32) NOT NULL,
             user_id INT NOT NULL,
             PRIMARY KEY (case_id, user_id),
             -- fk names are schema-wide unique; the old table still holds fk_ca_case
             CONSTRAINT fk_ca_user_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
             CONSTRAINT fk_ca_user FOREIGN KEY (user_id) REFERENCES users(id)
           ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
        await conn.query(
          `INSERT IGNORE INTO case_assignees_new (case_id, user_id)
           SELECT ca.case_id, MIN(u.id) FROM case_assignees ca
           JOIN users u ON u.officer_id = ca.officer_id
           GROUP BY ca.case_id, ca.officer_id`);
        await conn.query("DROP TABLE case_assignees");
        await conn.query("RENAME TABLE case_assignees_new TO case_assignees");
        console.log("✓ case_assignees: now references users(id)");
      }

      // 4) drop officer_id from users/roles, then the officers table itself
      if (await columnExists(conn, "users", "officer_id")) {
        await dropForeignKeys(conn, "users", "officer_id");
        await conn.query("ALTER TABLE users DROP COLUMN officer_id");
      }
      if (await columnExists(conn, "roles", "officer_id")) {
        await dropForeignKeys(conn, "roles", "officer_id");
        await conn.query("ALTER TABLE roles DROP COLUMN officer_id");
      }
      await conn.query("DROP TABLE officers");
      console.log("✓ officers table removed");
    } else {
      console.log("• officers table already gone — nothing to migrate");
    }

    if (created.length) {
      console.log("\nบัญชีที่สร้างใหม่ (รหัสผ่านเริ่มต้น — ให้เจ้าหน้าที่เปลี่ยนเองในหน้าข้อมูลส่วนตัว):");
      for (const c of created) console.log(`  ${c.username} / ${c.password} — ${c.name}`);
    }
    console.log("\n✓ migration complete");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("✗ migration failed:", e.message);
  process.exit(1);
});
