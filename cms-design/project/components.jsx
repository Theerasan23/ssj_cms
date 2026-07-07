/* =========================================================
   CMS — Shared React Components
   Exposes globals on window: Icon, StatusBadge, SLABadge,
   Avatar, AvatarStack, ChipPicker, Tabs, Modal, ToastZone,
   useToasts, FileUpload, SLATimelineHorizontal, etc.
   ========================================================= */

// ---------- Icons (Lucide-style outline, minimal hand-picked) ----------
const Icon = ({ name, size = 18, stroke = 1.8, className = "", style }) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style,
    "aria-hidden": "true",
  };
  switch (name) {
    case "home":      return <svg {...props}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>;
    case "inbox":     return <svg {...props}><path d="M3 14h4l2 3h6l2-3h4"/><path d="M5 4h14l2 10v6H3v-6z"/></svg>;
    case "plus":      return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "list":      return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "users":     return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case "user":      return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case "calendar":  return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>;
    case "coin":      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9 9.5C9 8 10.5 7 12 7s3 1 3 2.5S13.5 12 12 12s-3 1-3 2.5S10.5 17 12 17s3-1 3-2.5"/></svg>;
    case "chart":     return <svg {...props}><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7"/><rect x="13" y="6" width="3" height="12"/><rect x="19" y="14" width="3" height="4"/></svg>;
    case "settings":  return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8h0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "search":    return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>;
    case "bell":      return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case "menu":      return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "x":         return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "check":     return <svg {...props}><path d="M5 12l5 5L20 7"/></svg>;
    case "check-circle": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>;
    case "alert":     return <svg {...props}><path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0z"/></svg>;
    case "alert-circle": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>;
    case "info":      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>;
    case "clock":     return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "filter":    return <svg {...props}><path d="M3 4h18l-7 9v6l-4 2v-8z"/></svg>;
    case "download":  return <svg {...props}><path d="M12 3v14m-5-5 5 5 5-5"/><path d="M5 21h14"/></svg>;
    case "upload":    return <svg {...props}><path d="M12 17V3m-5 5 5-5 5 5"/><path d="M5 21h14"/></svg>;
    case "file":      return <svg {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>;
    case "image":     return <svg {...props}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>;
    case "trash":     return <svg {...props}><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/></svg>;
    case "edit":      return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
    case "eye":       return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "arrow-right":return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "arrow-left": return <svg {...props}><path d="M19 12H5M11 5l-7 7 7 7"/></svg>;
    case "chevron-down": return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "chevron-up":   return <svg {...props}><path d="m6 15 6-6 6 6"/></svg>;
    case "chevron-right":return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevron-left": return <svg {...props}><path d="m15 6-6 6 6 6"/></svg>;
    case "logout":    return <svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>;
    case "shield":    return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "gavel":     return <svg {...props}><path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6M8 8l6-6M9 7 17 15M5 11l8 8"/></svg>;
    case "send":      return <svg {...props}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>;
    case "ban":       return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m5.5 5.5 13 13"/></svg>;
    case "tag":       return <svg {...props}><path d="M20.59 13.41 13 21l-9-9V3h9l7.59 7.59a2 2 0 0 1 0 2.82z"/><circle cx="7.5" cy="7.5" r="1.2"/></svg>;
    case "package":   return <svg {...props}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.27 6.96 8.73 5.04 8.73-5.04M12 22.08V12"/></svg>;
    case "history":   return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
    case "phone":     return <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case "map-pin":   return <svg {...props}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
    case "mail":      return <svg {...props}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></svg>;
    case "paperclip": return <svg {...props}><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66L9.41 17.42a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
    case "trend-up":  return <svg {...props}><path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>;
    case "trend-down":return <svg {...props}><path d="m23 18-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>;
    case "circle":    return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
    case "box":       return <svg {...props}><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 22V13"/></svg>;
    case "loupe":     return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/></svg>;
    case "money":     return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>;
    case "external":  return <svg {...props}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg>;
    case "more":      return <svg {...props}><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>;
    case "save":      return <svg {...props}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
    case "printer":   return <svg {...props}><path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="9" rx="2"/><rect x="6" y="14" width="12" height="7"/></svg>;
    case "pin":       return <svg {...props}><path d="m12 17 6-6-6-6M6 11h12"/></svg>;
    case "stack":     return <svg {...props}><path d="M12 2 2 7l10 5 10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/></svg>;
    case "spark":     return <svg {...props}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>;
    case "lock":      return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/><circle cx="12" cy="16" r="1"/></svg>;
    case "lock-open": return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>;
    case "approve":   return <svg {...props}><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>;
    case "hand":      return <svg {...props}><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>;
    default: return null;
  }
};

