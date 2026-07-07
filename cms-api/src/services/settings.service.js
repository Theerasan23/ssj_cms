// Admin-editable settings (SLA durations). Kept in sla_config and mirrored
// into the in-memory SLA module so computations use the configured values.
const pool = require("../db");
const sla = require("./sla.service");

async function getSlaConfig() {
  const [rows] = await pool.query("SELECT stage, label, days FROM sla_config ORDER BY ord, stage");
  return rows;
}

async function loadSlaIntoMemory() {
  const rows = await getSlaConfig();
  const days = {};
  for (const r of rows) days[r.stage] = r.days;
  if (Object.keys(days).length) sla.setSlaDays(days);
  return days;
}

async function updateSlaConfig(updates) {
  for (const [stage, days] of Object.entries(updates || {})) {
    const n = Number(days);
    if (!["assign", "invest", "board", "fine"].includes(stage)) continue;
    if (!Number.isFinite(n) || n < 0) continue;
    await pool.query("UPDATE sla_config SET days = ? WHERE stage = ?", [Math.round(n), stage]);
  }
  await loadSlaIntoMemory();
  return getSlaConfig();
}

module.exports = { getSlaConfig, loadSlaIntoMemory, updateSlaConfig };
