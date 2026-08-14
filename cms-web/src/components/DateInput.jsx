"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { BE_OFFSET, THAI_MONTHS_FULL, isoToThai, thaiToIso } from "@/lib/format";

const DOW = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];
const pad = (n) => String(n).padStart(2, "0");
const localIso = (dt) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

// Keeps digits only and lays them out as วว/ดด/ปปปป while the user types.
function mask(raw) {
  const n = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  return [n.slice(0, 2), n.slice(2, 4), n.slice(4, 8)].filter(Boolean).join("/");
}

// Replaces <input type="date">, whose display format follows the browser locale and
// can't be forced. Reads and writes ISO (ค.ศ.) like the native control did, so callers
// are unchanged apart from onChange handing back the value instead of an event.
export function DateInput({ value, onChange, className = "", disabled, id }) {
  const [text, setText] = useState(() => isoToThai(value));
  const [open, setOpen] = useState(false);
  const iso = useRef(value || "");
  const wrap = useRef(null);

  // Re-sync only when the parent changes the value behind our back (form reset, loading
  // a case to edit) — never on the echo of our own onChange, which would wipe the
  // half-typed text sitting in the field.
  useEffect(() => {
    const next = value || "";
    if (next === iso.current) return;
    iso.current = next;
    setText(isoToThai(next));
  }, [value]);

  function commit(nextText) {
    setText(nextText);
    const next = thaiToIso(nextText);
    iso.current = next;
    onChange(next);
  }

  function pick(nextIso) {
    iso.current = nextIso;
    setText(isoToThai(nextIso));
    setOpen(false);
    onChange(nextIso);
  }

  // "/" pads a single-digit segment and moves on, so 1/2/2569 works as well as 01022569.
  function onKeyDown(e) {
    if (e.key === "Escape" && open) { setOpen(false); return; }
    if (e.key !== "/") return;
    e.preventDefault();
    const el = e.currentTarget;
    if (el.selectionStart !== text.length || el.selectionEnd !== text.length) return;
    const segs = text.split("/");
    if (segs.length >= 3) return;
    const cur = segs[segs.length - 1];
    if (!cur) return;
    segs[segs.length - 1] = cur.length === 1 ? `0${cur}` : cur;
    commit(`${segs.join("/")}/`);
  }

  // An incomplete date stores nothing, so don't leave text on screen implying it did.
  function onBlur() {
    if (text && !thaiToIso(text)) commit("");
  }

  return (
    <div className="date-input" ref={wrap}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder="วว/ดด/ปปปป"
        className={`input ${className}`}
        disabled={disabled}
        value={text}
        onChange={(e) => commit(mask(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="date-input-cal"
        disabled={disabled}
        tabIndex={-1}
        aria-label="เลือกจากปฏิทิน"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="calendar" size={16} />
      </button>
      {open && !disabled && (
        <Calendar anchor={wrap} value={iso.current} onPick={pick} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

const PANEL_W = 264;
const PANEL_H = 296;

// Portalled and fixed-positioned so it escapes the scroll/overflow clipping of modal bodies.
function Calendar({ anchor, value, onPick, onClose }) {
  const ref = useRef(null);
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState(() => {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : today;
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const below = r.bottom + 6;
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - PANEL_W - 8)),
        top: below + PANEL_H > window.innerHeight ? Math.max(8, r.top - PANEL_H - 6) : below,
      });
    };
    place();
    window.addEventListener("resize", place);
    // Fixed positioning can't follow a scrolling ancestor, so step aside instead of drifting.
    window.addEventListener("scroll", onClose, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    const h = (e) => {
      if (ref.current?.contains(e.target)) return;
      // Clicks on the field itself are the toggle button's business, not ours.
      if (anchor.current?.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [anchor, onClose]);

  const cells = useMemo(() => {
    const lead = new Date(view.y, view.m, 1).getDay();
    const len = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array(lead).fill(null), ...Array.from({ length: len }, (_, i) => i + 1)];
  }, [view]);

  // Widen the range if an existing value sits outside the usual working window.
  const years = useMemo(() => {
    const lo = Math.min(view.y, today.getFullYear() - 10);
    const hi = Math.max(view.y, today.getFullYear() + 5);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }, [view.y, today]);

  function shift(delta) {
    setView((v) => {
      const t = new Date(v.y, v.m + delta, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });
  }

  const todayIso = localIso(today);
  const panel = (
    <div className="cal-pop" ref={ref} style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" }}>
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="เดือนก่อนหน้า" onClick={() => shift(-1)}>
          <Icon name="chevron-left" size={16} />
        </button>
        <select className="cal-sel" aria-label="เดือน" value={view.m}
          onChange={(e) => setView((v) => ({ ...v, m: +e.target.value }))}>
          {THAI_MONTHS_FULL.map((name, i) => <option key={name} value={i}>{name}</option>)}
        </select>
        <select className="cal-sel" aria-label="ปี พ.ศ." value={view.y}
          onChange={(e) => setView((v) => ({ ...v, y: +e.target.value }))}>
          {years.map((y) => <option key={y} value={y}>{y + BE_OFFSET}</option>)}
        </select>
        <button type="button" className="cal-nav" aria-label="เดือนถัดไป" onClick={() => shift(1)}>
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
      <div className="cal-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`x${i}`} />;
          const cellIso = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
          return (
            <button
              key={cellIso}
              type="button"
              className={`cal-day ${cellIso === value ? "sel" : ""} ${cellIso === todayIso ? "today" : ""}`}
              onClick={() => onPick(cellIso)}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="cal-foot">
        <button type="button" className="cal-link" onClick={() => onPick(todayIso)}>วันนี้</button>
        <button type="button" className="cal-link" onClick={() => onPick("")}>ล้าง</button>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(panel, document.body);
}
