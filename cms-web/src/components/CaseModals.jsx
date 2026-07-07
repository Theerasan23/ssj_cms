"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal, ChipPicker, FormField, FileUpload, SLABadge } from "@/components/ui";
import { useApp } from "@/context/AppContext";

// ---------- Assign / Reassign ----------
export function AssignModal({ c, onClose, onSave, mode = "assign" }) {
  const { cms } = useApp();
  const reassign = mode === "reassign";
  const [selected, setSelected] = useState(reassign ? c.assignees || [] : []);
  const [note, setNote] = useState("");
  return (
    <Modal open onClose={onClose} title={reassign ? "เปลี่ยน / มอบหมายเจ้าหน้าที่ใหม่" : "มอบหมายเจ้าหน้าที่"} sub={c.etracking + " · " + c.title}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={selected.length === 0} onClick={() => onSave(selected, note)}>
          <Icon name="check" size={14} /> {reassign ? "บันทึกการมอบหมายใหม่" : "บันทึกการมอบหมาย"}
        </button>
      </>}>
      <div className="stack">
        {reassign ? (
          <div style={{ padding: 12, background: "var(--warning-100)", borderRadius: 8, fontSize: 12.5, color: "var(--warning-700)" }}>
            รายชื่อที่บันทึกจะ<strong>แทนที่ผู้รับผิดชอบชุดเดิม</strong> ({c.assignees.map((id) => cms.officerName(id)).join(", ") || "—"}) · สถานะเคสไม่เปลี่ยน
          </div>
        ) : (
          <div style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontSize: 12.5 }}>
            <strong>SLA:</strong> ต้องมอบหมายภายใน 3 วันจากวันที่ลงรับ POST ({cms.fmtThaiDate(c.postDate)})
          </div>
        )}
        <FormField label="เลือกเจ้าหน้าที่ผู้รับผิดชอบ" req>
          <ChipPicker options={cms.MASTER.officers.map((o) => ({ id: o.id, label: o.name }))} value={selected} onChange={setSelected} />
          <span className="hint">เลือกได้มากกว่า 1 คน · ทุกคนจะได้รับ notification</span>
        </FormField>
        <FormField label="หมายเหตุ">
          <textarea className="textarea" rows={3} placeholder={reassign ? "เหตุผลการเปลี่ยนเจ้าหน้าที่ (ถ้ามี)" : "ข้อความถึงผู้รับมอบหมาย (ถ้ามี)"} value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

