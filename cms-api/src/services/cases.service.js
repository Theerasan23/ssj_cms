// Assembles normalized case rows into the JSON shape the frontend expects,
// and implements case creation + workflow transitions.
const pool = require("../db");
const sla = require("./sla.service");

const CASE_SELECT = `
  SELECT c.*, s.name AS source_name, ch.name AS channel_name, d.name AS district_name, sd.name AS subdistrict_name, cu.name AS created_by_name
  FROM cases c
  LEFT JOIN sources      s  ON s.id  = c.source_id
  LEFT JOIN channels     ch ON ch.id = c.complainant_channel_id
  LEFT JOIN districts    d  ON d.id  = c.respondent_district_id
  LEFT JOIN subdistricts sd ON sd.id = c.respondent_subdistrict_id
  LEFT JOIN users        cu ON cu.id = c.created_by_user_id
`;

function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r[key])) m.set(r[key], []);
    m.get(r[key]).push(r);
  }
  return m;
}

function deriveInvestigation(invs = []) {
  const minDate = (arr) => { const xs = arr.map((x) => x.date).filter(Boolean).sort(); return xs.length ? xs[0] : null; };
  const sites = invs.filter((i) => i.kind === "site");
  const meetings = invs.filter((i) => i.kind === "meeting");
  return {
    siteVisitDate: minDate(sites),
    sitePlace: sites[0]?.place || "",
    siteResult: sites[0]?.result || "",
    meetingDate: minDate(meetings),
    meetingPlace: meetings[0]?.place || "",
    meetingSummary: meetings[0]?.result || "",
  };
}

function buildShape(r, rel) {
  const board = r.has_board
    ? {
        committees: rel.boardCom,
        meetingNo: r.board_meeting_no,
        year: r.board_year,
        meetingDate: r.board_meeting_date,
        resolution: r.board_resolution,
        sections: rel.boardSec,
        notes: r.board_notes || "",
      }
    : null;
  return {
    id: r.id,
    boardMeetings: rel.boardMeetings,
    etracking: r.etracking,
    letterNo: r.letter_no,
    letterDate: r.letter_date,
    postNo: r.post_no,
    postDate: r.post_date,
    title: r.title,
    laws: rel.laws,
    problems: rel.problems,
    source: r.source_name || "",
    complainant: {
      name: r.complainant_name || "",
      phone: r.complainant_phone || "",
      email: r.complainant_email || "",
      address: r.complainant_address || "",
      channel: r.channel_name || "",
      anonymous: !!r.complainant_anonymous,
    },
    respondent: {
      licensee: r.respondent_licensee || "",
      business: r.respondent_business || "",
      address: r.respondent_address || "",
      district: r.district_name || "",
      subdistrict: r.subdistrict_name || "",
      licenseNo: r.respondent_license_no || "",
    },
    product: r.product || "",
    productLicense: r.product_license || "",
    // free text since 2026-07 (e.g. "5,000 บาท ตามประกาศฯ") — legacy rows hold the old number as string
    bountyAmount: r.bounty_amount || null,
    bountyRequested: !!r.bounty_requested,
    bountyFirstName: r.bounty_first_name || "",
    bountyLastName: r.bounty_last_name || "",
    bountyNo: r.bounty_no || "",
    description: r.description || "",
    assignees: rel.assignees,
    assignedAt: r.assigned_at,
    assignedBy: r.assigned_by,
    status: r.status_code,
    lockOverridden: !!r.lock_overridden,
    slaExtensionDays: r.sla_extension_days || 0,
    cancelReason: r.cancel_reason || "",
    closedAt: r.closed_at,
    // 05/08 are terminal; 06/07/09 count as closed only after the explicit close action
    closed: ["05", "08"].includes(r.status_code) || r.closed_at != null,
    followups: rel.followups,
    decisions: rel.decisions,
    attachments: rel.attachments,
    investigations: rel.investigations,
    // derived summary (earliest of each kind) — keeps SLA + step "done" logic working
    investigation: deriveInvestigation(rel.investigations),
    board,
    fines: rel.fines,
    createdBy: r.created_by,
    createdByUserId: r.created_by_user_id,
    createdByName: r.created_by_name || r.created_by,
    returned: !!r.returned,
    returnReason: r.return_reason || "",
    isDraft: !!r.is_draft,
    createdAt: r.created_at,
    timeline: rel.timeline,
  };
}

