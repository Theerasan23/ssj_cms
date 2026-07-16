"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";
import { Modal, Tabs, ChipPicker, FormField } from "@/components/ui";

const SHEETJS_SRC = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

const STATUS_CODES = ["01", "02", "03", "04", "05", "06", "07", "08"];
const SLA_ACTIVE_STATUSES = ["01", "02", "03", "04"]; // สถานะที่ยังนับ SLA (05–08 = ปิด/ติดตามผล)
const DATE_FIELDS = ["letterDate", "postDate", "createdAt"];

// Columns the importer understands (header row must use these keys).
const COLUMNS = [
  { key: "etracking", label: "E-tracking", req: true },
  { key: "title", label: "ชื่อเคส (≥5 ตัวอักษร)", req: true },
  { key: "status", label: "สถานะ 01–08 (ว่าง = 01)" },
  { key: "laws", label: "พรบ. (รหัสหรือชื่อ คั่นด้วย , เช่น drug,อาหาร)" },
  { key: "source", label: "ที่มา" },
  { key: "problems", label: "ประเภทปัญหา (คั่นด้วย ,)" },
  { key: "channel", label: "ช่องทาง" },
  { key: "complainant_name", label: "ผู้ร้อง: ชื่อ" },
  { key: "complainant_phone", label: "ผู้ร้อง: โทร" },
  { key: "respondent_business", label: "ผู้ถูกร้อง: สถานประกอบการ" },
  { key: "respondent_licensee", label: "ผู้ถูกร้อง: ผู้รับอนุญาต" },
  { key: "district", label: "อำเภอ" },
  { key: "letterNo", label: "เลขรับหนังสือ" },
  { key: "letterDate", label: "วันที่หนังสือ (ค.ศ. YYYY-MM-DD)" },
  { key: "postNo", label: "เลขรับ POST" },
  { key: "postDate", label: "วันลงรับ POST (ค.ศ. YYYY-MM-DD)" },
  { key: "product", label: "ผลิตภัณฑ์" },
  { key: "description", label: "รายละเอียด" },
  { key: "createdAt", label: "วันที่สร้าง (ค.ศ. YYYY-MM-DD)" },
];
const FIELD_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label.split(" (")[0]]));

// ---------- parsing helpers ----------
function splitList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return String(v).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

// SheetJS date cells can drift by the local timezone; +12h then UTC getters is safe for any offset.
function isoFromExcelDate(d) {
  const t = new Date(d.getTime() + 12 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

// Reads the first sheet cell-by-cell so error cells (#VALUE!) become blanks and
// date cells become YYYY-MM-DD strings. Keeps the original Excel row in _row.
function parseSheet(XLSX, ws) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  const headers = {};
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c })];
    const name = cell && cell.v != null ? String(cell.v).trim() : "";
    if (name) headers[c] = name;
  }
  const rows = [];
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const row = { _row: r + 1 };
    let hasData = false;
    for (const c of Object.keys(headers)) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: Number(c) })];
      let v = "";
      if (cell && cell.t !== "e" && cell.v != null) {
        v = cell.v instanceof Date ? isoFromExcelDate(cell.v) : String(cell.v).trim();
      }
      if (v !== "") hasData = true;
      row[headers[c]] = v;
    }
    if (hasData) rows.push(row);
  }
  return { headers: Object.values(headers), rows };
}

