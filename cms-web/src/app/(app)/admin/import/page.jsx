"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";

const SHEETJS_SRC = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

// Columns the importer understands (header row must use these keys).
const COLUMNS = [
  { key: "etracking", label: "E-tracking", req: true },
  { key: "title", label: "ชื่อเคส (≥5 ตัวอักษร)", req: true },
  { key: "status", label: "สถานะ 01–08 (ว่าง = 01)" },
  { key: "laws", label: "พรบ. (รหัส คั่นด้วย , เช่น drug,food)" },
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

export default function ImportPage() {
  const { role } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
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
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    try {
      const data = await file.arrayBuffer();
      const wb = window.XLSX.read(data, { cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = window.XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
      setRows(parsed);
      if (parsed.length === 0) toast.push({ kind: "warn", title: "ไฟล์ไม่มีข้อมูล" });
    } catch (err) {
      toast.push({ kind: "danger", title: "อ่านไฟล์ไม่สำเร็จ", msg: err.message });
    }
  }

  async function doImport() {
    if (!rows?.length) return;
    setImporting(true);
    try {
      const res = await api.post("/cases/import", { rows });
      setResult(res);
      toast.push({
        kind: res.failed.length ? "warn" : "success",
        title: `นำเข้าสำเร็จ ${res.created}/${res.total} แถว`,
        msg: res.failed.length ? `ล้มเหลว ${res.failed.length} แถว` : "ครบทุกแถว",
      });
    } catch (e) {
      toast.push({ kind: "danger", title: "นำเข้าไม่สำเร็จ", msg: e.message });
    }
    setImporting(false);
  }

  const preview = rows ? rows.slice(0, 8) : [];

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>นำเข้าข้อมูลเก่า (Excel)</h1>
          <div className="page-meta">อัปโหลดไฟล์ .xlsx เพื่อนำเคสเก่าเข้าระบบ · แถวละ 1 เคส</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => router.push("/admin")}><Icon name="arrow-left" size={16} /> กลับตั้งค่า</button>
        </div>
      </div>

      <div className="section-row" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <div className="card">
          <div className="card-header"><div><h3>1. อัปโหลดไฟล์</h3><div className="card-sub">รองรับ .xlsx / .csv · หัวตารางต้องตรงกับชื่อคอลัมน์ที่กำหนด</div></div></div>
          <div className="card-body stack">
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-outline" disabled={!ready} onClick={downloadTemplate}><Icon name="download" size={16} /> ดาวน์โหลด Template</button>
              <button className="btn btn-primary" disabled={!ready} onClick={() => inputRef.current?.click()}><Icon name="upload" size={16} /> เลือกไฟล์</button>
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={onFile} />
              {fileName && <span className="small muted">{fileName} · {rows?.length || 0} แถว</span>}
            </div>
            {!ready && <div className="small muted">กำลังโหลดไลบรารีอ่าน Excel…</div>}

            {rows && rows.length > 0 && (
              <>
                <div className="hr" />
                <div className="small muted" style={{ fontWeight: 600, color: "var(--text)" }}>ตัวอย่าง {preview.length} แถวแรก</div>
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th>#</th><th>E-tracking</th><th>ชื่อเคส</th><th>สถานะ</th><th>พรบ.</th></tr></thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} style={{ cursor: "default" }}>
                          <td className="num">{i + 2}</td>
                          <td className="num">{r.etracking}</td>
                          <td style={{ maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</td>
                          <td>{r.status || "01"}</td>
                          <td className="small">{r.laws}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="row end">
                  <button className="btn btn-primary btn-lg" disabled={importing} onClick={doImport}>
                    <Icon name="upload" size={16} /> {importing ? "กำลังนำเข้า…" : `นำเข้า ${rows.length} แถว`}
                  </button>
                </div>
              </>
            )}

            {result && (
              <>
                <div className="hr" />
                <div className="row" style={{ gap: 10 }}>
                  <span className="status-badge s05"><Icon name="check" size={12} /> สำเร็จ {result.created}</span>
                  {result.failed.length > 0 && <span className="status-badge s07"><Icon name="alert" size={12} /> ล้มเหลว {result.failed.length}</span>}
                </div>
                {result.failed.length > 0 && (
                  <div className="table-wrap">
                    <table className="data">
                      <thead><tr><th>แถว</th><th>E-tracking</th><th>สาเหตุ</th></tr></thead>
                      <tbody>
                        {result.failed.map((f, i) => (
                          <tr key={i} style={{ cursor: "default" }}>
                            <td className="num">{f.row}</td>
                            <td className="num">{f.etracking || "—"}</td>
                            <td className="small" style={{ color: "var(--error-700)" }}>{f.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
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
            <div className="small muted">* = จำเป็น · วันที่ใช้รูปแบบ ค.ศ. (YYYY-MM-DD) · laws ใช้รหัส พรบ. (เช่น drug, food)</div>
          </div>
        </div>
      </div>
    </main>
  );
}
