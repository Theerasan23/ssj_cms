const pool = require("../db");
const bcrypt = require("bcryptjs");

async function listUsers() {
  const [rows] = await pool.query(
    `SELECT u.id, u.username, u.role_id AS roleId, u.name, u.initials, u.email, u.phone, u.active, u.officer_id AS officerId, u.last_login AS lastLogin, r.role_label AS roleLabel
     FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id`
  );
  return rows.map((u) => ({ ...u, active: !!u.active }));
}

async function nextUsername() {
  const [rows] = await pool.query("SELECT username FROM users WHERE username REGEXP '^user[0-9]+$'");
  let max = 0;
  for (const r of rows) { const n = parseInt(r.username.slice(4), 10); if (n > max) max = n; }
  return "user" + String(max + 1).padStart(2, "0");
}

function initialsFromName(name) {
  if (!name) return "";
  const cleaned = name.trim().replace(/^(นาย|นาง|นางสาว|นพ\.|พญ\.|ดร\.)/, "").trim();
  return cleaned.split(/\s+/).slice(0, 2).map((p) => p[0]).join("");
}

// Default new staff: username user01.., password 123456
async function createUser(body) {
  const name = (body.name || "").trim();
  if (!name) { const e = new Error("กรุณากรอกชื่อ-นามสกุล"); e.status = 400; throw e; }
  const roleId = body.roleId || "officer";
  const username = body.username && body.username.trim() ? body.username.trim() : await nextUsername();
  const password = body.password && body.password.length ? body.password : "123456";
  const initials = body.initials || initialsFromName(name);
  try {
    const [res] = await pool.query(
      "INSERT INTO users (username, password_hash, role_id, name, initials, email, phone, officer_id, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)",
      [username, bcrypt.hashSync(password, 10), roleId, name, initials, body.email || null, body.phone || null, body.officerId || null]
    );
    return { ok: true, id: res.insertId, username, password };
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") { const x = new Error("username นี้มีอยู่แล้ว"); x.status = 409; throw x; }
    if (e.code === "ER_NO_REFERENCED_ROW_2") { const x = new Error("บทบาทหรือเจ้าหน้าที่อ้างอิงไม่ถูกต้อง"); x.status = 400; throw x; }
    throw e;
  }
}

async function updateUser(id, body) {
  const map = { name: "name", initials: "initials", email: "email", phone: "phone", roleId: "role_id", officerId: "officer_id" };
  const sets = [], vals = [];
  for (const [key, col] of Object.entries(map)) {
    if (body[key] !== undefined) { sets.push(`${col} = ?`); vals.push(body[key] || null); }
  }
  if (body.password) { sets.push("password_hash = ?"); vals.push(bcrypt.hashSync(body.password, 10)); }
  if (!sets.length) { const e = new Error("ไม่มีข้อมูลให้แก้ไข"); e.status = 400; throw e; }
  vals.push(id);
  await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, vals);
  return { ok: true };
}

async function setActive(id, active) {
  await pool.query("UPDATE users SET active = ? WHERE id = ?", [active ? 1 : 0, id]);
  return { ok: true };
}

async function deleteUser(id) {
  try {
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return { ok: true };
  } catch (e) {
    if (e.code === "ER_ROW_IS_REFERENCED_2" || e.errno === 1451) {
      const x = new Error("ลบไม่ได้: ผู้ใช้นี้มีเคสที่สร้างไว้ในระบบ — แนะนำให้ปิดการใช้งานแทน"); x.status = 409; throw x;
    }
    throw e;
  }
}

// Self profile edit — name/email/phone/password only
async function updateProfile(userId, body) {
  const sets = [], vals = [];
  for (const [key, col] of [["name", "name"], ["email", "email"], ["phone", "phone"]]) {
    if (body[key] !== undefined) { sets.push(`${col} = ?`); vals.push(body[key] || null); }
  }
  if (body.password) {
    if (String(body.password).length < 6) { const e = new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"); e.status = 400; throw e; }
    sets.push("password_hash = ?"); vals.push(bcrypt.hashSync(body.password, 10));
  }
  if (!sets.length) { const e = new Error("ไม่มีข้อมูลให้แก้ไข"); e.status = 400; throw e; }
  vals.push(userId);
  await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, vals);
  return { ok: true };
}

module.exports = { listUsers, createUser, updateUser, setActive, deleteUser, updateProfile };