// ---------- Status Badge ----------
const STATUS_ICONS = {
  "01": "box", "02": "loupe", "03": "calendar", "04": "money",
  "05": "check-circle", "06": "send", "07": "gavel", "08": "ban",
};
const StatusBadge = ({ code, size = "md", showLabel = true }) => {
  const s = window.CMS.STATUS[code];
  if (!s) return null;
  return (
    <span className={`status-badge ${s.cls} ${size === "lg" ? "lg" : ""}`}>
      <Icon name={STATUS_ICONS[code]} size={size === "lg" ? 14 : 12} stroke={2}/>
      {showLabel && s.label}
    </span>
  );
};

// ---------- SLA Badge ----------
const SLABadge = ({ sla }) => {
  if (!sla) return null;
  const ic = sla.kind === "overdue" ? "alert" : sla.kind === "near" ? "clock" : sla.kind === "in-time" ? "check" : "clock";
  return (
    <span className={`sla-badge ${sla.kind}`}>
      <Icon name={ic} size={11} stroke={2.2}/>
      {sla.label}
    </span>
  );
};

// ---------- Avatar ----------
const Avatar = ({ name = "", size = "md", color }) => {
  const initials = name.trim() ? name.trim().split(/\s+/).slice(0,2).map(s => s[0]).join("") : "?";
  return <span className={`avatar ${size === "sm" ? "sm" : size === "lg" ? "lg" : ""}`} style={color ? { background: color, color: "#fff" } : null}>{initials}</span>;
};
const AvatarStack = ({ names = [], max = 3, size = "sm" }) => {
  const show = names.slice(0, max);
  const rest = names.length - show.length;
  return (
    <span className="avatar-stack">
      {show.map((n, i) => <Avatar key={i} name={n} size={size}/>)}
      {rest > 0 && <span className={`avatar ${size === "sm" ? "sm" : ""} more`}>+{rest}</span>}
    </span>
  );
};

// ---------- Chip Picker (multi-select chips) ----------
const ChipPicker = ({ options, value = [], onChange, single }) => (
  <div className="chip-picker">
    {options.map(opt => {
      const id = typeof opt === "string" ? opt : opt.id;
      const label = typeof opt === "string" ? opt : opt.label;
      const on = value.includes(id);
      return (
        <button type="button" key={id} className={`pick ${on ? "on" : ""}`}
          onClick={() => {
            if (single) { onChange([id]); return; }
            onChange(on ? value.filter(x => x !== id) : [...value, id]);
          }}>
          {on && <Icon name="check" size={12} stroke={2.5} style={{ marginRight: 4 }}/>}
          {label}
        </button>
      );
    })}
  </div>
);

// ---------- Tabs ----------
const Tabs = ({ tabs, value, onChange }) => (
  <div className="tabs">
    {tabs.map(t => (
      <button key={t.value} className={`tab ${value === t.value ? "active" : ""}`} onClick={() => onChange(t.value)}>
        {t.icon && <Icon name={t.icon} size={15}/>}
        {t.label}
        {t.count != null && <span className="count">{t.count}</span>}
      </button>
    ))}
  </div>
);