// ---------- Investigation ----------
export function InvestigationModal({ c, onClose, onAddEvent, onChoose }) {
  const { cms } = useApp();
  const [kind, setKind] = useState("site");
  const [date, setDate] = useState(cms.TODAY);
  const [place, setPlace] = useState("");
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  const events = c.investigations || [];
  const has = events.length > 0;
  const snapInvest = cms.caseSlaSnapshot(c).stageInvest;
  const investDays = cms.MASTER.slaDays?.invest ?? 20;

  async function add() {
    if (!date) return;
    setSaving(true);
    try { await onAddEvent({ kind, date, place, result }); setPlace(""); setResult(""); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="บันทึกการตรวจสอบข้อเท็จจริง" sub={c.etracking + " · " + c.title}
      footer={<button className="btn btn-outline" onClick={onClose}>ปิด</button>}>
      <div className="stack">
        <div className="row" style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontSize: 12.5, justifyContent: "space-between" }}>
          <div><strong>SLA:</strong> ตรวจสอบข้อเท็จจริงภายใน {investDays} วันจากวันมอบหมาย · เพิ่มรายการได้หลายครั้ง</div>
          <SLABadge sla={snapInvest} />
        </div>

        {has && (
          <div className="stack-sm">
            <div className="small muted" style={{ fontWeight: 600, color: "var(--text)" }}>รายการตรวจสอบที่บันทึกแล้ว ({events.length})</div>
            {events.map((ev) => (
              <div key={ev.id} className="row" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: ev.kind === "site" ? "var(--primary-100)" : "var(--accent-100)", color: ev.kind === "site" ? "var(--primary-700)" : "var(--accent-700)" }}>
                  <Icon name={ev.kind === "site" ? "map-pin" : "users"} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.kind === "site" ? "ลงพื้นที่ตรวจสอบ" : "เชิญพบเพื่อชี้แจง"} · {cms.fmtThaiDate(ev.date)}</div>
                  {ev.place && <div className="small muted"><Icon name="map-pin" size={11} /> {ev.place}</div>}
                  {ev.result && <div className="small" style={{ marginTop: 2 }}>{ev.result}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="form-section">
          <div className="section-head"><div className="section-num">+</div><div className="section-title">เพิ่มรายการตรวจสอบ</div></div>
          <div className="section-body stack">
            <FormField label="ประเภท">
              <ChipPicker single value={[kind]} onChange={(arr) => setKind(arr[0] || "site")}
                options={[{ id: "site", label: "ลงพื้นที่ตรวจสอบ" }, { id: "meeting", label: "เชิญพบเพื่อชี้แจง" }]} />
            </FormField>
            <div className="form-grid cols-2">
              <FormField label="วันที่" req>
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </FormField>
              <FormField label={kind === "site" ? "สถานที่ลงพื้นที่" : "สถานที่นัด"}>
                <input className="input" placeholder={kind === "site" ? "ระบุสถานที่" : "เช่น สสจ.นนทบุรี"} value={place} onChange={(e) => setPlace(e.target.value)} />
              </FormField>
            </div>
            <FormField label={kind === "site" ? "ผลการตรวจ" : "สรุปการชี้แจง"}>
              <textarea className="textarea" rows={3} value={result} onChange={(e) => setResult(e.target.value)} />
            </FormField>
            <div className="row end">
              <button className="btn btn-primary" disabled={!date || saving} onClick={add}><Icon name="plus" size={14} /> เพิ่มรายการตรวจสอบ</button>
            </div>
          </div>
        </div>

        {has && (
          <div className="card" style={{ background: "var(--accent-100)", borderColor: "var(--accent-600)" }}>
            <div className="card-body" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent-700)", marginBottom: 4 }}>เลือกแนวทางหลังตรวจสอบ</div>
              <div className="small" style={{ marginBottom: 12, color: "var(--accent-700)" }}>ปลดล็อกขั้นถัดไป — กรุณาเลือก 1 ใน 4 ทางเลือก</div>
              <div className="form-grid cols-2">
                <button className="btn btn-primary btn-lg" onClick={() => onChoose("board")}><Icon name="users" size={16} /> เข้าคณะกรรมการ</button>
                <button className="btn btn-outline btn-lg" onClick={() => onChoose("forward")}><Icon name="send" size={16} /> ส่งต่อหน่วยงาน</button>
                <button className="btn btn-success btn-lg" onClick={() => onChoose("stop")}><Icon name="check-circle" size={16} /> เสนอนายแพทย์ยุติ</button>
                <button className="btn btn-danger btn-lg" onClick={() => onChoose("police")}><Icon name="gavel" size={16} /> แจ้งความ/ดำเนินคดี</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- Follow-up (06 ส่งต่อ / 07 ดำเนินคดี / 09 เสนอนายแพทย์) ----------
const FOLLOWUP_UI = {
  "06": { title: "บันทึกการส่งต่อหน่วยงาน", dest: "ส่งต่อไปยัง (หน่วยงาน)", ph: "เช่น อย. / สคบ. / เทศบาลนครนนทบุรี", closeLabel: "ปิดเคส (สิ้นสุดการส่งต่อ)" },
  "07": { title: "บันทึกการแจ้งความ/ดำเนินคดี", dest: "แจ้งความที่ / หน่วยงาน", ph: "เช่น สภ.เมืองนนทบุรี", closeLabel: "ปิดเคส (สิ้นสุดการดำเนินคดี)" },
  "09": { title: "บันทึกการเสนอนายแพทย์ สสจ.", dest: "เสนอต่อ", ph: "เช่น นายแพทย์ สสจ.นนทบุรี", closeLabel: "ปิดเคส (นายแพทย์เห็นชอบยุติเรื่อง)" },
};

// Repeatable progress records for a follow-up case — the case stays in its status
// until the officer explicitly closes it (09 then resolves to 05 ยุติคดี).
export function FollowupModal({ c, onClose, onAdd, onCloseCase }) {
  const { cms } = useApp();
  const ui = FOLLOWUP_UI[c.status] || FOLLOWUP_UI["06"];
  const [date, setDate] = useState(cms.TODAY);
  const [destination, setDestination] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const items = c.followups || [];

  async function add() {
    if ((!destination.trim() && !detail.trim()) || saving) return;
    setSaving(true);
    try {
      const ok = await onAdd({ date, destination, detail });
      if (ok !== false) { setDestination(""); setDetail(""); }
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={ui.title} sub={c.etracking + " · " + c.title}
      footer={<button className="btn btn-outline" onClick={onClose}>ปิด</button>}>
      <div className="stack">
        <div style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontSize: 12.5 }}>
          สถานะเคสคงเป็น <strong>"{cms.STATUS[c.status]?.label || c.status}"</strong> — บันทึกความคืบหน้าได้เรื่อยๆ จนกว่าจะกด "ปิดเคส"
        </div>

        {items.length > 0 && (
          <div className="stack-sm">
            <div className="small" style={{ fontWeight: 600 }}>บันทึกที่ผ่านมา ({items.length} รายการ)</div>
            {items.slice().reverse().map((f) => (
              <div key={f.id} className="row" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--primary-100)", color: "var(--primary-700)" }}>
                  <Icon name="send" size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{f.destination || "—"} · {cms.fmtThaiDate(f.date)}</div>
                  {f.detail && <div className="small" style={{ marginTop: 2 }}>{f.detail}</div>}
                  <div className="small muted" style={{ marginTop: 3, fontSize: 11 }}>โดย {f.user || "—"} · บันทึกเมื่อ {fmtTimestamp(cms, f.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="form-section">
          <div className="section-head"><div className="section-num">+</div><div className="section-title">เพิ่มบันทึกความคืบหน้า</div></div>
          <div className="section-body stack">
            <div className="form-grid cols-2">
              <FormField label="วันที่">
                <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
              </FormField>
              <FormField label={ui.dest}>
                <input className="input" placeholder={ui.ph} value={destination} onChange={(e) => setDestination(e.target.value)} />
              </FormField>
            </div>
            <FormField label="รายละเอียด / เนื้อหา">
              <textarea className="textarea" rows={3} placeholder="สรุปสิ่งที่ดำเนินการ เอกสารที่ส่ง ผลตอบกลับ ฯลฯ" value={detail} onChange={(e) => setDetail(e.target.value)} />
            </FormField>
            <div className="row end">
              <button className="btn btn-primary" disabled={(!destination.trim() && !detail.trim()) || saving} onClick={add}>
                <Icon name="plus" size={14} /> เพิ่มบันทึก
              </button>
            </div>
          </div>
        </div>

        <div className="card" style={{ background: "var(--accent-100)", borderColor: "var(--accent-600)" }}>
          <div className="card-body" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent-700)", marginBottom: 4 }}>สิ้นสุดการติดตาม</div>
            <div className="small" style={{ marginBottom: 12, color: "var(--accent-700)" }}>
              กดเมื่อไม่ต้องบันทึกความคืบหน้าเพิ่มแล้ว{c.status === "09" ? " — เคสจะเปลี่ยนเป็น \"ยุติคดี\"" : " — สถานะคงเดิมและเคสจะถูกปิด"}
            </div>
            <button className="btn btn-accent btn-lg" onClick={onCloseCase}>
              <Icon name="check-circle" size={16} /> {ui.closeLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Board ----------
const FINE_RESOLUTIONS = ["เปรียบเทียบปรับ", "ออกคำสั่งปรับพินัย"];

// Which committees are offered depends on the case's laws (per spec ข้อ iii–vi):
//  iii. ยา/อาหาร/เครื่องสำอาง/สมุนไพร/เครื่องมือแพทย์ → คณะกรรมการพิจารณาคดี
//  iv.  สถานพยาบาล → คณะกรรมการเปรียบเทียบคดี
//  v.   สถานพยาบาล/เครื่องมือแพทย์/เครื่องสำอาง → คณะกรรมการองค์คณะปรับพินัย
//  vi.  สถานประกอบการเพื่อสุขภาพ → คณะกรรมการกลั่นกรองฯ
const LAW_COMMITTEES = {
  drug: ["คณะกรรมการพิจารณาคดี"],
  food: ["คณะกรรมการพิจารณาคดี"],
  herb: ["คณะกรรมการพิจารณาคดี"],
  cosm: ["คณะกรรมการพิจารณาคดี", "คณะกรรมการองค์คณะปรับพินัย"],
  med:  ["คณะกรรมการพิจารณาคดี", "คณะกรรมการองค์คณะปรับพินัย"],
  hosp: ["คณะกรรมการเปรียบเทียบคดี", "คณะกรรมการองค์คณะปรับพินัย"],
  heal: ["คณะกรรมการกลั่นกรองฯ"],
};

export function committeesForLaws(laws, allCommittees) {
  const allowed = new Set((laws || []).flatMap((l) => LAW_COMMITTEES[l] || []));
  const filtered = (allCommittees || []).filter((co) => allowed.has(co));
  // laws without a mapping (e.g. วัตถุอันตราย/ยาเสพติด) fall back to the full list
  return filtered.length ? filtered : allCommittees || [];
}

// createdAt arrives as 'YYYY-MM-DD HH:MM:SS' (mysql dateStrings) — slice, don't parse
export function fmtTimestamp(cms, dt) {
  if (!dt) return "";
  const s = String(dt);
  const time = s.length > 10 ? s.slice(11, 16) : "";
  return `${cms.fmtThaiDate(s.slice(0, 10))}${time ? ` เวลา ${time} น.` : ""}`;
}

// Records repeatable board meetings — saving a meeting does NOT change the case
// status; the officer applies the latest resolution explicitly via onApply.
// Saving without a resolution = pending proposal (อยู่ระหว่างรอเข้าคณะกรรมการ, SLA นับต่อ);
// the next save fills that pending entry in.
export function BoardModal({ c, onClose, onSaveMeeting, onApply }) {
  const { cms } = useApp();
  const meetings = c.boardMeetings || [];
  const latest = meetings.length ? meetings[meetings.length - 1] : null;
  const pending = latest && !latest.resolution ? latest : null;
  // laws under consideration: start from the case's laws, more can be added in the modal —
  // they drive which committees and law sections are offered below
  const [laws, setLaws] = useState(c.laws || []);
  const [committees, setCommittees] = useState(pending ? pending.committees : []);
  const [meetingNo, setMeetingNo] = useState(pending?.meetingNo || "");
  const [year, setYear] = useState(pending?.year || latest?.year || 2569);
  const [meetingDate, setMeetingDate] = useState(pending?.meetingDate || "");
  const [resolution, setResolution] = useState("");
  const [sections, setSections] = useState([]);
  const [notes, setNotes] = useState(pending?.notes || "");
  const [saving, setSaving] = useState(false);
  const snapBoard = cms.caseSlaSnapshot(c).stageBoard;
  const boardDays = cms.MASTER.slaDays?.board ?? 60;

  // both lists follow the laws selected above; laws without sections fall back to the full list
  function sectionOptionsFor(selLaws) {
    const filtered = cms.MASTER.sections.filter((sx) => selLaws.includes(sx.law));
    return filtered.length ? filtered : cms.MASTER.sections;
  }
  const sectionOptions = sectionOptionsFor(laws);
  // union with current selection so committees from a pending proposal stay visible
  const committeeOptions = [...new Set([...committeesForLaws(laws, cms.MASTER.committees), ...committees])];

  function changeLaws(v) {
    setLaws(v);
    // drop selections that no longer match the chosen laws
    const allowedCom = new Set(committeesForLaws(v, cms.MASTER.committees));
    setCommittees((cur) => cur.filter((x) => allowedCom.has(x)));
    const allowedSec = new Set(sectionOptionsFor(v).map((s) => s.id));
    setSections((cur) => cur.filter((s) => allowedSec.has(s.secId)));
  }

  function addSection() {
    const first = sectionOptions[0];
    if (!first) return;
    setSections([...sections, { secId: first.id, count: 1, fine: first.fines[0] }]);
  }
  function updateSection(i, k, v) {
    setSections(sections.map((s, idx) => idx === i ? {
      ...s, [k]: v,
      ...(k === "count" ? { fine: cms.sectionById(s.secId)?.fines[Math.min(v - 1, 2)] || 0 } : {}),
      ...(k === "secId" ? { fine: cms.sectionById(v)?.fines[Math.min(s.count - 1, 2)] || 0 } : {}),
    } : s));
  }
  function removeSection(i) { setSections(sections.filter((_, idx) => idx !== i)); }

  const needsSections = FINE_RESOLUTIONS.includes(resolution);
  // no resolution selected → saving records a pending proposal (committee required, date optional)
  const canSubmit = committees.length > 0
    && (!resolution || (meetingNo && meetingDate && (!needsSections || (sections.length > 0 && sections.every((s) => +s.fine > 0)))));

  async function saveMeeting() {
    if (!canSubmit || saving) return;
    setSaving(true);
    try {
      const ok = await onSaveMeeting({
        committees, meetingNo: meetingNo ? +meetingNo : null, year: +year,
        meetingDate: meetingDate || null, resolution, sections: resolution ? sections : [], notes,
      });
      // reset only after a completed meeting — a pending proposal stays in the form to fill in later
      if (ok !== false && resolution) { setCommittees([]); setMeetingNo(""); setMeetingDate(""); setResolution(""); setSections([]); setNotes(""); }
    } finally {
      setSaving(false);
    }
  }

  const applyLabel = latest && FINE_RESOLUTIONS.includes(latest.resolution)
    ? "ไปขั้นชำระค่าปรับ" : latest?.resolution === "ยุติเรื่อง" ? "ปิดเคส (ยุติคดี)" : "ปิดเคส (ดำเนินคดี)";
  const applyBlocked = latest && FINE_RESOLUTIONS.includes(latest.resolution) && (!latest.sections || latest.sections.length === 0);

  return (
    <Modal open onClose={onClose} size="lg" title="บันทึกมติคณะกรรมการ" sub={c.etracking + " · " + c.title}
      footer={<button className="btn btn-outline" onClick={onClose}>ปิด</button>}>
      <div className="stack">
        <div className="row" style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontSize: 12.5, justifyContent: "space-between" }}>
          <div>
            <strong>SLA:</strong> เสนอต่อที่ประชุมภายใน {boardDays} วันจากวันมอบหมาย ({cms.fmtThaiDate(c.assignedAt)}) —
            บันทึกได้หลายครั้ง <strong>สถานะเคสจะยังไม่เปลี่ยน</strong>จนกว่าจะกด "ดำเนินการตามมติล่าสุด"
          </div>
          <SLABadge sla={snapBoard} />
        </div>

        {pending && (
          <div style={{ padding: 12, background: "var(--warning-100)", borderRadius: 8, color: "var(--warning-700)", fontSize: 12.5 }}>
            <div style={{ fontWeight: 700 }}><Icon name="clock" size={12} /> อยู่ระหว่างรอเข้าคณะกรรมการ: {pending.committees.join(", ")}</div>
            <div style={{ marginTop: 2 }}>
              {pending.meetingDate ? `นัดประชุม ${cms.fmtThaiDate(pending.meetingDate)}` : "ยังไม่กำหนดวันประชุม — SLA ยังนับเวลาต่อ"} ·
              เมื่อประชุมแล้ว กรอกวันที่ประชุมและมติด้านล่าง ระบบจะบันทึกลงการเสนอครั้งนี้
            </div>
          </div>
        )}

        {meetings.length > 0 && (
          <div className="stack-sm">
            <div className="small" style={{ fontWeight: 600 }}>ประวัติการเข้าที่ประชุม ({meetings.length} ครั้ง)</div>
            {meetings.slice().reverse().map((m) => (
              <div key={m.id} className="row" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: m.resolution ? "var(--accent-100)" : "var(--warning-100)", color: m.resolution ? "var(--accent-700)" : "var(--warning-700)" }}>
                  <Icon name={m.resolution ? "users" : "clock"} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    ครั้งที่ {m.meetingNo ?? "—"}/{m.year ?? "—"} · {cms.fmtThaiDate(m.meetingDate)}
                    {m === latest && <span className="chip accent" style={{ fontSize: 10, marginLeft: 6 }}>ล่าสุด</span>}
                  </div>
                  <div className="small muted">{m.committees.join(", ")}</div>
                  <div className="small" style={{ marginTop: 3 }}>
                    {m.resolution
                      ? <>มติ: <span className="chip accent" style={{ fontSize: 11, fontWeight: 600 }}>{m.resolution}</span></>
                      : <span className="chip" style={{ fontSize: 11, fontWeight: 600, background: "var(--warning-100)", color: "var(--warning-700)" }}>รอเข้าประชุม — ยังไม่มีมติ</span>}
                  </div>
                  {m.sections?.length > 0 && (
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {m.sections.map((s, i) => <div key={i}>{cms.sectionById(s.secId)?.text} · ครั้งที่ {s.count} · {cms.fmtMoney(s.fine)}</div>)}
                    </div>
                  )}
                  {m.notes && <div className="small" style={{ marginTop: 3 }}>{m.notes}</div>}
                  <div className="small muted" style={{ marginTop: 4, fontSize: 11 }}><Icon name="clock" size={10} /> บันทึกเมื่อ {fmtTimestamp(cms, m.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="form-section">
          <div className="section-head"><div className="section-num">+</div><div className="section-title">{pending ? "ลงมติการประชุมที่รออยู่ / แก้ไขการเสนอ" : "เพิ่มบันทึกการเข้าที่ประชุม"}</div></div>
          <div className="section-body stack">
            <FormField label="พรบ. ที่ใช้พิจารณา" hint="เริ่มจากพรบ. ของเคส — เลือกเพิ่มได้ · คณะกรรมการและมาตราด้านล่างจะแสดงตามพรบ. ที่เลือก">
              <ChipPicker options={cms.MASTER.laws.map((l) => ({ id: l.id, label: l.label }))} value={laws} onChange={changeLaws} />
            </FormField>
            <FormField label="คณะกรรมการ" req hint="แสดงเฉพาะคณะกรรมการตามพรบ. ที่เลือก · เลือกได้หลายคณะ">
              <ChipPicker options={committeeOptions.map((co) => ({ id: co, label: co }))} value={committees} onChange={setCommittees} />
            </FormField>
            <div className="form-grid cols-3">
              <FormField label="ครั้งที่ประชุม" req={!!resolution}>
                <input type="number" min="1" max="12" className="input" value={meetingNo} onChange={(e) => setMeetingNo(e.target.value)} />
              </FormField>
              <FormField label="ปี พ.ศ.">
                <input type="number" className="input" value={year} onChange={(e) => setYear(e.target.value)} />
              </FormField>
              <FormField label="วันที่ประชุม" req={!!resolution} hint={!resolution ? "เว้นว่างได้หากยังไม่ประชุม" : undefined}>
                <input type="date" className="input" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
              </FormField>
            </div>
            <FormField label="มติ" hint="ยังไม่เลือกมติ = บันทึกเป็นการเสนอเข้าที่ประชุม (อยู่ระหว่างรอเข้าคณะกรรมการ · SLA นับต่อ)">
              <ChipPicker single options={cms.MASTER.resolutions.map((r) => ({ id: r, label: r }))}
                value={resolution ? [resolution] : []} onChange={(arr) => setResolution(arr[0] || "")} />
            </FormField>
            {needsSections && (
              <div className="form-section">
                <div className="section-head"><div className="section-num">+</div><div className="section-title">ความผิดตามมาตรา</div></div>
                <div className="section-body stack">
                  <div className="muted small">ระบบเติมอัตราค่าปรับตามมาตรา/ครั้งที่ให้อัตโนมัติ — แก้ไขจำนวนเงินได้</div>
                  {sections.length === 0 && <div className="muted small">ยังไม่ได้เพิ่มมาตรา</div>}
                  {sections.map((s, i) => (
                    <div key={i} className="row" style={{ gap: 8, padding: 10, border: "1px solid var(--border)", borderRadius: 8, flexWrap: "nowrap" }}>
                      <select className="select" style={{ flex: 1, minWidth: 120 }} value={s.secId} onChange={(e) => updateSection(i, "secId", e.target.value)}>
                        {sectionOptions.map((sx) => <option key={sx.id} value={sx.id}>[{cms.lawLabel(sx.law)}] {sx.text}</option>)}
                      </select>
                      <input type="number" min="1" max="3" className="input" style={{ width: 70, flexShrink: 0 }} value={s.count} onChange={(e) => updateSection(i, "count", +e.target.value)} />
                      <input type="number" min="0" step="500" className="input mono" style={{ width: 130, flexShrink: 0, textAlign: "right", ...((+s.fine > 0) ? {} : { borderColor: "var(--error-700)" }) }}
                        value={s.fine} onChange={(e) => updateSection(i, "fine", e.target.value === "" ? "" : +e.target.value)} />
                      <span className="small muted" style={{ whiteSpace: "nowrap" }}>บาท</span>
                      <button className="icon-btn" style={{ flexShrink: 0 }} onClick={() => removeSection(i)}><Icon name="trash" size={14} /></button>
                    </div>
                  ))}
                  <button className="btn btn-outline btn-sm" onClick={addSection}><Icon name="plus" size={14} /> เพิ่มมาตรา</button>
                  {sections.length > 0 && (
                    <div className="row between" style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontWeight: 600 }}>
                      <span>รวมค่าปรับ</span>
                      <span className="mono">{cms.fmtMoney(sections.reduce((s, x) => s + (+x.fine || 0), 0))}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <FormField label="หมายเหตุ">
              <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FormField>
            <div className="row end">
              <button className="btn btn-primary" disabled={!canSubmit || saving} onClick={saveMeeting}>
                <Icon name="save" size={14} /> {resolution ? "บันทึกมติ (สถานะไม่เปลี่ยน)" : "บันทึกการเสนอเข้าที่ประชุม (รอประชุม)"}
              </button>
            </div>
          </div>
        </div>

        {latest && latest.resolution && (
          <div className="card" style={{ background: "var(--accent-100)", borderColor: "var(--accent-600)" }}>
            <div className="card-body" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--accent-700)", marginBottom: 4 }}>ดำเนินการตามมติล่าสุด</div>
              <div className="small" style={{ marginBottom: 12, color: "var(--accent-700)" }}>
                มติครั้งที่ {latest.meetingNo}/{latest.year}: <strong>{latest.resolution}</strong> — กดเมื่อไม่ต้องเข้าที่ประชุมเพิ่มแล้ว
                {applyBlocked && <div style={{ marginTop: 4 }}>⚠ มติล่าสุดไม่มีมาตรา/ค่าปรับ — บันทึกมติใหม่พร้อมมาตราก่อน</div>}
              </div>
              <button className="btn btn-accent btn-lg" disabled={applyBlocked} onClick={onApply}>
                <Icon name="arrow-right" size={16} /> {applyLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------- Fine / Payment ----------
// Supports partial payments: each save adds to paidAmount; remaining = amount - paidAmount.
// The case is closed by an explicit officer action (onCloseCase) once everything is paid.
export function FineModal({ c, onClose, onSave, onCloseCase }) {
  const { cms } = useApp();
  const [fineId, setFineId] = useState(null);
  const [paidDate, setPaidDate] = useState(cms.TODAY);
  const [amount, setAmount] = useState("");
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const remainingOf = (f) => f.amount - (f.paidAmount || 0);
  const totalRemaining = c.fines.reduce((s, f) => s + remainingOf(f), 0);
  const allPaid = c.fines.length > 0 && c.fines.every((f) => f.paid);
  const selected = c.fines.find((f) => f.fineId === fineId) || null;
  const selRemaining = selected ? remainingOf(selected) : 0;
  const amt = Number(amount);
  const amountOk = selected && Number.isFinite(amt) && amt > 0 && amt <= selRemaining;

  async function save() {
    if (!amountOk || !paidDate || saving) return;
    setSaving(true);
    try {
      const ok = await onSave({ fineId, paidDate, amount: amt });
      if (ok !== false) { setFineId(null); setAmount(""); setFiles([]); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="บันทึกการเปรียบเทียบปรับ" sub={c.etracking + " · " + c.title}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>ปิด</button>
        {!allPaid && (
          <button className="btn btn-primary" disabled={!amountOk || !paidDate || saving} onClick={save}>
            <Icon name="save" size={14} /> บันทึกการชำระ
          </button>
        )}
      </>}>
      <div className="stack">
        <div className="row between" style={{ padding: 12, background: allPaid ? "var(--success-100)" : "var(--accent-100)", borderRadius: 8 }}>
          <div>
            <div className="small" style={{ color: allPaid ? "var(--success-700)" : "var(--accent-700)", fontWeight: 600 }}>
              {allPaid ? "ชำระครบแล้ว" : "ยอดคงเหลือทั้งหมด"}
            </div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{cms.fmtMoney(totalRemaining)}</div>
          </div>
          <SLABadge sla={cms.computeSlaStage(c.board?.meetingDate, 60, null)} />
        </div>

        {allPaid ? (
          <div style={{ padding: 14, background: "var(--success-100)", borderRadius: 8, color: "var(--success-700)" }}>
            <div className="row" style={{ gap: 10, alignItems: "center", marginBottom: 12 }}>
              <Icon name="check-circle" size={20} />
              <div>
                <div style={{ fontWeight: 700 }}>ค่าปรับทั้งหมดชำระครบแล้ว</div>
                <div className="small">กดปุ่มด้านล่างเพื่อปิดเคส (ยุติคดี)</div>
              </div>
            </div>
            <button className="btn btn-success btn-lg btn-block" onClick={onCloseCase}>
              <Icon name="check-circle" size={16} /> ปิดเคส (ยุติคดี)
            </button>
          </div>
        ) : (
          <FormField label="เลือกรายการชำระ" req>
            <div className="stack-sm">
              {c.fines.map((f) => {
                const sec = cms.sectionById(f.secId);
                const rem = remainingOf(f);
                return (
                  <label key={f.fineId} className="row" style={{ padding: 12, border: fineId === f.fineId ? "2px solid var(--primary-700)" : "1px solid var(--border)", borderRadius: 8, cursor: f.paid ? "not-allowed" : "pointer", opacity: f.paid ? 0.5 : 1 }}>
                    <input type="radio" name="fine" disabled={f.paid} checked={fineId === f.fineId}
                      onChange={() => { setFineId(f.fineId); setAmount(rem.toString()); }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{sec?.text}</div>
                      <div className="small muted">
                        ครั้งที่ {f.count} · ค่าปรับ {cms.fmtMoney(f.amount)}
                        {(f.paidAmount || 0) > 0 && <> · ชำระแล้ว {cms.fmtMoney(f.paidAmount)} · <b style={{ color: "var(--warning-700)" }}>คงเหลือ {cms.fmtMoney(rem)}</b></>}
                      </div>
                    </div>
                    {f.paid
                      ? <span className="status-badge s05"><Icon name="check" size={12} /> ชำระครบ</span>
                      : (f.paidAmount || 0) > 0
                        ? <span className="status-badge s03">ชำระบางส่วน</span>
                        : <span className="status-badge s04">ค้างชำระ</span>}
                  </label>
                );
              })}
            </div>
          </FormField>
        )}

        {!allPaid && selected && (
          <>
            <div className="form-grid cols-2">
              <FormField label="วันที่จ่ายค่าปรับ" req>
                <input type="date" className="input" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </FormField>
              <FormField label="จำนวนที่ชำระ (บาท)" req hint={`ชำระบางส่วนได้ · สูงสุด ${cms.fmtMoney(selRemaining)}`}>
                <input type="number" min="1" max={selRemaining} className="input mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </FormField>
            </div>
            {amount !== "" && !amountOk && (
              <div className="small" style={{ padding: "8px 12px", background: "var(--error-100)", color: "var(--error-700)", borderRadius: 6 }}>
                จำนวนเงินต้องมากกว่า 0 และไม่เกินยอดคงเหลือ {cms.fmtMoney(selRemaining)}
              </div>
            )}
            {amountOk && (
              <div className="row between" style={{ padding: 12, background: "var(--primary-50)", borderRadius: 8, fontWeight: 600 }}>
                <span>คงเหลือหลังชำระรายการนี้</span>
                <span className="mono" style={{ color: selRemaining - amt === 0 ? "var(--success-700)" : "var(--warning-700)" }}>
                  {cms.fmtMoney(selRemaining - amt)}{selRemaining - amt === 0 && " · ชำระครบรายการนี้"}
                </span>
              </div>
            )}
            <FormField label="แนบใบเสร็จ">
              <FileUpload files={files} onChange={setFiles} />
            </FormField>
          </>
        )}
      </div>
    </Modal>
  );
}
