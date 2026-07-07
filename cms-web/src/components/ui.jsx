"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useApp } from "@/context/AppContext";
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

export function FileUpload({ files = [], onChange, accept = "image/*,application/pdf" }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  function add(list) {
    const newFiles = Array.from(list).map((f) => ({
      name: f.name,
      size: (f.size / 1024 / 1024).toFixed(2) + " MB",
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
        <div className="upload-hint">รองรับ PDF / JPG / PNG ขนาดไม่เกิน 20 MB ต่อไฟล์</div>
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

export function SLATimelineHorizontal({ c }) {
  const snap = SLA.caseSlaSnapshot(c);
  const steps = [
    { key: "assign", label: "มอบหมาย", sla: snap.stageAssign, done: !!c.assignedAt, n: 1 },
    { key: "invest", label: "ตรวจสอบ", sla: snap.stageInvest, done: !!(c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate)), n: 2 },
    { key: "board", label: "กรรมการ", sla: snap.stageBoard, done: !!(c.board && c.board.meetingDate), n: 3 },
    { key: "fine", label: "เปรียบเทียบ", sla: snap.stageFine, done: !!(c.fines && c.fines.length && c.fines.every((f) => f.paid)), n: 4 },
  ];
  const activeIdx = steps.findIndex((s) => !s.done);
  return (
    <div className="sla-timeline">
      {steps.map((s, i) => {
        let cls = "";
        if (s.done) cls = "done";
        else if (i === activeIdx) cls = "current";
        if (s.sla && s.sla.kind === "overdue" && i === activeIdx) cls += " overdue";
        return (
          <div key={s.key} className={`sla-step ${cls}`}>
            <div className="step-circle">{s.done ? <Icon name="check" size={16} stroke={2.5} /> : s.n}</div>
            <div className="step-label">{s.label}</div>
            <div className="step-meta">{s.done ? "เสร็จแล้ว" : (i === activeIdx ? <SLABadge sla={s.sla} /> : "รอ")}</div>
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
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth="20"
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
            <span className="legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">{d.count}</span>
          </div>
        ))}
        {data.length === 0 && <div className="muted small">ไม่มีข้อมูล</div>}
      </div>
    </div>
  );
}
