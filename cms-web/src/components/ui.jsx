"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useApp, useToasts } from "@/context/AppContext";
import * as SLA from "@/lib/sla";

export const STATUS_ICONS = {
  "01": "box", "02": "loupe", "03": "calendar", "04": "money",
  "05": "check-circle", "06": "send", "07": "gavel", "08": "ban",
};

export function StatusBadge({ code, size = "md", showLabel = true }) {
  const { cms } = useApp();
  const s = cms.STATUS[code];
  if (!s) return null;
  return (
    <span className={`status-badge ${s.cls} ${size === "lg" ? "lg" : ""}`}>
      <Icon name={STATUS_ICONS[code]} size={size === "lg" ? 14 : 12} stroke={2} />
      {showLabel && s.label}
    </span>
  );
}

export function SLABadge({ sla }) {
  if (!sla) return null;
  const ic = sla.kind === "overdue" ? "alert" : sla.kind === "near" ? "clock" : sla.kind === "in-time" ? "check" : "clock";
  return (
    <span className={`sla-badge ${sla.kind}`}>
      <Icon name={ic} size={11} stroke={2.2} />
      {sla.label}
    </span>
  );
}

export function Avatar({ name = "", size = "md", color }) {
  const initials = name.trim() ? name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("") : "?";
  return <span className={`avatar ${size === "sm" ? "sm" : size === "lg" ? "lg" : ""}`} style={color ? { background: color, color: "#fff" } : null}>{initials}</span>;
}

export function AvatarStack({ names = [], max = 3, size = "sm" }) {
  const show = names.slice(0, max);
  const rest = names.length - show.length;
  return (
    <span className="avatar-stack">
      {show.map((n, i) => <Avatar key={i} name={n} size={size} />)}
      {rest > 0 && <span className={`avatar ${size === "sm" ? "sm" : ""} more`}>+{rest}</span>}
    </span>
  );
}