async function attachRelations(rows) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const ph = ids.map(() => "?").join(",");
  const [laws] = await pool.query(`SELECT case_id, law_id FROM case_laws WHERE case_id IN (${ph})`, ids);
  const [problems] = await pool.query(
    `SELECT cp.case_id, p.name FROM case_problems cp JOIN problems p ON p.id = cp.problem_id WHERE cp.case_id IN (${ph})`, ids);
  const [assignees] = await pool.query(`SELECT case_id, user_id FROM case_assignees WHERE case_id IN (${ph})`, ids);
  const [atts] = await pool.query(`SELECT case_id, id, name, size, type, (stored_name IS NOT NULL) AS hasFile FROM case_attachments WHERE case_id IN (${ph}) ORDER BY id`, ids);
  const [boardCom] = await pool.query(
    `SELECT bc.case_id, c.name FROM case_board_committees bc JOIN committees c ON c.id = bc.committee_id WHERE bc.case_id IN (${ph})`, ids);
  const [boardSec] = await pool.query(
    `SELECT case_id, section_id AS secId, count, fine FROM case_board_sections WHERE case_id IN (${ph}) ORDER BY id`, ids);
  const [fines] = await pool.query(
    `SELECT case_id, id AS fineId, section_id AS secId, count, amount, paid, paid_date AS paidDate, paid_amount AS paidAmount
     FROM case_fines WHERE case_id IN (${ph}) ORDER BY seq`, ids);
  const [timeline] = await pool.query(
    `SELECT case_id, date, time, title, user_name AS user, kind, status FROM case_timeline WHERE case_id IN (${ph}) ORDER BY seq`, ids);
  const [investigations] = await pool.query(
    `SELECT case_id, id, kind, date, place, result FROM case_investigations WHERE case_id IN (${ph}) ORDER BY seq, id`, ids);
  const [followups] = await pool.query(
    `SELECT case_id, id, date, destination, detail, user_name AS user, created_at AS createdAt
     FROM case_followups WHERE case_id IN (${ph}) ORDER BY seq, id`, ids);
  const [decisions] = await pool.query(
    `SELECT case_id, id, path, from_status AS fromStatus, to_status AS toStatus, reason, user_name AS user, created_at AS createdAt
     FROM case_decisions WHERE case_id IN (${ph}) ORDER BY seq, id`, ids);
  const [meetings] = await pool.query(
    `SELECT case_id, id, meeting_no AS meetingNo, year, meeting_date AS meetingDate, resolution, notes, created_at AS createdAt
     FROM case_board_meetings WHERE case_id IN (${ph}) ORDER BY seq, id`, ids);
  let meetingCom = [], meetingSec = [];
  if (meetings.length) {
    const mids = meetings.map((m) => m.id);
    const mph = mids.map(() => "?").join(",");
    [meetingCom] = await pool.query(
      `SELECT mc.meeting_id, c.name FROM case_board_meeting_committees mc JOIN committees c ON c.id = mc.committee_id WHERE mc.meeting_id IN (${mph})`, mids);
    [meetingSec] = await pool.query(
      `SELECT meeting_id, section_id AS secId, count, fine FROM case_board_meeting_sections WHERE meeting_id IN (${mph}) ORDER BY id`, mids);
  }
  const gMeetingCom = groupBy(meetingCom, "meeting_id");
  const gMeetingSec = groupBy(meetingSec, "meeting_id");

  const gLaws = groupBy(laws, "case_id");
  const gProblems = groupBy(problems, "case_id");
  const gAssignees = groupBy(assignees, "case_id");
  const gAtts = groupBy(atts, "case_id");
  const gBoardCom = groupBy(boardCom, "case_id");
  const gBoardSec = groupBy(boardSec, "case_id");
  const gFines = groupBy(fines, "case_id");
  const gTimeline = groupBy(timeline, "case_id");
  const gInv = groupBy(investigations, "case_id");
  const gFollowups = groupBy(followups, "case_id");
  const gDecisions = groupBy(decisions, "case_id");
  const gMeetings = groupBy(meetings, "case_id");

  return rows.map((r) =>
    buildShape(r, {
      investigations: (gInv.get(r.id) || []).map((x) => ({ id: x.id, kind: x.kind, date: x.date, place: x.place || "", result: x.result || "" })),
      followups: (gFollowups.get(r.id) || []).map((x) => ({ id: x.id, date: x.date, destination: x.destination || "", detail: x.detail || "", user: x.user || "", createdAt: x.createdAt })),
      decisions: (gDecisions.get(r.id) || []).map((x) => ({ id: x.id, path: x.path, fromStatus: x.fromStatus, toStatus: x.toStatus, reason: x.reason || "", user: x.user || "", createdAt: x.createdAt })),
      boardMeetings: (gMeetings.get(r.id) || []).map((m) => ({
        id: m.id, meetingNo: m.meetingNo, year: m.year, meetingDate: m.meetingDate,
        resolution: m.resolution || "", notes: m.notes || "", createdAt: m.createdAt,
        committees: (gMeetingCom.get(m.id) || []).map((x) => x.name),
        sections: (gMeetingSec.get(m.id) || []).map((x) => ({ secId: x.secId, count: x.count, fine: x.fine })),
      })),
      laws: (gLaws.get(r.id) || []).map((x) => x.law_id),
      problems: (gProblems.get(r.id) || []).map((x) => x.name),
      assignees: (gAssignees.get(r.id) || []).map((x) => x.user_id),
      attachments: (gAtts.get(r.id) || []).map((x) => ({ id: x.id, name: x.name, size: x.size, type: x.type, hasFile: !!x.hasFile })),
      boardCom: (gBoardCom.get(r.id) || []).map((x) => x.name),
      boardSec: (gBoardSec.get(r.id) || []).map((x) => ({ secId: x.secId, count: x.count, fine: x.fine })),
      fines: (gFines.get(r.id) || []).map((x) => ({
        fineId: x.fineId, secId: x.secId, count: x.count, amount: x.amount,
        paid: !!x.paid, paidDate: x.paidDate, paidAmount: x.paidAmount,
      })),
      timeline: gTimeline.get(r.id) || [],
    })
  );
}

async function getCaseById(id) {
  const [rows] = await pool.query(`${CASE_SELECT} WHERE c.id = ?`, [id]);
  if (!rows.length) return null;
  const [assembled] = await attachRelations(rows);
  return assembled;
}

async function getAllCases() {
  const [rows] = await pool.query(`${CASE_SELECT} ORDER BY c.created_at DESC, c.id DESC`);
  return attachRelations(rows);
}

