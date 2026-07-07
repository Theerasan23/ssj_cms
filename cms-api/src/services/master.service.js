// Loads all lookup / master data in the shape the frontend expects
// (mirrors window.CMS.MASTER + STATUS from the prototype's data.js).
const pool = require("../db");

// Editable lookup entities (admin CRUD). Each maps an API name → table + fields.
const ENTITIES = {
  channels:    { table: "channels",     idCol: "id", idAuto: true,  fields: ["name"],                                            required: ["name"] },
  sources:     { table: "sources",      idCol: "id", idAuto: true,  fields: ["name"],                                            required: ["name"] },
  problems:    { table: "problems",     idCol: "id", idAuto: true,  fields: ["name"],                                            required: ["name"] },
  committees:  { table: "committees",   idCol: "id", idAuto: true,  fields: ["name"],                                            required: ["name"] },
  resolutions: { table: "resolutions",  idCol: "id", idAuto: true,  fields: ["name"],                                            required: ["name"] },
  districts:   { table: "districts",    idCol: "id", idAuto: true,  fields: ["name"],                                            required: ["name"] },
  laws:        { table: "laws",         idCol: "id", idAuto: false, fields: ["id", "label"],                                     required: ["id", "label"] },
  officers:    { table: "officers",     idCol: "id", idAuto: false, fields: ["id", "name", "phone", "email"],                    required: ["id", "name"] },
  sections:    { table: "law_sections", idCol: "id", idAuto: false, fields: ["id", "law_id", "text", "fine1", "fine2", "fine3"], required: ["id", "law_id", "text"] },
};

function entityOr400(name) {
  const c = ENTITIES[name];
  if (!c) { const e = new Error("ประเภทข้อมูลไม่ถูกต้อง"); e.status = 400; throw e; }
  return c;
}

function friendlyError(e) {
  if (e.code === "ER_DUP_ENTRY") { const x = new Error("ข้อมูลนี้มีอยู่แล้ว"); x.status = 409; return x; }
  if (e.code === "ER_ROW_IS_REFERENCED_2" || e.errno === 1451) { const x = new Error("ลบไม่ได้: มีเคส/ข้อมูลอื่นอ้างอิงรายการนี้อยู่"); x.status = 409; return x; }
  if (e.code === "ER_NO_REFERENCED_ROW_2" || e.errno === 1452) { const x = new Error("ข้อมูลอ้างอิงไม่ถูกต้อง (เช่น พรบ. ที่เลือกไม่มีอยู่)"); x.status = 400; return x; }
  return e;
}

// Full rows (with ids) for the admin tables.
async function listEntity(entity) {
  const cfg = entityOr400(entity);
  const cols = [...new Set([cfg.idCol, ...cfg.fields, "ord"])];
  const [rows] = await pool.query(`SELECT ${cols.join(", ")} FROM ${cfg.table} ORDER BY ord, ${cfg.idCol}`);
  return rows;
}

async function createItem(entity, body) {
  const cfg = entityOr400(entity);
  for (const r of cfg.required) {
    if (body[r] === undefined || body[r] === null || body[r] === "") { const e = new Error(`กรุณากรอกข้อมูลให้ครบ (${r})`); e.status = 400; throw e; }
  }
  const data = {};
  for (const f of cfg.fields) if (body[f] !== undefined) data[f] = body[f];
  const [rows] = await pool.query(`SELECT COALESCE(MAX(ord), 0) + 1 AS n FROM ${cfg.table}`);
  data.ord = rows[0].n;
  const cols = Object.keys(data);
  try {
    const [res] = await pool.query(`INSERT INTO ${cfg.table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`, cols.map((k) => data[k]));
    return { ok: true, id: cfg.idAuto ? res.insertId : body[cfg.idCol] };
  } catch (e) { throw friendlyError(e); }
}

async function updateItem(entity, id, body) {
  const cfg = entityOr400(entity);
  const sets = [], vals = [];
  for (const f of cfg.fields) {
    if (f === cfg.idCol) continue; // never change the primary key
    if (body[f] !== undefined) { sets.push(`${f} = ?`); vals.push(body[f]); }
  }
  if (!sets.length) { const e = new Error("ไม่มีข้อมูลให้แก้ไข"); e.status = 400; throw e; }
  vals.push(id);
  try {
    await pool.query(`UPDATE ${cfg.table} SET ${sets.join(", ")} WHERE ${cfg.idCol} = ?`, vals);
    return { ok: true };
  } catch (e) { throw friendlyError(e); }
}

async function deleteItem(entity, id) {
  const cfg = entityOr400(entity);
  try {
    await pool.query(`DELETE FROM ${cfg.table} WHERE ${cfg.idCol} = ?`, [id]);
    return { ok: true };
  } catch (e) { throw friendlyError(e); }
}

const SIMPLE_TABLES = ["channels", "sources", "problems", "committees", "resolutions", "districts"];

async function getMaster() {
  const [channels] = await pool.query("SELECT name FROM channels WHERE active = 1 ORDER BY ord, id");
  const [sources] = await pool.query("SELECT name FROM sources WHERE active = 1 ORDER BY ord, id");
  const [problems] = await pool.query("SELECT name FROM problems WHERE active = 1 ORDER BY ord, id");
  const [committees] = await pool.query("SELECT name FROM committees WHERE active = 1 ORDER BY ord, id");
  const [resolutions] = await pool.query("SELECT name FROM resolutions WHERE active = 1 ORDER BY ord, id");
  const [districts] = await pool.query("SELECT name FROM districts WHERE active = 1 ORDER BY ord, id");
  const [laws] = await pool.query("SELECT id, label FROM laws WHERE active = 1 ORDER BY ord, id");
  const [officers] = await pool.query("SELECT id, name, phone, email FROM officers WHERE active = 1 ORDER BY ord, id");
  const [sections] = await pool.query("SELECT id, law_id, text, fine1, fine2, fine3 FROM law_sections ORDER BY ord, id");
  const [statuses] = await pool.query("SELECT code, label, css_class FROM statuses ORDER BY ord, code");
  const [roles] = await pool.query("SELECT id, name, role_label, initials, descr FROM roles ORDER BY ord, id");
  const [slaConfig] = await pool.query("SELECT stage, label, days FROM sla_config ORDER BY ord, stage");

  const statusMap = {};
  for (const s of statuses) statusMap[s.code] = { code: s.code, label: s.label, cls: s.css_class };

  return {
    channels: channels.map((r) => r.name),
    laws: laws.map((r) => ({ id: r.id, label: r.label })),
    sources: sources.map((r) => r.name),
    problems: problems.map((r) => r.name),
    officers: officers.map((r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email })),
    committees: committees.map((r) => r.name),
    resolutions: resolutions.map((r) => r.name),
    districts: districts.map((r) => r.name),
    sections: sections.map((r) => ({ id: r.id, law: r.law_id, text: r.text, fines: [r.fine1, r.fine2, r.fine3] })),
    statuses: statusMap,
    roles: roles.map((r) => ({ id: r.id, name: r.name, role: r.role_label, initials: r.initials, desc: r.descr })),
    slaConfig: slaConfig.map((r) => ({ stage: r.stage, label: r.label, days: r.days })),
    slaDays: Object.fromEntries(slaConfig.map((r) => [r.stage, r.days])),
  };
}

module.exports = { getMaster, listEntity, createItem, updateItem, deleteItem, ENTITIES, SIMPLE_TABLES };