export function ChipPicker({ options, value = [], onChange, single }) {
  return (
    <div className="chip-picker">
      {options.map((opt) => {
        const id = typeof opt === "string" ? opt : opt.id;
        const label = typeof opt === "string" ? opt : opt.label;
        const on = value.includes(id);
        return (
          <button type="button" key={id} className={`pick ${on ? "on" : ""}`}
            onClick={() => {
              if (single) { onChange([id]); return; }
              onChange(on ? value.filter((x) => x !== id) : [...value, id]);
            }}>
            {on && <Icon name="check" size={12} stroke={2.5} style={{ marginRight: 4 }} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.value} className={`tab ${value === t.value ? "active" : ""}`} onClick={() => onChange(t.value)}>
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.count != null && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, sub, children, footer, size = "md", closeOnBackdrop = true }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose && onClose(); }}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={() => onClose && onClose()}><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ต้องตรงกับ cms-api attachments.service.js (ALLOWED_MIME / MAX_BYTES) และ multer fileFilter
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 10; // multer รับครั้งละไม่เกิน 10 ไฟล์ — เกินแล้วทั้งชุดจะไม่ถูกอัปโหลด

const fmtSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`);

export function FileUpload({ files = [], onChange, accept = "image/*,application/pdf" }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const toast = useToasts();
  // คัดไฟล์ตั้งแต่ตอนเลือก — เดิมรับทุกชนิด/ทุกขนาด แล้วฝั่งเซิร์ฟเวอร์ทิ้งไฟล์ที่ไม่รองรับเงียบ ๆ
  // (ตอบ 201 เหมือนสำเร็จ) ผู้ใช้จึงเข้าใจว่าแนบไฟล์แล้วทั้งที่ไฟล์หาย · การลากวางข้าม accept ได้ด้วย
  function add(list) {
    const rejected = [];
    let accepted = Array.from(list).filter((f) => {
      if (!ALLOWED_MIME.has(f.type)) { rejected.push(`${f.name} — ชนิดไฟล์ไม่รองรับ`); return false; }
      if (f.size > MAX_BYTES) { rejected.push(`${f.name} — ใหญ่เกิน 20 MB (${fmtSize(f.size)})`); return false; }
      return true;
    });
    const room = MAX_FILES - (files || []).length;
    if (accepted.length > room) {
      accepted.slice(room).forEach((f) => rejected.push(`${f.name} — เกิน ${MAX_FILES} ไฟล์ต่อครั้ง`));
      accepted = accepted.slice(0, Math.max(0, room));
    }
    if (rejected.length) {
      toast.push({ kind: "warn", title: "ไฟล์บางรายการแนบไม่ได้", msg: rejected.join(" · "), timeout: 6000 });
    }
    if (!accepted.length) return;
    const newFiles = accepted.map((f) => ({
      name: f.name,
      size: fmtSize(f.size),
      type: f.type.startsWith("image") ? "image" : f.type === "application/pdf" ? "pdf" : "other",
      _file: f, // keep the real File so the form can upload it after the case is saved
    }));
    onChange([...(files || []), ...newFiles]);
  }
  return (
    <div className="stack">
      <div className={`upload-zone ${drag ? "dragging" : ""}`}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
        <Icon className="upload-icon" name="upload" size={28} stroke={1.6} />
        <div className="upload-title">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือก</div>
        <div className="upload-hint">รองรับ PDF / JPG / PNG / WEBP / GIF · ไม่เกิน 20 MB ต่อไฟล์ · ครั้งละไม่เกิน {MAX_FILES} ไฟล์</div>
        <input ref={inputRef} type="file" multiple accept={accept} style={{ display: "none" }} onChange={(e) => add(e.target.files)} />
      </div>
      {files && files.length > 0 && (
        <div className="stack-sm">
          {files.map((f, i) => (
            <div key={i} className="file-row">
              <div className="file-thumb">{f.type === "image" ? <Icon name="image" size={18} /> : f.type === "pdf" ? "PDF" : <Icon name="file" size={18} />}</div>
              <div className="file-name">{f.name}</div>
              <div className="file-meta">{f.size}</div>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}>
                <Icon name="trash" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const FOLLOWUP_STEP = {
  "06": { label: "ส่งต่อหน่วยงาน", icon: "send" },
  "07": { label: "แจ้งความ/ดำเนินคดี", icon: "gavel" },
  "09": { label: "เสนอนายแพทย์ยุติ", icon: "check-circle" },
};

const d10 = (v) => (v ? String(v).slice(0, 10) : "");

// The workflow lets a case go backwards (e.g. คณะกรรมการ → ลงพื้นที่ → คณะกรรมการ again),
// so the timeline is built from what was actually recorded, in date order, instead of a
// fixed four-stage track — a stage the case returns to appears again rather than merging
// into the earlier visit. Stages not reached yet are appended as muted "รอ" steps.
function journeyOf(c) {
  const done = [];
  if (c.assignedAt) done.push({ key: "assign", label: "มอบหมาย", icon: "users", date: d10(c.assignedAt) });

  (c.investigations || []).forEach((ev, i) => done.push({
    key: `inv-${ev.id ?? i}`,
    label: ev.kind === "site" ? "ลงพื้นที่ตรวจสอบ" : "เชิญพบชี้แจง",
    icon: ev.kind === "site" ? "map-pin" : "users",
    date: d10(ev.date),
  }));

  (c.boardMeetings || []).forEach((m, i) => done.push({
    key: `board-${m.id ?? i}`,
    label: "เข้าคณะกรรมการ",
    note: m.meetingNo ? `ครั้งที่ ${m.meetingNo}` : null,
    icon: "users",
    date: d10(m.meetingDate || m.createdAt),
    pending: !m.resolution, // proposed but no resolution yet
  }));

  (c.followups || []).forEach((f, i) => {
    const ui = FOLLOWUP_STEP[c.status] || { label: "ติดตามผล", icon: "send" };
    done.push({ key: `fu-${f.id ?? i}`, label: ui.label, note: f.destination || null, icon: ui.icon, date: d10(f.date) });
  });

  (c.fines || []).filter((f) => f.paid).forEach((f, i) => done.push({
    key: `fine-${i}`, label: "ชำระค่าปรับ", icon: "money", date: d10(f.paidDate),
  }));

  // Stable sort keeps same-date items in the order pushed above; undated items inherit
  // the previous item's date so they never jump to the front.
  let last = "";
  done.forEach((s) => { if (s.date) last = s.date; else s.date = last; });
  done.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return done;
}

export function SLATimelineHorizontal({ c }) {
  const snap = SLA.caseSlaSnapshot(c);
  const past = journeyOf(c);

  // What still lies ahead on the default track, so an untouched case keeps the familiar
  // four-stage overview instead of showing a single lonely step.
  const investDone = (c.investigations || []).length > 0 || !!(c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate));
  const boardDone = (c.boardMeetings || []).length > 0 || !!(c.board && c.board.meetingDate);
  const fineDone = !!(c.fines && c.fines.length && c.fines.every((f) => f.paid));
  const ahead = [
    { key: "assign", label: "มอบหมาย", sla: snap.stageAssign, reached: !!c.assignedAt },
    { key: "invest", label: "ตรวจสอบ", sla: snap.stageInvest, reached: investDone },
    { key: "board", label: "กรรมการ", sla: snap.stageBoard, reached: boardDone },
    { key: "fine", label: "เปรียบเทียบ", sla: snap.stageFine, reached: fineDone },
  ].filter((s) => !s.reached);

  const closed = !!c.closed;
  // the first unreached stage carries the live SLA countdown
  const currentKey = closed ? null : ahead[0]?.key;

  const steps = [
    ...past.map((s) => ({ ...s, state: s.pending ? "current" : "done" })),
    ...(closed ? [] : ahead.map((s) => ({
      key: s.key, label: s.label, icon: null,
      state: s.key === currentKey ? "current" : "wait",
      sla: s.key === currentKey ? s.sla : null,
    }))),
  ];
  if (closed) steps.push({ key: "closed", label: "ปิดเคส", icon: "check-circle", state: "done", date: "" });

  return (
    // --steps drives the column count from CSS so the mobile media query can still
    // override the whole track (an inline grid-template would beat it)
    <div className="sla-timeline" style={{ "--steps": Math.max(steps.length, 1) }}>
      {steps.map((s, i) => {
        let cls = s.state === "done" ? "done" : s.state === "current" ? "current" : "";
        if (s.sla && s.sla.kind === "overdue") cls += " overdue";
        return (
          <div key={s.key} className={`sla-step ${cls}`}>
            <div className="step-circle">
              {s.state === "done" ? <Icon name="check" size={16} stroke={2.5} />
                : s.icon ? <Icon name={s.icon} size={16} /> : i + 1}
            </div>
            <div className="step-label">{s.label}</div>
            <div className="step-meta">
              {s.sla ? <SLABadge sla={s.sla} />
                : s.note ? s.note
                  : s.date ? s.date
                    : s.state === "wait" ? "รอ" : "เสร็จแล้ว"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SLATimelineVertical({ c }) {
  const snap = SLA.caseSlaSnapshot(c);
  const steps = [
    { key: "assign", label: "มอบหมายเจ้าหน้าที่", sla: snap.stageAssign, done: !!c.assignedAt },
    { key: "invest", label: "ตรวจสอบข้อเท็จจริง", sla: snap.stageInvest, done: !!(c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate)) },
    { key: "board", label: "เข้าคณะกรรมการ", sla: snap.stageBoard, done: !!(c.board && c.board.meetingDate) },
    { key: "fine", label: "เปรียบเทียบปรับ", sla: snap.stageFine, done: !!(c.fines && c.fines.length && c.fines.every((f) => f.paid)) },
  ];
  const activeIdx = steps.findIndex((s) => !s.done);
  return (
    <div className="v-timeline">
      {steps.map((s, i) => {
        let cls = i === activeIdx ? "" : (s.done ? "done" : "pending");
        if (s.sla && s.sla.kind === "overdue" && i === activeIdx) cls = "overdue";
        return (
          <div key={s.key} className={`v-event ${cls}`}>
            <div className="v-title">{s.label}</div>
            <div className="v-body">{s.done ? "เสร็จสมบูรณ์" : (i === activeIdx ? <SLABadge sla={s.sla} /> : "รอขั้นก่อนหน้า")}</div>
          </div>
        );
      })}
    </div>
  );
}

export function useClickOutside(ref, onClose) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, onClose]);
}

export function Logo({ size = "md", variant = "dark" }) {
  const isLight = variant === "light";
  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="brand-mark" style={{
        width: size === "lg" ? 48 : 36, height: size === "lg" ? 48 : 36, borderRadius: 10,
        background: isLight ? "rgba(255,255,255,0.18)" : "linear-gradient(135deg, var(--primary-700), var(--primary-500))",
        border: isLight ? "1px solid rgba(255,255,255,0.3)" : "none",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: size === "lg" ? 17 : 14, letterSpacing: "-0.02em",
        boxShadow: isLight ? "none" : "0 4px 10px -2px rgba(31,78,121,.35)",
      }}>คบส</div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
        <div style={{ fontWeight: 700, fontSize: size === "lg" ? 17 : 15, color: isLight ? "#fff" : "var(--text)", letterSpacing: "-0.01em" }}>
          ระบบจัดการเรื่องร้องเรียน
        </div>
        <div style={{ fontSize: size === "lg" ? 12 : 11, color: isLight ? "rgba(255,255,255,0.7)" : "var(--text-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          CMS · สสจ. นนทบุรี
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, req, hint, error, warning, children, full }) {
  return (
    <div className="field" style={full ? { gridColumn: "1 / -1" } : null}>
      <label>{label}{req && <span className="req">*</span>}</label>
      {children}
      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="field-error"><Icon name="alert-circle" size={12} /> {error}</span>}
      {warning && <span className="field-warn"><Icon name="alert" size={12} /> {warning}</span>}
    </div>
  );
}

export function DataCard({ title, icon, actions, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="row" style={{ gap: 10 }}>
          {icon && <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-100)", color: "var(--primary-700)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={icon} size={16} /></div>}
          <h3>{title}</h3>
        </div>
        {actions}
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

// ผู้เรียกส่ง `color` มากับข้อมูลแต่ละชิ้นได้ เพื่อผูกสีกับตัวข้อมูลจริง (เช่น พรบ.) ไม่ใช่ลำดับที่วาด
// — ลำดับเปลี่ยนเมื่อหมวดที่ไม่มีเคสถูกกรองออก สีจึงสลับกันเองถ้าอิงแค่ index
const DONUT_COLORS = ["#1F4E79", "#2E74B5", "#E65100", "#2E7D32", "#6b3fa0", "#0e7c8a", "#F57F17", "#C62828", "#4a8fcc"];
export function Donut({ data, size = 160 }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth="20" />
        {data.map((d, i) => {
          const frac = d.count / total;
          const dash = frac * c;
          const el = (
            <circle key={d.id} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.color || DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="20"
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-off}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          );
          off += dash;
          return el;
        })}
        <text x={size / 2} y={size / 2 - 4} textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: "var(--text)" }}>{total}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle" style={{ fontSize: 11, fill: "var(--text-muted)" }}>เคส</text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div key={d.id} className="legend-row">
            <span className="legend-dot" style={{ background: d.color || DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">{d.count}</span>
          </div>
        ))}
        {data.length === 0 && <div className="muted small">ไม่มีข้อมูล</div>}
      </div>
    </div>
  );
}