// ---------- Modal ----------
const Modal = ({ open, onClose, title, sub, children, footer, size = "md", closeOnBackdrop = true }) => {
  if (!open) return null;
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={(e)=> { if (closeOnBackdrop && e.target === e.currentTarget) onClose && onClose(); }}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          <button className="icon-btn" onClick={() => onClose && onClose()}><Icon name="x" size={18}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

// ---------- Toast ----------
let toastSeq = 0;
const ToastContext = React.createContext({ push: () => {} });
function useToasts() { return React.useContext(ToastContext); }
const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);
  const push = React.useCallback((t) => {
    const id = ++toastSeq;
    setToasts(prev => [...prev, { id, ...t }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), t.timeout || 3800);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-zone">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.kind || ""}`}>
            <Icon className="toast-icon" name={t.kind === "success" ? "check-circle" : t.kind === "warn" ? "alert" : t.kind === "error" ? "alert-circle" : "info"} size={20}/>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.msg && <div className="toast-msg">{t.msg}</div>}
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// ---------- File upload ----------
const FileUpload = ({ files = [], onChange, accept = "image/*,application/pdf" }) => {
  const [drag, setDrag] = React.useState(false);
  const inputRef = React.useRef(null);
  function add(list) {
    const newFiles = Array.from(list).map(f => ({
      name: f.name,
      size: (f.size/1024/1024).toFixed(2) + " MB",
      type: f.type.startsWith("image") ? "image" : f.type === "application/pdf" ? "pdf" : "other",
    }));
    onChange([...(files || []), ...newFiles]);
  }
  return (
    <div className="stack">
      <div className={`upload-zone ${drag ? "dragging" : ""}`}
        onClick={() => inputRef.current && inputRef.current.click()}
        onDragOver={(e)=>{ e.preventDefault(); setDrag(true); }}
        onDragLeave={()=> setDrag(false)}
        onDrop={(e)=>{ e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
        <Icon className="upload-icon" name="upload" size={28} stroke={1.6}/>
        <div className="upload-title">ลากไฟล์มาวาง หรือ คลิกเพื่อเลือก</div>
        <div className="upload-hint">รองรับ PDF / JPG / PNG ขนาดไม่เกิน 20 MB ต่อไฟล์</div>
        <input ref={inputRef} type="file" multiple accept={accept} style={{ display: "none" }}
          onChange={(e)=> add(e.target.files)}/>
      </div>
      {files && files.length > 0 && (
        <div className="stack-sm">
          {files.map((f, i) => (
            <div key={i} className="file-row">
              <div className="file-thumb">{f.type === "image" ? <Icon name="image" size={18}/> : f.type === "pdf" ? "PDF" : <Icon name="file" size={18}/>}</div>
              <div className="file-name">{f.name}</div>
              <div className="file-meta">{f.size}</div>
              <button className="icon-btn" style={{width: 32, height: 32}} onClick={(e)=>{ e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}>
                <Icon name="trash" size={14}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------- SLA Timeline (horizontal 4-step) ----------
const SLATimelineHorizontal = ({ c }) => {
  const snap = window.CMS.caseSlaSnapshot(c);
  const steps = [
    { key: "assign",  label: "มอบหมาย",     sla: snap.stageAssign, done: !!c.assignedAt, n: 1 },
    { key: "invest",  label: "ตรวจสอบ",     sla: snap.stageInvest, done: !!(c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate)), n: 2 },
    { key: "board",   label: "กรรมการ",     sla: snap.stageBoard,  done: !!(c.board && c.board.meetingDate), n: 3 },
    { key: "fine",    label: "เปรียบเทียบ", sla: snap.stageFine,   done: !!(c.fines && c.fines.length && c.fines.every(f=>f.paid)), n: 4 },
  ];
  // Active step is first that is not done
  const activeIdx = steps.findIndex(s => !s.done);
  return (
    <div className="sla-timeline">
      {steps.map((s, i) => {
        let cls = "";
        if (s.done) cls = "done";
        else if (i === activeIdx) cls = "current";
        if (s.sla && s.sla.kind === "overdue" && i === activeIdx) cls += " overdue";
        return (
          <div key={s.key} className={`sla-step ${cls}`}>
            <div className="step-circle">{s.done ? <Icon name="check" size={16} stroke={2.5}/> : s.n}</div>
            <div className="step-label">{s.label}</div>
            <div className="step-meta">
              {s.done ? "เสร็จแล้ว" : (i === activeIdx ? <SLABadge sla={s.sla}/> : "รอ")}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- SLA Timeline (vertical) ----------
const SLATimelineVertical = ({ c }) => {
  const snap = window.CMS.caseSlaSnapshot(c);
  const steps = [
    { key: "assign",  label: "มอบหมายเจ้าหน้าที่",  sla: snap.stageAssign, done: !!c.assignedAt },
    { key: "invest",  label: "ตรวจสอบข้อเท็จจริง",  sla: snap.stageInvest, done: !!(c.investigation && (c.investigation.siteVisitDate || c.investigation.meetingDate)) },
    { key: "board",   label: "เข้าคณะกรรมการ",       sla: snap.stageBoard,  done: !!(c.board && c.board.meetingDate) },
    { key: "fine",    label: "เปรียบเทียบปรับ",       sla: snap.stageFine,   done: !!(c.fines && c.fines.length && c.fines.every(f=>f.paid)) },
  ];
  const activeIdx = steps.findIndex(s => !s.done);
  return (
    <div className="v-timeline">
      {steps.map((s, i) => {
        let cls = i === activeIdx ? "" : (s.done ? "done" : "pending");
        if (s.sla && s.sla.kind === "overdue" && i === activeIdx) cls = "overdue";
        return (
          <div key={s.key} className={`v-event ${cls}`}>
            <div className="v-title">{s.label}</div>
            <div className="v-body">
              {s.done ? "เสร็จสมบูรณ์" : (i === activeIdx ? <SLABadge sla={s.sla}/> : "รอขั้นก่อนหน้า")}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------- Dropdown / Popover (simple click-outside helper) ----------
function useClickOutside(ref, onClose) {
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, onClose]);
}

// ---------- Wordmark Logo ----------
const Logo = ({ size = "md", variant = "dark" }) => {
  const isLight = variant === "light";
  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="brand-mark" style={{
        width: size === "lg" ? 48 : 36, height: size === "lg" ? 48 : 36,
        borderRadius: 10,
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
};

// ---------- Export ----------
Object.assign(window, {
  Icon, StatusBadge, SLABadge, Avatar, AvatarStack,
  ChipPicker, Tabs, Modal, ToastProvider, useToasts,
  FileUpload, SLATimelineHorizontal, SLATimelineVertical,
  Logo, useClickOutside,
  STATUS_ICONS,
});
