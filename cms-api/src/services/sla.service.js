// SLA + lockdown logic — ported from cms-design/project/data.js
// Operates on the assembled case object (the JSON shape returned to the frontend).

// statuses whose SLA clock has stopped — 06/07/09 are follow-up statuses (still
// workable until closed_at is set) but no deadline applies and they never lock
const CLOSED = ["05", "06", "07", "08", "09"];
const FOLLOWUP = ["06", "07", "09"];

// Admin-configurable SLA durations (days). Loaded from sla_config at startup.
let SLA_DAYS = { assign: 3, invest: 20, board: 60, fine: 60 };
function setSlaDays(d) { SLA_DAYS = { ...SLA_DAYS, ...d }; }
function getSlaDays() { return { ...SLA_DAYS }; }

const toIso = (d) => {
  if (!d) return null;
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
};
const offsetDays = (base, days) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return toIso(d);
};
const TODAY = () => toIso(new Date());

function minDate(...ds) { const xs = ds.filter(Boolean); return xs.length ? xs.sort()[0] : null; }
function maxDate(...ds) { const xs = ds.filter(Boolean); return xs.length ? xs.sort().slice(-1)[0] : null; }

function computeSlaStage(anchorIso, slaDays, targetIso, todayIso) {
  todayIso = todayIso || TODAY();
  if (!anchorIso) return { kind: "pending", label: "—" };
  if (targetIso) {
    const due = offsetDays(anchorIso, slaDays);
    return targetIso <= due ? { kind: "in-time", label: "ในเวลา" } : { kind: "overdue", label: "เกินเวลา" };
  }
  const due = offsetDays(anchorIso, slaDays);
  const daysLeft = Math.ceil((new Date(due) - new Date(todayIso)) / 86400000);
  if (daysLeft < 0) return { kind: "overdue", label: `เกินเวลา ${Math.abs(daysLeft)} วัน` };
  if (daysLeft <= 3) return { kind: "near", label: `เหลือ ${daysLeft} วัน` };
  return { kind: "far", label: `เหลือ ${daysLeft} วัน` };
}

function caseSlaSnapshot(c) {
  const t = TODAY();
  // head-granted extension widens every stage window of this case — including
  // already-completed stages, so a stage finished late-but-within-extension
  // doesn't keep the case locked forever
  const ext = Number(c.slaExtensionDays) || 0;
  const stageAssign = computeSlaStage(c.postDate, SLA_DAYS.assign + ext, c.assignedAt, t);
  const investTarget = c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate)
    ? minDate(c.investigation.siteVisitDate, c.investigation.meetingDate) : null;
  const stageInvest = computeSlaStage(c.assignedAt, SLA_DAYS.invest + ext, investTarget, t);
  const boardTarget = c.board && c.board.meetingDate ? c.board.meetingDate : null;
  const stageBoard = computeSlaStage(c.assignedAt, SLA_DAYS.board + ext, boardTarget, t);
  const fineTarget = c.fines && c.fines.length > 0
    ? (c.fines.every((f) => f.paid) ? maxDate(...c.fines.map((f) => f.paidDate)) : null) : null;
  const fineAnchor = c.board && c.board.meetingDate ? c.board.meetingDate : null;
  const stageFine = computeSlaStage(fineAnchor, SLA_DAYS.fine + ext, fineTarget, t);
  return { stageAssign, stageInvest, stageBoard, stageFine };
}

function isCaseLocked(c) {
  if (c.lockOverridden) return false; // admin permanently lifted the lock
  if (CLOSED.includes(c.status)) return false;
  const sla = caseSlaSnapshot(c);
  const order = ["stageAssign", "stageInvest", "stageBoard", "stageFine"];
  const activeIdx = { "01": 0, "02": 1, "03": 2, "04": 3 }[c.status] ?? 0;
  for (let i = 0; i <= activeIdx; i++) {
    if (sla[order[i]] && sla[order[i]].kind === "overdue") return true;
  }
  return false;
}

function caseSla(c) {
  const s = caseSlaSnapshot(c);
  // follow-up statuses stay open (no deadline) until the case is explicitly closed
  if (FOLLOWUP.includes(c.status) && !c.closedAt) return { kind: "in-time", label: "ติดตามผล" };
  if (CLOSED.includes(c.status)) return { kind: "in-time", label: "ปิดเคส" };
  if (c.status === "01") return s.stageAssign;
  if (c.status === "02") return s.stageInvest;
  if (c.status === "03") return s.stageBoard;
  if (c.status === "04") return s.stageFine;
  return { kind: "pending", label: "—" };
}

module.exports = {
  CLOSED, FOLLOWUP, toIso, offsetDays, TODAY,
  computeSlaStage, caseSlaSnapshot, isCaseLocked, caseSla,
  setSlaDays, getSlaDays,
};