// Filtering mirrors the prototype's client-side case-list logic.
async function listCases(filters, currentRole) {
  const { q, status = [], law = [], slaFilter = "", scope = "all", page = 1, pageSize = 20 } = filters;
  let all = await getAllCases();

  all = all.filter((c) => {
    // drafts are private to their creator until submitted for approval
    if (c.isDraft && !(currentRole && currentRole.userId != null && c.createdByUserId === currentRole.userId)) return false;
    if (scope === "mine" && currentRole) {
      const byMe = currentRole.userId != null && c.createdByUserId === currentRole.userId;
      const assignedToMe = currentRole.userId != null && c.assignees.includes(currentRole.userId);
      if (!byMe && !assignedToMe) return false;
    }
    if (q) {
      const needle = q.toLowerCase();
      const hay = [c.etracking, c.title, c.respondent.business, c.respondent.licensee].join(" ").toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (status.length && !status.includes(c.status)) return false;
    if (law.length && !c.laws.some((l) => law.includes(l))) return false;
    if (slaFilter) {
      const s = sla.caseSla(c);
      if (slaFilter === "near" && s.kind !== "near") return false;
      if (slaFilter === "overdue" && s.kind !== "overdue") return false;
      if (slaFilter === "in-time" && s.kind !== "in-time") return false;
    }
    return true;
  });

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  const items = all.slice((p - 1) * pageSize, p * pageSize);
  return { items, total, page: p, totalPages };
}

// ---------- helpers for writes ----------
async function idByName(conn, table, name) {
  if (!name) return null;
  const [rows] = await conn.query(`SELECT id FROM ${table} WHERE name = ? LIMIT 1`, [name]);
  return rows.length ? rows[0].id : null;
}

// subdistrict names repeat across districts (e.g. "บ้านใหม่") → resolve within the district
async function subdistrictIdByName(conn, districtName, name) {
  if (!districtName || !name) return null;
  const [rows] = await conn.query(
    `SELECT sd.id FROM subdistricts sd JOIN districts d ON d.id = sd.district_id
     WHERE d.name = ? AND sd.name = ? LIMIT 1`, [districtName, name]);
  return rows.length ? rows[0].id : null;
}

async function nextSeq(conn, caseId) {
  const [rows] = await conn.query("SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM case_timeline WHERE case_id = ?", [caseId]);
  return rows[0].n;
}

async function addTimeline(conn, caseId, { title, user, kind, status = "in-time", date, time }) {
  const seq = await nextSeq(conn, caseId);
  const d = date || sla.TODAY();
  const t = time || new Date().toTimeString().slice(0, 5);
  await conn.query(
    "INSERT INTO case_timeline (case_id, date, time, title, user_name, kind, status, seq) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [caseId, d, t, title, user, kind, status, seq]
  );
}

// Insert one notification row for a specific recipient (recipientUserId required —
// notifications are per-user; broadcast rows only exist in legacy seed data).
async function addNotification(conn, { icon, title, caseId, recipientUserId }) {
  if (recipientUserId == null) return; // no recipient → nothing to notify
  const id = "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4) + recipientUserId;
  const [rows] = await conn.query("SELECT COALESCE(MAX(ord), 0) + 1 AS n FROM notifications");
  await conn.query(
    "INSERT INTO notifications (id, icon, title, time_text, unread, case_id, recipient_user_id, ord) VALUES (?, ?, ?, ?, 1, ?, ?, ?)",
    [id, icon, title, "เมื่อสักครู่", caseId, recipientUserId, rows[0].n]
  );
}

// Fan a notification out to several recipients (deduped).
async function notifyUsers(conn, userIds, payload) {
  for (const uid of [...new Set(userIds.filter((x) => x != null))]) {
    await addNotification(conn, { ...payload, recipientUserId: uid });
  }
}

// Active user ids holding any of the given roles (e.g. heads/admins for approval alerts).
async function userIdsForRoles(conn, roles) {
  if (!roles.length) return [];
  const ph = roles.map(() => "?").join(",");
  const [rows] = await conn.query(`SELECT id FROM users WHERE role_id IN (${ph}) AND active = 1`, roles);
  return rows.map((r) => r.id);
}

// Assignees must be real logins: active users with role เจ้าหน้าที่ดำเนินการ (officer).
// Returns the matching rows (id + name) or throws 400 when any id is invalid.
async function assertAssignableUsers(conn, userIds) {
  if (!userIds.length) { const e = new Error("กรุณาเลือกเจ้าหน้าที่อย่างน้อย 1 คน"); e.status = 400; throw e; }
  const ph = userIds.map(() => "?").join(",");
  const [rows] = await conn.query(
    `SELECT id, name FROM users WHERE id IN (${ph}) AND active = 1 AND role_id = 'officer'`, userIds);
  if (rows.length !== userIds.length) {
    const e = new Error("มอบหมายได้เฉพาะบัญชีเจ้าหน้าที่ดำเนินการที่เปิดใช้งานเท่านั้น"); e.status = 400; throw e;
  }
  return rows;
}

// Server-side validation for new cases (defense-in-depth; the form validates too)
function validateCreate(p) {
  const errors = [];
  const today = sla.TODAY();
  if (!p.title || p.title.length < 5 || p.title.length > 200) errors.push("ชื่อกรณีต้องมี 5–200 ตัวอักษร");
  if (!p.letterNo) errors.push("กรุณากรอกเลขรับหนังสือ");
  if (!p.postNo) errors.push("กรุณากรอกเลขรับ POST");
  if (!p.postDate) errors.push("กรุณาระบุวันลงรับ POST");
  if (p.postDate && p.postDate > today) errors.push("วันลงรับ POST เป็นอนาคตไม่ได้");
  if (p.letterDate && p.letterDate > today) errors.push("วันที่หนังสือเป็นอนาคตไม่ได้");
  if (!p.complainant || !p.complainant.channel) errors.push("กรุณาเลือกช่องทางการร้องเรียน");
  if (!p.respondent || (!p.respondent.licensee && !p.respondent.business)) errors.push("กรอกผู้รับอนุญาตหรือสถานประกอบการอย่างน้อย 1");
  if (!Array.isArray(p.laws) || p.laws.length === 0) errors.push("เลือกพรบ. อย่างน้อย 1 หมวด");
  if (!p.source) errors.push("เลือกที่มาของผู้ร้อง");
  if (!Array.isArray(p.problems) || p.problems.length === 0) errors.push("เลือกประเภทปัญหาอย่างน้อย 1 ข้อ");
  if (p.bountyRequested) {
    if (!p.bountyFirstName) errors.push("กรุณากรอกชื่อผู้ประสงค์รับสินบนนำจับ");
    if (!p.bountyLastName) errors.push("กรุณากรอกนามสกุลผู้ประสงค์รับสินบนนำจับ");
  }
  return errors;
}

function newCaseId() {
  return "case-" + Math.random().toString(36).slice(2, 8);
}

// Human-readable case reference for notifications — etracking is optional now
function caseRef(c) {
  return c.etracking || c.title;
}

async function fetchOr404(id) {
  const c = await getCaseById(id);
  if (!c) { const e = new Error("ไม่พบเคส"); e.status = 404; throw e; }
  return c;
}

// Guards a workflow action: case must exist, not be locked, and be in an allowed status.
async function assertActionable(id, allowed) {
  const c = await fetchOr404(id);
  if (sla.isCaseLocked(c)) { const e = new Error("เคสถูกล็อก เกินกำหนด SLA — ไม่สามารถดำเนินการได้"); e.status = 423; throw e; }
  if (allowed && !allowed.includes(c.status)) {
    const e = new Error(`ดำเนินการขั้นตอนนี้ไม่ได้: สถานะปัจจุบันของเคสคือ "${c.status}"`);
    e.status = 409;
    throw e;
  }
  return c;
}

// ---------- create ----------
async function createCase(payload, user) {
  const errors = validateCreate(payload);
  if (errors.length) { const e = new Error(errors[0]); e.status = 400; e.errors = errors; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id = newCaseId();
    const today = sla.TODAY();
    const isDraft = !!payload.draft;
    const sourceId = await idByName(conn, "sources", payload.source);
    const channelId = await idByName(conn, "channels", payload.complainant?.channel);
    const districtId = await idByName(conn, "districts", payload.respondent?.district);
    const subdistrictId = await subdistrictIdByName(conn, payload.respondent?.district, payload.respondent?.subdistrict);

    await conn.query(
      `INSERT INTO cases (
        id, etracking, letter_no, letter_date, post_no, post_date, title,
        source_id, product, product_license, bounty_amount, bounty_requested, bounty_first_name, bounty_last_name, bounty_no, description, status_code,
        complainant_name, complainant_phone, complainant_email, complainant_address, complainant_anonymous, complainant_channel_id,
        respondent_licensee, respondent_business, respondent_address, respondent_license_no, respondent_district_id, respondent_subdistrict_id,
        is_draft, created_by, created_by_user_id, created_at
      ) VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?)`,
      [
        id, String(payload.etracking || "").trim() || null, payload.letterNo, payload.letterDate || null, payload.postNo, payload.postDate || null, payload.title,
        sourceId, payload.product || null, payload.productLicense || null,
        payload.bountyAmount || null,
        payload.bountyRequested ? 1 : 0, payload.bountyFirstName || null, payload.bountyLastName || null, payload.bountyNo || null,
        payload.description || null, "01",
        payload.complainant?.name || null, payload.complainant?.phone || null, payload.complainant?.email || null,
        payload.complainant?.address || null, payload.complainant?.anonymous ? 1 : 0, channelId,
        payload.respondent?.licensee || null, payload.respondent?.business || null, payload.respondent?.address || null,
        payload.respondent?.licenseNo || null, districtId, subdistrictId,
        isDraft ? 1 : 0, user.roleId, user.userId ?? null, today,
      ]
    );

    for (const lawId of payload.laws || []) {
      await conn.query("INSERT IGNORE INTO case_laws (case_id, law_id) VALUES (?, ?)", [id, lawId]);
    }
    for (const name of payload.problems || []) {
      const pid = await idByName(conn, "problems", name);
      if (pid) await conn.query("INSERT IGNORE INTO case_problems (case_id, problem_id) VALUES (?, ?)", [id, pid]);
    }
    // real files are uploaded separately via POST /cases/:id/attachments after creation
    if (isDraft) {
      // draft: visible only to the creator — heads are notified when it is submitted
      await addTimeline(conn, id, { title: "บันทึกร่างเคส (ยังไม่ส่งขออนุมัติ)", user: user.name, kind: "create" });
    } else {
      await addTimeline(conn, id, { title: "สร้างเคสในระบบ", user: user.name, kind: "create" });
      // heads/admins have the approval queue → notify them of the new case
      await notifyUsers(conn, await userIdsForRoles(conn, ["head", "admin"]), { icon: "info", title: `เคสใหม่รออนุมัติ: ${payload.title}`, caseId: id });
    }

    await conn.commit();
    return id;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// ---------- workflow ----------
// Head approves + assigns the case to เจ้าหน้าที่ดำเนินการ (user accounts) — the
// assignees log in and drive every following step of the workflow.
async function assignCase(id, userIds, byRole, byName, note) {
  const c = await assertActionable(id, ["01"]);
  if (c.isDraft) { const e = new Error("เคสยังเป็นร่าง — ผู้สร้างต้องส่งขออนุมัติก่อนจึงจะมอบหมายได้"); e.status = 409; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const assignees = await assertAssignableUsers(conn, userIds);
    await conn.query("UPDATE cases SET assigned_at = ?, assigned_by = ?, status_code = '02' WHERE id = ?", [sla.TODAY(), byRole, id]);
    await conn.query("DELETE FROM case_assignees WHERE case_id = ?", [id]);
    for (const uid of userIds) {
      await conn.query("INSERT IGNORE INTO case_assignees (case_id, user_id) VALUES (?, ?)", [id, uid]);
    }
    await addTimeline(conn, id, {
      title: `อนุมัติและมอบหมายให้ ${assignees.map((a) => a.name).join(", ")}${note ? ` — ${note}` : ""}`,
      user: byName, kind: "assign",
    });
    // notify only the officers who were actually assigned
    await notifyUsers(conn, userIds, { icon: "info", title: `ได้รับมอบหมายเคส: ${c.title}`, caseId: id });
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCaseById(id);
}

async function saveInvestigation(id, p, byName) {
  await assertActionable(id, ["02"]);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE cases SET inv_site_visit_date=?, inv_site_place=?, inv_site_result=?,
        inv_meeting_date=?, inv_meeting_place=?, inv_meeting_summary=? WHERE id=?`,
      [p.siteVisitDate || null, p.sitePlace || "", p.siteResult || "", p.meetingDate || null, p.meetingPlace || "", p.meetingSummary || "", id]
    );
    await addTimeline(conn, id, { title: "บันทึกการตรวจสอบข้อเท็จจริง", user: byName, kind: "investigate" });
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCaseById(id);
}

// Route the case down one of the 4 paths — from the investigation stage (02) or,
// since the board/fine/police modals offer the same chooser, from 03/04/07 as well.
// A mid-flow course change (from 04/07 — e.g. ผู้ถูกร้องไม่ชำระค่าปรับ) requires a reason.
async function decision(id, path, reason, byName) {
  const c = await assertActionable(id, ["02", "03", "04", "07"]);
  // forward/police/stop no longer close the case — they enter a follow-up status
  // where the officer keeps recording progress until the explicit close action
  const map = {
    board: { status: "03", label: "เข้าคณะกรรมการ", line: "เลือกแนวทาง: เข้ากรรมการ" },
    forward: { status: "06", label: "ส่งต่อหน่วยงาน", line: "เลือกแนวทาง: ส่งต่อหน่วยงานอื่น — ติดตามผลจนกว่าจะปิดเคส" },
    stop: { status: "09", label: "เสนอนายแพทย์ยุติเรื่อง", line: "เลือกแนวทาง: เสนอนายแพทย์ยุติเรื่อง — อยู่ระหว่างเสนอ" },
    police: { status: "07", label: "แจ้งความ/ดำเนินคดี", line: "เลือกแนวทาง: แจ้งความ/ดำเนินคดี — ติดตามผลจนกว่าจะปิดเคส" },
  };
  const d = map[path];
  if (!d) { const e = new Error("แนวทางไม่ถูกต้อง"); e.status = 400; throw e; }
  if (d.status === c.status) { const e = new Error("เคสอยู่ในขั้นตอนนี้อยู่แล้ว"); e.status = 409; throw e; }
  const why = String(reason || "").trim();
  if (["04", "07"].includes(c.status) && !why) { const e = new Error("กรุณาระบุเหตุผลในการเปลี่ยนแนวทาง"); e.status = 400; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET status_code = ? WHERE id = ?", [d.status, id]);
    const [seqRow] = await conn.query("SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM case_decisions WHERE case_id = ?", [id]);
    await conn.query(
      "INSERT INTO case_decisions (case_id, path, from_status, to_status, reason, user_name, seq) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, path, c.status, d.status, why || null, byName, seqRow[0].n]
    );
    await addTimeline(conn, id, { title: `${d.line}${why ? ` — เหตุผล: ${why}` : ""}`, user: byName, kind: "decision" });
    // course change after the investigation stage → heads/admins should know
    if (c.status !== "02") {
      await notifyUsers(conn, await userIdsForRoles(conn, ["head", "admin"]), { icon: "info", title: `เคส ${caseRef(c)} เปลี่ยนแนวทาง: ${d.label}`, caseId: id });
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCaseById(id);
}

// ---------- follow-up statuses (06 ส่งต่อ / 07 ดำเนินคดี / 09 เสนอนายแพทย์) ----------
const FOLLOWUP_LABEL = { "06": "การส่งต่อหน่วยงาน", "07": "การแจ้งความ/ดำเนินคดี", "09": "การเสนอนายแพทย์" };

// Records one follow-up entry (ส่งไปไหน + เนื้อหา) — repeatable until the case is closed.
async function addFollowup(id, payload, user) {
  const c = await fetchOr404(id);
  if (!FOLLOWUP_LABEL[c.status]) { const e = new Error("บันทึกติดตามผลได้เฉพาะเคสสถานะ ส่งต่อ/ดำเนินคดี/เสนอนายแพทย์"); e.status = 409; throw e; }
  if (c.closed) { const e = new Error("เคสนี้ปิดแล้ว — บันทึกเพิ่มไม่ได้"); e.status = 409; throw e; }
  const destination = (payload.destination || "").trim();
  const detail = (payload.detail || "").trim();
  if (!destination && !detail) { const e = new Error("กรุณากรอกหน่วยงาน/สถานที่ หรือรายละเอียด"); e.status = 400; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query("SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM case_followups WHERE case_id = ?", [id]);
    await conn.query(
      "INSERT INTO case_followups (case_id, date, destination, detail, user_name, seq) VALUES (?, ?, ?, ?, ?, ?)",
      [id, payload.date || sla.TODAY(), destination || null, detail || null, user.name, rows[0].n]
    );
    await addTimeline(conn, id, {
      title: `บันทึก${FOLLOWUP_LABEL[c.status]}${destination ? ` — ${destination}` : ""}`,
      user: user.name, kind: "decision",
    });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Explicitly closes a follow-up case: 06/07 keep their status (closed_at marks the end),
// 09 resolves to 05 ยุติคดี (นายแพทย์เห็นชอบยุติเรื่อง).
async function closeFollowupCase(id, user) {
  const c = await fetchOr404(id);
  if (!FOLLOWUP_LABEL[c.status]) { const e = new Error("ปิดเคสจากสถานะนี้ไม่ได้"); e.status = 409; throw e; }
  if (c.closed) { const e = new Error("เคสนี้ปิดแล้ว"); e.status = 409; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const today = sla.TODAY();
    if (c.status === "09") {
      await conn.query("UPDATE cases SET status_code = '05', closed_at = ? WHERE id = ?", [today, id]);
      await addTimeline(conn, id, { title: "นายแพทย์ สสจ. เห็นชอบยุติเรื่อง — ปิดเคส (ยุติคดี)", user: user.name, kind: "close" });
    } else {
      await conn.query("UPDATE cases SET closed_at = ? WHERE id = ?", [today, id]);
      await addTimeline(conn, id, { title: `ปิดเคส — สิ้นสุด${FOLLOWUP_LABEL[c.status]}`, user: user.name, kind: "close" });
    }
    await notifyUsers(conn, await userIdsForRoles(conn, ["head", "admin"]), { icon: "success", title: `เคส ${caseRef(c)} ปิดแล้ว`, caseId: id });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Send a follow-up case back into the board queue (03) for another round of
// committee consideration — used from the แจ้งความ/ดำเนินคดี (07) stage when the
// case needs to be reconsidered by the คณะกรรมการ.
async function sendFollowupToBoard(id, user) {
  const c = await fetchOr404(id);
  if (c.status !== "07") { const e = new Error("ส่งเข้าคณะกรรมการอีกครั้งได้เฉพาะเคสสถานะแจ้งความ/ดำเนินคดี"); e.status = 409; throw e; }
  if (c.closed) { const e = new Error("เคสนี้ปิดแล้ว"); e.status = 409; throw e; }
  if (sla.isCaseLocked(c)) { const e = new Error("เคสถูกล็อก เกินกำหนด SLA — ไม่สามารถดำเนินการได้"); e.status = 423; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET status_code = '03' WHERE id = ?", [id]);
    await addTimeline(conn, id, { title: "ส่งเข้าคณะกรรมการเพื่อพิจารณาอีกครั้ง (จากขั้นแจ้งความ/ดำเนินคดี)", user: user.name, kind: "decision" });
    await notifyUsers(conn, await userIdsForRoles(conn, ["head", "admin"]), { icon: "info", title: `เคส ${caseRef(c)} ส่งเข้าคณะกรรมการเพื่อพิจารณาอีกครั้ง`, caseId: id });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

const FINE_RESOLUTIONS = ["เปรียบเทียบปรับ", "ออกคำสั่งปรับพินัย"];

// Record one board meeting — appends to history, keeps the case at 03.
// Without a resolution it is a pending proposal (เสนอเข้าที่ประชุม — ยังไม่มีวันที่/มติ,
// SLA keeps counting); the next save completes that pending entry instead of appending.
// The case moves on only when the officer applies the latest resolution (applyBoardResolution).
async function saveBoard(id, p, byName) {
  await assertActionable(id, ["03"]);
  if (!Array.isArray(p.committees) || p.committees.length === 0) { const e = new Error("กรุณาเลือกคณะกรรมการ"); e.status = 400; throw e; }
  const isPending = !p.resolution;
  if (!isPending) {
    if (!p.meetingNo || !p.meetingDate) { const e = new Error("กรุณาระบุครั้งที่ประชุมและวันที่ประชุม"); e.status = 400; throw e; }
    if (FINE_RESOLUTIONS.includes(p.resolution)) {
      if (!Array.isArray(p.sections) || p.sections.length === 0) {
        const e = new Error("มติเปรียบเทียบปรับ/ปรับพินัย ต้องระบุมาตราอย่างน้อย 1 รายการ"); e.status = 400; throw e;
      }
      // amount is editable in the UI — accept any positive number
      for (const s of p.sections) {
        if (!Number.isFinite(Number(s.fine)) || Number(s.fine) <= 0) {
          const e = new Error("ค่าปรับแต่ละมาตราต้องเป็นจำนวนเงินมากกว่า 0"); e.status = 400; throw e;
        }
      }
    }
  }
  const sections = isPending ? [] : p.sections || [];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // if the latest entry is still pending (no resolution yet), update it; otherwise append
    const [last] = await conn.query(
      "SELECT id, resolution FROM case_board_meetings WHERE case_id = ? ORDER BY seq DESC, id DESC LIMIT 1", [id]);
    let meetingId;
    if (last.length && !last[0].resolution) {
      meetingId = last[0].id;
      await conn.query(
        "UPDATE case_board_meetings SET meeting_no=?, year=?, meeting_date=?, resolution=?, notes=? WHERE id=?",
        [p.meetingNo || null, p.year || null, p.meetingDate || null, p.resolution || null, p.notes || "", meetingId]);
      await conn.query("DELETE FROM case_board_meeting_committees WHERE meeting_id = ?", [meetingId]);
      await conn.query("DELETE FROM case_board_meeting_sections WHERE meeting_id = ?", [meetingId]);
    } else {
      const [seqRow] = await conn.query("SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM case_board_meetings WHERE case_id = ?", [id]);
      const [mr] = await conn.query(
        "INSERT INTO case_board_meetings (case_id, meeting_no, year, meeting_date, resolution, notes, seq) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, p.meetingNo || null, p.year || null, p.meetingDate || null, p.resolution || null, p.notes || "", seqRow[0].n]
      );
      meetingId = mr.insertId;
    }
    for (const name of p.committees || []) {
      const cid = await idByName(conn, "committees", name);
      if (cid) await conn.query("INSERT IGNORE INTO case_board_meeting_committees (meeting_id, committee_id) VALUES (?, ?)", [meetingId, cid]);
    }
    for (const s of sections) {
      await conn.query("INSERT INTO case_board_meeting_sections (meeting_id, section_id, count, fine) VALUES (?, ?, ?, ?)", [meetingId, s.secId, s.count, s.fine]);
    }

    // sync the legacy latest-meeting snapshot on cases + join tables (SLA + older UI read these);
    // a pending entry keeps board_meeting_date NULL so the board SLA clock keeps counting
    await conn.query(
      "UPDATE cases SET has_board=1, board_meeting_no=?, board_year=?, board_meeting_date=?, board_resolution=?, board_notes=? WHERE id=?",
      [p.meetingNo || null, p.year || null, p.meetingDate || null, p.resolution || null, p.notes || "", id]
    );
    await conn.query("DELETE FROM case_board_committees WHERE case_id = ?", [id]);
    for (const name of p.committees || []) {
      const cid = await idByName(conn, "committees", name);
      if (cid) await conn.query("INSERT IGNORE INTO case_board_committees (case_id, committee_id) VALUES (?, ?)", [id, cid]);
    }
    await conn.query("DELETE FROM case_board_sections WHERE case_id = ?", [id]);
    for (const s of sections) {
      await conn.query("INSERT INTO case_board_sections (case_id, section_id, count, fine) VALUES (?, ?, ?, ?)", [id, s.secId, s.count, s.fine]);
    }

    await addTimeline(conn, id, {
      title: isPending
        ? `เสนอเข้าที่ประชุม ${(p.committees || []).join(", ")}${p.meetingNo ? ` ครั้งที่ ${p.meetingNo}/${p.year || "—"}` : ""} — รอประชุม`
        : `ประชุม ${(p.committees || []).join(", ")} ครั้งที่ ${p.meetingNo}/${p.year} — มติ: ${p.resolution}`,
      user: byName, kind: "board",
    });
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCaseById(id);
}

// Apply the latest recorded resolution → move the case forward (04/05/07) and create fines if needed.
async function applyBoardResolution(id, byName) {
  const c = await assertActionable(id, ["03"]);
  const meetings = c.boardMeetings || [];
  const latest = meetings[meetings.length - 1];
  if (!latest || !latest.resolution) { const e = new Error("ยังไม่มีมติที่บันทึกไว้ — กรุณาบันทึกมติก่อน"); e.status = 409; throw e; }

  let newStatus, line;
  const makeFines = FINE_RESOLUTIONS.includes(latest.resolution);
  if (latest.resolution === "ยุติเรื่อง") { newStatus = "05"; line = "ปิดเคส: ยุติคดีตามมติคณะกรรมการ"; }
  else if (latest.resolution === "ดำเนินคดี (ส่งตำรวจ)" || latest.resolution === "ส่งอัยการ") { newStatus = "07"; line = "ปิดเคส: ดำเนินคดีตามมติคณะกรรมการ"; }
  else if (makeFines) { newStatus = "04"; line = null; }
  else { const e = new Error(`มติ "${latest.resolution}" ไม่สามารถดำเนินการต่ออัตโนมัติได้`); e.status = 400; throw e; }
  if (makeFines && (!latest.sections || latest.sections.length === 0)) {
    const e = new Error("มติล่าสุดไม่มีมาตรา/ค่าปรับ — กรุณาบันทึกมติใหม่พร้อมมาตรา"); e.status = 400; throw e;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET status_code = ? WHERE id = ?", [newStatus, id]);
    if (makeFines) {
      await conn.query("DELETE FROM case_fines WHERE case_id = ?", [id]);
      let seq = 0;
      for (const s of latest.sections) {
        await conn.query(
          "INSERT INTO case_fines (case_id, section_id, count, amount, paid, paid_amount, seq) VALUES (?, ?, ?, ?, 0, 0, ?)",
          [id, s.secId, s.count, s.fine, seq++]
        );
      }
    }
    await addTimeline(conn, id, { title: `ดำเนินการตามมติ: ${latest.resolution} (ครั้งที่ ${latest.meetingNo}/${latest.year})`, user: byName, kind: "decision" });
    if (line) await addTimeline(conn, id, { title: line, user: "—", kind: "close" });
    // the fine stage is handled by เจ้าหน้าที่ค่าปรับ — tell them a case just entered it
    if (makeFines) {
      await notifyUsers(conn, await userIdsForRoles(conn, ["fine"]), { icon: "info", title: `เคส ${caseRef(c)} เข้าสู่ขั้นชำระค่าปรับ`, caseId: id });
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCaseById(id);
}

// Record a (possibly partial) fine payment. The case stays at 04 even when everything
// is paid — closing is an explicit officer action (closeFineCase).
async function savePayment(id, fineId, paidDate, amount, byName) {
  const c = await assertActionable(id, ["04"]);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [own] = await conn.query("SELECT id, amount, paid, paid_amount FROM case_fines WHERE id = ? AND case_id = ?", [fineId, id]);
    if (!own.length) { const e = new Error("ไม่พบรายการค่าปรับ"); e.status = 404; throw e; }
    if (own[0].paid) { const e = new Error("รายการนี้ชำระครบแล้ว"); e.status = 409; throw e; }
    const remaining = Number(own[0].amount) - Number(own[0].paid_amount || 0);
    const pay = Number(amount);
    if (!Number.isFinite(pay) || pay <= 0) { const e = new Error("จำนวนเงินต้องมากกว่า 0"); e.status = 400; throw e; }
    if (pay > remaining) { const e = new Error(`จำนวนเงินเกินยอดคงเหลือ (คงเหลือ ${remaining.toLocaleString("th-TH")} บาท)`); e.status = 400; throw e; }

    const newPaidAmount = Number(own[0].paid_amount || 0) + pay;
    const fullyPaid = newPaidAmount >= Number(own[0].amount);
    await conn.query("UPDATE case_fines SET paid = ?, paid_date = ?, paid_amount = ? WHERE id = ?", [fullyPaid ? 1 : 0, paidDate, newPaidAmount, fineId]);

    const left = remaining - pay;
    await addTimeline(conn, id, {
      title: `บันทึกการชำระค่าปรับ ${pay.toLocaleString("th-TH")} บาท${fullyPaid ? " (ชำระครบรายการนี้)" : ` (คงเหลือ ${left.toLocaleString("th-TH")} บาท)`}`,
      user: byName, kind: "fine",
    });

    const [fines] = await conn.query("SELECT paid FROM case_fines WHERE case_id = ?", [id]);
    const allPaid = fines.length > 0 && fines.every((f) => f.paid);
    if (allPaid) {
      await addTimeline(conn, id, { title: "ค่าปรับทั้งหมดชำระครบ — รอเจ้าหน้าที่ปิดเคส", user: "—", kind: "fine" });
      // assignees + fine officers close the case; heads/admins oversee it
      const payRecipients = [...c.assignees, ...await userIdsForRoles(conn, ["head", "admin", "fine"])];
      await notifyUsers(conn, payRecipients, { icon: "success", title: `เคส ${caseRef(c)} ชำระค่าปรับครบแล้ว — พร้อมปิดเคส`, caseId: id });
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCaseById(id);
}

// Officer closes a fully-paid fine case (04 → 05).
async function closeFineCase(id, byName) {
  const c = await assertActionable(id, ["04"]);
  const allPaid = c.fines.length > 0 && c.fines.every((f) => f.paid);
  if (!allPaid) { const e = new Error("ยังชำระค่าปรับไม่ครบ — ปิดเคสไม่ได้"); e.status = 409; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET status_code = '05' WHERE id = ?", [id]);
    await addTimeline(conn, id, { title: "ปิดเคส: ยุติคดี (ชำระค่าปรับครบ)", user: byName, kind: "close" });
    await notifyUsers(conn, await userIdsForRoles(conn, ["head", "admin"]), { icon: "success", title: `เคส ${caseRef(c)} ปิดแล้ว (ยุติคดี)`, caseId: id });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Head/admin re-assigns an active case to a new set of officers (status unchanged).
// NOTE: assigned_at is intentionally NOT touched — it is the SLA anchor for the
// investigate/board stages, so changing officers must not restart those clocks.
async function reassignCase(id, userIds, byRole, byName, note) {
  const c = await assertActionable(id, ["02", "03", "04"]);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const assignees = await assertAssignableUsers(conn, userIds);
    await conn.query("UPDATE cases SET assigned_by = ? WHERE id = ?", [byRole, id]);
    await conn.query("DELETE FROM case_assignees WHERE case_id = ?", [id]);
    for (const uid of userIds) {
      await conn.query("INSERT IGNORE INTO case_assignees (case_id, user_id) VALUES (?, ?)", [id, uid]);
    }
    await addTimeline(conn, id, {
      title: `เปลี่ยนผู้รับผิดชอบเป็น ${assignees.map((a) => a.name).join(", ")}${note ? ` — ${note}` : ""}`,
      user: byName, kind: "assign",
    });
    // notify the new set of officers
    await notifyUsers(conn, userIds, { icon: "info", title: `ได้รับมอบหมายเคส (เปลี่ยนผู้รับผิดชอบ): ${c.title}`, caseId: id });
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  return getCaseById(id);
}

// Add one investigation event (a site visit or a meeting) — repeatable; logs to timeline.
async function addInvestigationEvent(id, payload, byName) {
  await assertActionable(id, ["02"]);
  const kind = payload.kind === "meeting" ? "meeting" : "site";
  if (!payload.date) { const e = new Error("กรุณาระบุวันที่"); e.status = 400; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [seqRow] = await conn.query("SELECT COALESCE(MAX(seq), -1) + 1 AS n FROM case_investigations WHERE case_id = ?", [id]);
    await conn.query("INSERT INTO case_investigations (case_id, kind, date, place, result, seq) VALUES (?, ?, ?, ?, ?, ?)",
      [id, kind, payload.date, payload.place || null, payload.result || null, seqRow[0].n]);
    const base = kind === "site" ? "ลงพื้นที่ตรวจสอบ" : "เชิญพบเพื่อชี้แจง";
    await addTimeline(conn, id, { title: `${base}${payload.place ? ` — ${payload.place}` : ""}`, user: byName, kind: "investigate", date: payload.date });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Cancel an active case (→ 08). Allowed even when locked (an admin override decision).
async function cancelCase(id, reason, byName) {
  const c = await fetchOr404(id);
  if (sla.CLOSED.includes(c.status)) { const e = new Error("เคสนี้ปิด/จบแล้ว ยกเลิกไม่ได้"); e.status = 409; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET status_code = '08', cancel_reason = ? WHERE id = ?", [reason || null, id]);
    await addTimeline(conn, id, { title: `ยกเลิกเคส${reason ? ` — ${reason}` : ""}`, user: byName, kind: "close" });
    // the creator and any assignees are the people affected by a cancellation
    const cancelRecipients = [c.createdByUserId, ...c.assignees];
    await notifyUsers(conn, cancelRecipients, { icon: "danger", title: `เคส ${caseRef(c)} ถูกยกเลิก`, caseId: id });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Head/admin extends this case's SLA by N days (cumulative). The extension widens
// every stage window (see sla.service caseSlaSnapshot), so an overdue-locked case
// becomes workable again with a real, still-counting deadline — unlike unlockCase,
// which lifts the lock permanently.
async function extendSla(id, days, reason, user) {
  const c = await fetchOr404(id);
  if (sla.CLOSED.includes(c.status) || c.closed) { const e = new Error("เคสนี้ปิด/จบแล้ว — ไม่ต้องขยายกำหนด"); e.status = 409; throw e; }
  const n = Number(days);
  if (!Number.isInteger(n) || n < 1 || n > 365) { const e = new Error("จำนวนวันที่ขยายต้องเป็นจำนวนเต็ม 1–365 วัน"); e.status = 400; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET sla_extension_days = sla_extension_days + ? WHERE id = ?", [n, id]);
    const total = (c.slaExtensionDays || 0) + n;
    await addTimeline(conn, id, {
      title: `ขยายกำหนด SLA +${n} วัน (รวมขยาย ${total} วัน)${reason ? ` — ${reason}` : ""}`,
      user: user.name, kind: "decision",
    });
    // the people working the case should know the clock moved
    const recipients = [...c.assignees, c.createdByUserId];
    await notifyUsers(conn, recipients, { icon: "info", title: `เคส ${caseRef(c)} ได้รับการขยายกำหนด SLA +${n} วัน`, caseId: id });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Lift the SLA lock so an overdue case can proceed.
async function unlockCase(id, byName) {
  await fetchOr404(id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET lock_overridden = 1 WHERE id = ?", [id]);
    await addTimeline(conn, id, { title: "ปลดล็อก/ขยายกำหนด SLA โดยผู้ดูแล", user: byName, kind: "decision" });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Edit a pending case (status 01). Allowed for the creator or head/admin.
// Editing a returned case re-submits it for approval.
async function updateCase(id, payload, user) {
  const errors = validateCreate(payload);
  if (errors.length) { const e = new Error(errors[0]); e.status = 400; e.errors = errors; throw e; }
  const c = await fetchOr404(id);
  if (c.status !== "01") { const e = new Error("แก้ไขได้เฉพาะเคสที่ยังรอมอบหมาย"); e.status = 409; throw e; }
  if (sla.isCaseLocked(c)) { const e = new Error("เคสถูกล็อก แก้ไขไม่ได้"); e.status = 423; throw e; }
  if (c.createdByUserId !== user.userId) { const e = new Error("แก้ไขได้เฉพาะเจ้าหน้าที่ผู้สร้างเคสเท่านั้น"); e.status = 403; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const sourceId = await idByName(conn, "sources", payload.source);
    const channelId = await idByName(conn, "channels", payload.complainant?.channel);
    const districtId = await idByName(conn, "districts", payload.respondent?.district);
    const subdistrictId = await subdistrictIdByName(conn, payload.respondent?.district, payload.respondent?.subdistrict);

    await conn.query(
      `UPDATE cases SET
        etracking=?, letter_no=?, letter_date=?, post_no=?, post_date=?, title=?,
        source_id=?, product=?, product_license=?, bounty_amount=?, bounty_requested=?, bounty_first_name=?, bounty_last_name=?, bounty_no=?, description=?,
        complainant_name=?, complainant_phone=?, complainant_email=?, complainant_address=?, complainant_anonymous=?, complainant_channel_id=?,
        respondent_licensee=?, respondent_business=?, respondent_address=?, respondent_license_no=?, respondent_district_id=?, respondent_subdistrict_id=?
       WHERE id=?`,
      [
        String(payload.etracking || "").trim() || null, payload.letterNo, payload.letterDate || null, payload.postNo, payload.postDate || null, payload.title,
        sourceId, payload.product || null, payload.productLicense || null,
        payload.bountyAmount || null,
        payload.bountyRequested ? 1 : 0, payload.bountyFirstName || null, payload.bountyLastName || null, payload.bountyNo || null,
        payload.description || null,
        payload.complainant?.name || null, payload.complainant?.phone || null, payload.complainant?.email || null,
        payload.complainant?.address || null, payload.complainant?.anonymous ? 1 : 0, channelId,
        payload.respondent?.licensee || null, payload.respondent?.business || null, payload.respondent?.address || null,
        payload.respondent?.licenseNo || null, districtId, subdistrictId,
        id,
      ]
    );
    await conn.query("DELETE FROM case_laws WHERE case_id=?", [id]);
    for (const lawId of payload.laws || []) await conn.query("INSERT IGNORE INTO case_laws (case_id, law_id) VALUES (?, ?)", [id, lawId]);
    await conn.query("DELETE FROM case_problems WHERE case_id=?", [id]);
    for (const name of payload.problems || []) { const pid = await idByName(conn, "problems", name); if (pid) await conn.query("INSERT IGNORE INTO case_problems (case_id, problem_id) VALUES (?, ?)", [id, pid]); }
    // attachments are managed via the dedicated upload/delete endpoints — do not touch here

    // editing no longer resubmits — the creator resubmits explicitly via POST /cases/:id/submit
    await addTimeline(conn, id, { title: "แก้ไขข้อมูลเคส", user: user.name, kind: "create" });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Set/replace the E-tracking number after creation — the field is optional at
// create time. Allowed for the creator, the assigned officers, or head/admin.
async function setEtracking(id, etracking, user) {
  const value = String(etracking || "").trim();
  if (!value) { const e = new Error("กรุณากรอกเลข E-tracking"); e.status = 400; throw e; }
  const c = await fetchOr404(id);
  const allowed =
    ["head", "admin"].includes(user.roleId) ||
    c.assignees.includes(user.userId) ||
    c.createdByUserId === user.userId;
  if (!allowed) { const e = new Error("เพิ่มเลข E-tracking ได้เฉพาะผู้สร้างเคส เจ้าหน้าที่ที่ได้รับมอบหมาย หรือหัวหน้า/แอดมิน"); e.status = 403; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET etracking = ? WHERE id = ?", [value, id]);
    await addTimeline(conn, id, {
      title: c.etracking ? `แก้ไขเลข E-tracking: ${c.etracking} → ${value}` : `เพิ่มเลข E-tracking: ${value}`,
      user: user.name, kind: "create",
    });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Creator submits a case for head approval: a draft (is_draft 1 → 0) or a
// returned case (returned 1 → 0). Heads/admins get notified either way.
async function submitCase(id, user) {
  const c = await assertActionable(id, ["01"]);
  if (!c.isDraft && !c.returned) { const e = new Error("เคสนี้ถูกส่งขออนุมัติแล้ว"); e.status = 409; throw e; }
  if (c.createdByUserId !== user.userId) { const e = new Error("ส่งขออนุมัติได้เฉพาะผู้สร้างเคสเท่านั้น"); e.status = 403; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (c.isDraft) {
      await conn.query("UPDATE cases SET is_draft = 0 WHERE id = ?", [id]);
      await addTimeline(conn, id, { title: "ส่งขออนุมัติหัวหน้ากลุ่มงาน", user: user.name, kind: "create" });
      await notifyUsers(conn, await userIdsForRoles(conn, ["head", "admin"]), { icon: "info", title: `เคสใหม่รออนุมัติ: ${c.title}`, caseId: id });
    } else {
      // returned case fixed by its creator → back into the approval queue
      await conn.query("UPDATE cases SET returned = 0, return_reason = NULL WHERE id = ?", [id]);
      await addTimeline(conn, id, { title: "แก้ไขและส่งขออนุมัติอีกครั้ง", user: user.name, kind: "create" });
      await notifyUsers(conn, await userIdsForRoles(conn, ["head", "admin"]), { icon: "info", title: `เคส ${caseRef(c)} แก้ไขแล้ว ส่งขออนุมัติอีกครั้ง`, caseId: id });
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// Head/admin sends a pending case back to the officer to fix (stays status 01, flagged returned).
async function returnCase(id, reason, user) {
  const c = await assertActionable(id, ["01"]);
  if (c.isDraft) { const e = new Error("เคสยังเป็นร่าง — ยังไม่ได้ส่งขออนุมัติ จึงส่งกลับไม่ได้"); e.status = 409; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE cases SET returned = 1, return_reason = ? WHERE id = ?", [reason || null, id]);
    await addTimeline(conn, id, { title: `ส่งกลับให้เจ้าหน้าที่แก้ไข${reason ? ` — ${reason}` : ""}`, user: user.name, kind: "decision" });
    // the officer who created the case must fix it
    await notifyUsers(conn, [c.createdByUserId], { icon: "warn", title: `เคส ${caseRef(c)} ถูกส่งกลับให้แก้ไข`, caseId: id });
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  return getCaseById(id);
}

// ---------- bulk import (admin) ----------
function splitList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}
function dateOrNull(v) {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// Pre-import duplicate check: which of the given etrackings already exist.
async function checkEtrackings(etrackings) {
  const list = [...new Set(etrackings.map((v) => String(v || "").trim()).filter(Boolean))].slice(0, 5000);
  if (!list.length) return { existing: [] };
  const [found] = await pool.query("SELECT etracking FROM cases WHERE etracking IN (?)", [list]);
  return { existing: found.map((r) => r.etracking) };
}

// Imports rows (already parsed from Excel on the client) into cases.
async function importCases(rows, user) {
  const result = { total: rows.length, created: 0, failed: [] };
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const etracking = String(r.etracking || "").trim();
      const title = String(r.title || "").trim();
      if (!etracking) throw new Error("ไม่มี E-tracking");
      if (title.length < 5) throw new Error("ชื่อเคสต้องมีอย่างน้อย 5 ตัวอักษร");
      const status = ["01", "02", "03", "04", "05", "06", "07", "08"].includes(String(r.status)) ? String(r.status) : "01";
      const id = newCaseId();
      const sourceId = await idByName(conn, "sources", r.source);
      const channelId = await idByName(conn, "channels", r.channel);
      const districtId = await idByName(conn, "districts", r.district);
      const createdAt = dateOrNull(r.createdAt) || sla.TODAY();

      await conn.query(
        `INSERT INTO cases (
          id, etracking, letter_no, letter_date, post_no, post_date, title,
          source_id, product, product_license, bounty_amount, description, status_code,
          complainant_name, complainant_phone, complainant_email, complainant_channel_id,
          respondent_licensee, respondent_business, respondent_district_id,
          created_by, created_by_user_id, created_at
        ) VALUES (?,?,?,?,?,?,?, ?,?,?,?,?,?, ?,?,?,?, ?,?,?, ?,?,?)`,
        [
          id, etracking, r.letterNo || null, dateOrNull(r.letterDate), r.postNo || null, dateOrNull(r.postDate), title,
          sourceId, r.product || null, r.productLicense || null,
          r.bountyAmount ? String(r.bountyAmount) : null, r.description || null, status,
          r.complainant_name || null, r.complainant_phone || null, r.complainant_email || null, channelId,
          r.respondent_licensee || null, r.respondent_business || null, districtId,
          user.roleId, user.userId ?? null, createdAt,
        ]
      );
      for (const lawId of splitList(r.laws)) {
        const [ok] = await conn.query("SELECT id FROM laws WHERE id = ?", [lawId]);
        if (ok.length) await conn.query("INSERT IGNORE INTO case_laws (case_id, law_id) VALUES (?, ?)", [id, lawId]);
      }
      for (const p of splitList(r.problems)) {
        const pid = await idByName(conn, "problems", p);
        if (pid) await conn.query("INSERT IGNORE INTO case_problems (case_id, problem_id) VALUES (?, ?)", [id, pid]);
      }
      await conn.query("INSERT INTO case_timeline (case_id, date, time, title, user_name, kind, status, seq) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
        [id, createdAt, "00:00", "นำเข้าจากไฟล์ Excel", user.name, "create", "in-time"]);
      await conn.commit();
      result.created++;
    } catch (e) {
      await conn.rollback();
      result.failed.push({ row: i + 2, etracking: r.etracking || "", message: e.code === "ER_DUP_ENTRY" ? "E-tracking ซ้ำในระบบ" : e.message });
    } finally {
      conn.release();
    }
  }
  return result;
}

module.exports = {
  getCaseById, getAllCases, listCases, createCase, updateCase, setEtracking,
  assignCase, reassignCase, saveInvestigation, addInvestigationEvent, decision,
  saveBoard, applyBoardResolution, savePayment, closeFineCase,
  addFollowup, closeFollowupCase, sendFollowupToBoard,
  cancelCase, unlockCase, extendSla, returnCase, submitCase, importCases, checkEtrackings,
};