// ---------- validation ----------
function validateRow(r, ctx) {
  const errors = [];
  const warns = [];
  const et = (r.etracking || "").trim();
  if (!et) errors.push({ field: "etracking", msg: "ไม่มี E-tracking" });
  else {
    if ((ctx.fileCount[et] || 0) > 1) errors.push({ field: "etracking", msg: "E-tracking ซ้ำกันในไฟล์" });
    if (ctx.dbDup.has(et)) errors.push({ field: "etracking", msg: "E-tracking นี้มีอยู่ในระบบแล้ว" });
  }
  if ((r.title || "").trim().length < 5) errors.push({ field: "title", msg: "ชื่อเคสต้องมีอย่างน้อย 5 ตัวอักษร" });
  if (!r.status) warns.push({ field: "status", msg: "ไม่ระบุสถานะ ระบบจะใช้ 01 (รับเรื่อง) และเคสจะถูกนับ SLA" });
  else if (!STATUS_CODES.includes(r.status)) warns.push({ field: "status", msg: `สถานะ "${r.status}" ไม่ถูกต้อง ระบบจะใช้ 01 แทน` });
  if (!r.createdAt) {
    const eff = STATUS_CODES.includes(r.status) ? r.status : "01";
    warns.push({
      field: "createdAt",
      msg: SLA_ACTIVE_STATUSES.includes(eff)
        ? "ไม่ระบุวันที่สร้าง ระบบจะเริ่มนับ SLA จากวันที่นำเข้า (วันนี้) — เคสเก่าจะโผล่เป็นเคสค้างดำเนินการ"
        : "ไม่ระบุวันที่สร้าง ระบบจะใช้วันที่นำเข้า (วันนี้)",
    });
  }
  for (const f of DATE_FIELDS) {
    const v = r[f];
    if (!v) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) warns.push({ field: f, msg: `${FIELD_LABEL[f]} "${v}" ไม่ใช่รูปแบบ YYYY-MM-DD จะถูกเว้นว่าง` });
    else if (Number(v.slice(0, 4)) > 2200) warns.push({ field: f, msg: `${FIELD_LABEL[f]} ปี ${v.slice(0, 4)} อาจเป็น พ.ศ. (ต้องเป็น ค.ศ.)` });
  }
  for (const t of r.laws || []) {
    if (!ctx.lawIds.has(t)) warns.push({ field: "laws", msg: `พรบ. "${t}" ไม่พบในระบบ จะถูกละ` });
  }
  for (const t of r.problems || []) {
    if (!ctx.problems.has(t)) warns.push({ field: "problems", msg: `ประเภทปัญหา "${t}" ไม่พบในระบบ จะถูกละ` });
  }
  if (r.source && !ctx.sources.has(r.source)) warns.push({ field: "source", msg: `ที่มา "${r.source}" ไม่พบในระบบ จะถูกเว้นว่าง` });
  if (r.channel && !ctx.channels.has(r.channel)) warns.push({ field: "channel", msg: `ช่องทาง "${r.channel}" ไม่พบในระบบ จะถูกเว้นว่าง` });
  if (r.district && !ctx.districts.has(r.district)) warns.push({ field: "district", msg: `อำเภอ "${r.district}" ไม่พบในระบบ จะถูกเว้นว่าง` });
  return { errors, warns, state: errors.length ? "error" : warns.length ? "warn" : "ok" };
}

const STATE_META = {
  error: { icon: "alert-circle", color: "var(--error-600)", bg: "var(--error-100)", label: "มีข้อผิดพลาด" },
  warn: { icon: "alert", color: "var(--warning-700)", bg: "var(--warning-100)", label: "มีคำเตือน" },
  ok: { icon: "check-circle", color: "var(--success-600)", bg: "transparent", label: "พร้อมนำเข้า" },
};

function toPayload(r) {
  const { _row, ...rest } = r;
  return rest;
}

export default function ImportPage() {
  const { role, master, cms } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [dbDup, setDbDup] = useState(() => new Set());
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [editIdx, setEditIdx] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importingRow, setImportingRow] = useState(null);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.XLSX) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = SHEETJS_SRC;
    s.onload = () => setReady(true);
    s.onerror = () => toast.push({ kind: "danger", title: "โหลดไลบรารี Excel ไม่สำเร็จ", msg: "ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต" });
    document.body.appendChild(s);
  }, [toast]);

  // Lookup tables from master data (laws map both by id and by Thai label).
  const lawMaps = useMemo(() => {
    const byKey = new Map();
    (master?.laws || []).forEach((l) => {
      byKey.set(l.id.toLowerCase(), l.id);
      byKey.set(l.label.replace(/\s+/g, ""), l.id);
    });
    return byKey;
  }, [master]);

  const ctx = useMemo(() => {
    const fileCount = {};
    (rows || []).forEach((r) => {
      const et = (r.etracking || "").trim();
      if (et) fileCount[et] = (fileCount[et] || 0) + 1;
    });
    return {
      fileCount, dbDup,
      lawIds: new Set((master?.laws || []).map((l) => l.id)),
      problems: new Set(master?.problems || []),
      sources: new Set(master?.sources || []),
      channels: new Set(master?.channels || []),
      districts: new Set(master?.districts || []),
    };
  }, [rows, master, dbDup]);

  const issues = useMemo(() => (rows ? rows.map((r) => validateRow(r, ctx)) : null), [rows, ctx]);

  // Re-check duplicates against the DB whenever the set of etrackings changes.
  const etKey = useMemo(() => (rows ? [...new Set(rows.map((r) => (r.etracking || "").trim()).filter(Boolean))].sort().join("\n") : ""), [rows]);
  useEffect(() => {
    if (!etKey) { setDbDup(new Set()); return; }
    let dead = false;
    api.post("/cases/import/check", { etrackings: etKey.split("\n") })
      .then((res) => { if (!dead) setDbDup(new Set(res.existing)); })
      .catch(() => { /* ignore — duplicates will still be caught at import time */ });
    return () => { dead = true; };
  }, [etKey]);

  if (role.id !== "admin") {
    return (
      <main className="page"><div className="card"><div className="table-empty">
        <div className="empty-icon"><Icon name="lock" size={26} /></div>
        <div style={{ fontWeight: 600 }}>เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น</div>
        <button className="btn btn-primary" onClick={() => router.push("/dashboard")}>กลับหน้าหลัก</button>
      </div></div></main>
    );
  }

  function downloadTemplate() {
    const example = {};
    COLUMNS.forEach((c) => { example[c.key] = ""; });
    Object.assign(example, {
      etracking: "ECP-2566-90001", title: "ตัวอย่างเรื่องร้องเรียน (ข้อมูลเก่า)", status: "05",
      laws: "drug,food", source: "แจ้งเบาะแส", problems: "โฆษณาเกินจริง", channel: "Line FDANont",
      complainant_name: "นายตัวอย่าง ใจดี", complainant_phone: "081-000-0000",
      respondent_business: "ร้านตัวอย่าง", district: "เมืองนนทบุรี",
      letterNo: "นบ 0032.2/000", letterDate: "2023-01-15", postNo: "POST-000", postDate: "2023-01-16",
      createdAt: "2023-01-16",
    });
    const ws = window.XLSX.utils.json_to_sheet([example], { header: COLUMNS.map((c) => c.key) });
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "cases");
    window.XLSX.writeFile(wb, "cms-import-template.xlsx");
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResult(null);
    setTab("all");
    setQ("");
    try {
      const data = await file.arrayBuffer();
      const wb = window.XLSX.read(data, { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const { headers, rows: parsed } = parseSheet(window.XLSX, ws);
      if (!headers.includes("etracking") || !headers.includes("title")) {
        toast.push({ kind: "danger", title: "หัวตารางไม่ถูกต้อง", msg: "ต้องมีคอลัมน์ etracking และ title (ดาวน์โหลด Template เพื่อดูตัวอย่าง)" });
        return;
      }
      const normalized = parsed.map((r) => ({
        ...r,
        status: /^[1-8]$/.test(r.status) ? `0${r.status}` : r.status,
        laws: splitList(r.laws).map((t) => lawMaps.get(t.toLowerCase()) || lawMaps.get(t.replace(/\s+/g, "")) || t),
        problems: splitList(r.problems),
      }));
      setFileName(file.name);
      setRows(normalized);
      if (normalized.length === 0) toast.push({ kind: "warn", title: "ไฟล์ไม่มีข้อมูล" });
    } catch (err) {
      toast.push({ kind: "danger", title: "อ่านไฟล์ไม่สำเร็จ", msg: err.message });
    }
  }

  const counts = useMemo(() => {
    const c = { all: rows?.length || 0, error: 0, warn: 0, ok: 0 };
    (issues || []).forEach((it) => { c[it.state]++; });
    return c;
  }, [rows, issues]);

  const visibleIdx = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.map((_, i) => i).filter((i) => {
      if (tab !== "all" && issues[i].state !== tab) return false;
      if (!needle) return true;
      const r = rows[i];
      return (r.etracking || "").toLowerCase().includes(needle) || (r.title || "").toLowerCase().includes(needle);
    });
  }, [rows, issues, tab, q]);

  const importableCount = counts.ok + counts.warn;

  async function doImport() {
    if (!rows || !importableCount || importing) return;
    setImporting(true);
    try {
      const sendIdx = rows.map((_, i) => i).filter((i) => issues[i].state !== "error");
      const res = await api.post("/cases/import", { rows: sendIdx.map((i) => toPayload(rows[i])) });
      const failedSent = new Set(res.failed.map((f) => f.row - 2));
      setResult({
        ...res,
        failed: res.failed.map((f) => ({ ...f, excelRow: rows[sendIdx[f.row - 2]]?._row ?? f.row })),
      });
      const keep = rows.filter((r, i) => issues[i].state === "error" || (sendIdx.includes(i) && failedSent.has(sendIdx.indexOf(i))));
      setRows(keep.length ? keep : null);
      if (!keep.length) setFileName("");
      toast.push({
        kind: res.failed.length ? "warn" : "success",
        title: `นำเข้าสำเร็จ ${res.created}/${res.total} แถว`,
        msg: res.failed.length ? `ล้มเหลว ${res.failed.length} แถว — แถวที่ล้มเหลวยังอยู่ในตารางให้แก้ไข` : "ครบทุกแถว",
      });
    } catch (e) {
      toast.push({ kind: "danger", title: "นำเข้าไม่สำเร็จ", msg: e.message });
    }
    setImporting(false);
  }

  // นำเข้าเฉพาะแถวเดียว (ปุ่มในแต่ละรายการ)
  async function doImportRow(i) {
    if (!rows || importing || importingRow != null || issues[i].state === "error") return;
    const r = rows[i];
    setImportingRow(i);
    try {
      const res = await api.post("/cases/import", { rows: [toPayload(r)] });
      if (res.created === 1) {
        const next = rows.filter((_, j) => j !== i);
        setRows(next.length ? next : null);
        if (!next.length) setFileName("");
        toast.push({ kind: "success", title: `นำเข้าแถวที่ ${r._row} สำเร็จ`, msg: r.etracking ? `E-tracking ${r.etracking}` : undefined });
      } else {
        toast.push({ kind: "danger", title: `นำเข้าแถวที่ ${r._row} ไม่สำเร็จ`, msg: res.failed[0]?.message });
      }
    } catch (e) {
      toast.push({ kind: "danger", title: `นำเข้าแถวที่ ${r._row} ไม่สำเร็จ`, msg: e.message });
    }
    setImportingRow(null);
  }

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>นำเข้าข้อมูลเก่า (Excel)</h1>
          <div className="page-meta">อัปโหลด → ตรวจสอบ/แก้ไขข้อมูล → นำเข้า · แถวละ 1 เคส</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => router.push("/admin")}><Icon name="arrow-left" size={16} /> กลับตั้งค่า</button>
        </div>
      </div>

      <div className="section-row" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="card-header"><div><h3>1. อัปโหลดไฟล์</h3><div className="card-sub">รองรับ .xlsx / .csv · หัวตารางต้องตรงกับชื่อคอลัมน์ที่กำหนด</div></div></div>
          <div className="card-body stack">
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn-outline" disabled={!ready} onClick={downloadTemplate}><Icon name="download" size={16} /> ดาวน์โหลด Template</button>
              <button className="btn btn-primary" disabled={!ready || !master} onClick={() => inputRef.current?.click()}><Icon name="upload" size={16} /> เลือกไฟล์</button>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFile} />
              {fileName && <span className="small muted">{fileName} · {rows?.length || 0} แถว</span>}
            </div>
            {(!ready || !master) && <div className="small muted">กำลังโหลดไลบรารีอ่าน Excel / ข้อมูลระบบ…</div>}
            <div className="small muted">
              ระบบจะตรวจสอบข้อมูลทุกแถวก่อนนำเข้า: ข้อมูลจำเป็น, E-tracking ซ้ำ (ทั้งในไฟล์และในระบบ),
              รูปแบบวันที่ และค่าที่ไม่ตรงกับข้อมูลหลัก (พรบ. / อำเภอ / ช่องทาง ฯลฯ) — ชื่อ พรบ. ภาษาไทยจะถูกแปลงเป็นรหัสให้อัตโนมัติ
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>คอลัมน์ที่รองรับ</h3></div>
          <div className="card-body">
            <div className="stack-sm">
              {COLUMNS.map((c) => (
                <div key={c.key} className="row between" style={{ fontSize: 12.5 }}>
                  <span className="mono" style={{ color: "var(--primary-700)" }}>{c.key}{c.req && <span style={{ color: "var(--error-600)" }}> *</span>}</span>
                  <span className="muted" style={{ textAlign: "right", maxWidth: 200 }}>{c.label}</span>
                </div>
              ))}
            </div>
            <div className="hr" />
            <div className="small muted">* = จำเป็น · วันที่ใช้รูปแบบ ค.ศ. (YYYY-MM-DD) · laws ใช้รหัสหรือชื่อ พรบ. (เช่น drug หรือ ยา)</div>
          </div>
        </div>
      </div>

      {rows && rows.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header">
            <div>
              <h3>2. ตรวจสอบและแก้ไขข้อมูล</h3>
              <div className="card-sub">คลิกแถวเพื่อแก้ไข · แถวที่มีข้อผิดพลาด (สีแดง) จะไม่ถูกนำเข้า · คำเตือน (สีเหลือง) นำเข้าได้แต่ข้อมูลบางส่วนจะถูกเว้นว่าง</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="status-badge s05"><Icon name="check" size={12} /> พร้อม {counts.ok}</span>
              <span className="status-badge" style={{ background: "var(--warning-100)", color: "var(--warning-700)" }}><Icon name="alert" size={12} /> คำเตือน {counts.warn}</span>
              <span className="status-badge s07"><Icon name="alert-circle" size={12} /> ผิดพลาด {counts.error}</span>
            </div>
          </div>
          <div className="card-body stack">
            <div className="row between" style={{ gap: 12, flexWrap: "wrap" }}>
              <Tabs
                value={tab}
                onChange={setTab}
                tabs={[
                  { value: "all", label: "ทั้งหมด", count: counts.all },
                  { value: "error", label: "มีข้อผิดพลาด", count: counts.error },
                  { value: "warn", label: "มีคำเตือน", count: counts.warn },
                  { value: "ok", label: "พร้อมนำเข้า", count: counts.ok },
                ]}
              />
              <input className="input" placeholder="ค้นหา E-tracking / ชื่อเคส" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260 }} />
            </div>

            <div className="table-wrap" style={{ maxHeight: 480, overflow: "auto" }}>
              <table className="data">
                <thead>
                  <tr>
                    <th>แถว</th><th>ผลตรวจ</th><th>E-tracking</th><th>ชื่อเคส</th><th>สถานะ</th>
                    <th>พรบ.</th><th>อำเภอ</th><th>รายละเอียดที่ต้องแก้</th><th style={{ width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleIdx.map((i) => {
                    const r = rows[i];
                    const it = issues[i];
                    const meta = STATE_META[it.state];
                    const all = [...it.errors, ...it.warns];
                    return (
                      <tr key={`${r._row}-${i}`} onClick={() => setEditIdx(i)} style={{ cursor: "pointer", background: meta.bg }}>
                        <td className="num">{r._row}</td>
                        <td><span title={meta.label} style={{ color: meta.color, display: "inline-flex" }}><Icon name={meta.icon} size={16} /></span></td>
                        <td className="num">{r.etracking || "—"}</td>
                        <td style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</td>
                        <td>{r.status || "01"}</td>
                        <td className="small">{(r.laws || []).map((t) => cms.lawLabel(t)).join(", ")}</td>
                        <td className="small">{r.district}</td>
                        <td className="small" style={{ maxWidth: 300, color: it.state === "error" ? "var(--error-700)" : "var(--warning-700)" }}>
                          {all.length > 0 && (
                            <>
                              {all[0].msg}
                              {all.length > 1 && <span className="muted"> (+อีก {all.length - 1})</span>}
                            </>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row" style={{ gap: 4, justifyContent: "flex-end" }}>
                            <button
                              className="icon-btn"
                              title={it.state === "error" ? "ต้องแก้ไขข้อผิดพลาดก่อนนำเข้า" : "นำเข้าเฉพาะแถวนี้"}
                              disabled={it.state === "error" || importing || importingRow != null}
                              style={it.state === "error" || importing || importingRow != null ? { opacity: 0.4, cursor: "not-allowed" } : { color: "var(--primary-700)" }}
                              onClick={() => doImportRow(i)}
                            >
                              <Icon name={importingRow === i ? "clock" : "upload"} size={15} />
                            </button>
                            <button className="icon-btn" title="แก้ไข" onClick={() => setEditIdx(i)}><Icon name="edit" size={15} /></button>
                            <button className="icon-btn" title="ลบแถวนี้ออกจากรายการ" onClick={() => setRows((prev) => { const next = prev.filter((_, j) => j !== i); return next.length ? next : null; })}>
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleIdx.length === 0 && (
                    <tr><td colSpan={9} className="small muted" style={{ textAlign: "center", padding: 20 }}>ไม่มีแถวที่ตรงกับเงื่อนไข</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="row between" style={{ gap: 12, flexWrap: "wrap" }}>
              <div className="small muted">
                {counts.error > 0
                  ? <><Icon name="alert-circle" size={13} style={{ verticalAlign: "-2px", color: "var(--error-600)" }} /> แถวที่มีข้อผิดพลาด {counts.error} แถวจะไม่ถูกนำเข้า — แก้ไขหรือลบออกก่อน</>
                  : "ทุกแถวพร้อมนำเข้า"}
              </div>
              <button className="btn btn-primary btn-lg" disabled={importing || importableCount === 0} onClick={doImport}>
                <Icon name="upload" size={16} /> {importing ? "กำลังนำเข้า…" : `นำเข้า ${importableCount} แถว`}
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-header"><h3>ผลการนำเข้า</h3></div>
          <div className="card-body stack">
            <div className="row" style={{ gap: 10 }}>
              <span className="status-badge s05"><Icon name="check" size={12} /> สำเร็จ {result.created}</span>
              {result.failed.length > 0 && <span className="status-badge s07"><Icon name="alert" size={12} /> ล้มเหลว {result.failed.length}</span>}
            </div>
            {result.failed.length > 0 && (
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th>แถว (Excel)</th><th>E-tracking</th><th>สาเหตุ</th></tr></thead>
                  <tbody>
                    {result.failed.map((f, i) => (
                      <tr key={i} style={{ cursor: "default" }}>
                        <td className="num">{f.excelRow}</td>
                        <td className="num">{f.etracking || "—"}</td>
                        <td className="small" style={{ color: "var(--error-700)" }}>{f.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {editIdx != null && rows && rows[editIdx] && (
        <EditRowModal
          row={rows[editIdx]}
          ctx={ctx}
          master={master}
          cms={cms}
          onClose={() => setEditIdx(null)}
          onDelete={() => {
            setRows((prev) => { const next = prev.filter((_, j) => j !== editIdx); return next.length ? next : null; });
            setEditIdx(null);
          }}
          onSave={(draft) => {
            setRows((prev) => prev.map((r, j) => (j === editIdx ? draft : r)));
            setEditIdx(null);
            toast.push({ kind: "success", title: `บันทึกแถวที่ ${draft._row} แล้ว` });
          }}
        />
      )}
    </main>
  );
}

function EditRowModal({ row, ctx, master, cms, onClose, onDelete, onSave }) {
  const [d, setD] = useState(row);
  const v = validateRow(d, { ...ctx, fileCount: {} }); // in-file dup ตรวจระดับตาราง ไม่ใช่ใน modal
  const err = (f) => v.errors.find((x) => x.field === f)?.msg;
  const warn = (f) => v.warns.find((x) => x.field === f)?.msg;
  const set = (k) => (e) => setD((prev) => ({ ...prev, [k]: e && e.target ? e.target.value : e }));

  const lawOptions = useMemo(() => {
    const opts = (master?.laws || []).map((l) => ({ id: l.id, label: l.label }));
    (d.laws || []).forEach((t) => { if (!opts.some((o) => o.id === t)) opts.push({ id: t, label: `${t} (ไม่พบ)` }); });
    return opts;
  }, [master, d.laws]);

  const problemOptions = useMemo(() => {
    const opts = [...(master?.problems || [])];
    (d.problems || []).forEach((t) => { if (!opts.includes(t)) opts.push(t); });
    return opts;
  }, [master, d.problems]);

  const dateField = (key) => {
    const val = d[key] || "";
    const validIso = /^\d{4}-\d{2}-\d{2}$/.test(val);
    return (
      <FormField label={FIELD_LABEL[key]} warning={warn(key)}>
        <input type="date" className={`input ${warn(key) ? "error" : ""}`} value={validIso ? val : ""} onChange={set(key)} />
      </FormField>
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`แก้ไขข้อมูลแถวที่ ${d._row}`}
      sub={v.errors.length ? `มีข้อผิดพลาด ${v.errors.length} จุดที่ต้องแก้ก่อนนำเข้า` : v.warns.length ? `มีคำเตือน ${v.warns.length} จุด` : "ข้อมูลพร้อมนำเข้า"}
      size="xl"
      footer={
        <>
          <button className="btn btn-danger" onClick={onDelete}><Icon name="trash" size={15} /> ลบแถวนี้</button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={() => onSave(d)}><Icon name="save" size={15} /> บันทึก</button>
        </>
      }
    >
      <div className="form-grid cols-2">
        <FormField label="E-tracking" req error={err("etracking")}>
          <input className={`input ${err("etracking") ? "error" : ""}`} value={d.etracking || ""} onChange={set("etracking")} />
        </FormField>
        <FormField label="สถานะ" warning={warn("status")}>
          <select className="select" value={d.status || ""} onChange={set("status")}>
            <option value="">— ไม่ระบุ (ใช้ 01) —</option>
            {d.status && !STATUS_CODES.includes(d.status) && <option value={d.status}>{d.status} (ไม่ถูกต้อง)</option>}
            {STATUS_CODES.map((c) => <option key={c} value={c}>{c} — {cms.STATUS[c]?.label || ""}</option>)}
          </select>
        </FormField>
        <FormField label="ชื่อเคส" req error={err("title")} full>
          <input className={`input ${err("title") ? "error" : ""}`} value={d.title || ""} onChange={set("title")} />
        </FormField>
        <FormField label="พรบ. ที่เกี่ยวข้อง" warning={warn("laws")} full>
          <ChipPicker options={lawOptions} value={d.laws || []} onChange={set("laws")} />
        </FormField>
        <FormField label="ประเภทปัญหา" warning={warn("problems")} full>
          <ChipPicker options={problemOptions} value={d.problems || []} onChange={set("problems")} />
        </FormField>
        <FormField label="ที่มา" warning={warn("source")}>
          <input className="input" list="dl-import-sources" value={d.source || ""} onChange={set("source")} />
          <datalist id="dl-import-sources">{(master?.sources || []).map((s) => <option key={s} value={s} />)}</datalist>
        </FormField>
        <FormField label="ช่องทาง" warning={warn("channel")}>
          <input className="input" list="dl-import-channels" value={d.channel || ""} onChange={set("channel")} />
          <datalist id="dl-import-channels">{(master?.channels || []).map((s) => <option key={s} value={s} />)}</datalist>
        </FormField>
        <FormField label="อำเภอ" warning={warn("district")}>
          <input className="input" list="dl-import-districts" value={d.district || ""} onChange={set("district")} />
          <datalist id="dl-import-districts">{(master?.districts || []).map((s) => <option key={s} value={s} />)}</datalist>
        </FormField>
        <FormField label="ผลิตภัณฑ์">
          <input className="input" value={d.product || ""} onChange={set("product")} />
        </FormField>
        <FormField label="ผู้ร้อง: ชื่อ">
          <input className="input" value={d.complainant_name || ""} onChange={set("complainant_name")} />
        </FormField>
        <FormField label="ผู้ร้อง: โทร">
          <input className="input" value={d.complainant_phone || ""} onChange={set("complainant_phone")} />
        </FormField>
        <FormField label="ผู้ถูกร้อง: สถานประกอบการ">
          <input className="input" value={d.respondent_business || ""} onChange={set("respondent_business")} />
        </FormField>
        <FormField label="ผู้ถูกร้อง: ผู้รับอนุญาต">
          <input className="input" value={d.respondent_licensee || ""} onChange={set("respondent_licensee")} />
        </FormField>
        <FormField label="เลขรับหนังสือ">
          <input className="input" value={d.letterNo || ""} onChange={set("letterNo")} />
        </FormField>
        {dateField("letterDate")}
        <FormField label="เลขรับ POST">
          <input className="input" value={d.postNo || ""} onChange={set("postNo")} />
        </FormField>
        {dateField("postDate")}
        {dateField("createdAt")}
        <FormField label="รายละเอียด" full>
          <textarea className="textarea" rows={3} value={d.description || ""} onChange={set("description")} />
        </FormField>
      </div>
    </Modal>
  );
}
