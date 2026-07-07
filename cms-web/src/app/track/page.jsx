"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Logo, SLATimelineHorizontal, STATUS_ICONS } from "@/components/ui";
import { fmtThaiDate } from "@/lib/format";
import { api } from "@/lib/api";

// Public page works without auth, so labels are inlined (they are fixed constants).
const STATUS = {
  "01": { label: "รอมอบหมาย", cls: "s01" }, "02": { label: "ดำเนินการตรวจสอบ", cls: "s02" },
  "03": { label: "รอเข้าคณะกรรมการ", cls: "s03" }, "04": { label: "เปรียบเทียบปรับ", cls: "s04" },
  "05": { label: "ยุติคดี", cls: "s05" }, "06": { label: "ส่งต่อ", cls: "s06" },
  "07": { label: "ดำเนินคดี", cls: "s07" }, "08": { label: "ยกเลิก", cls: "s08" },
};
const LAWS = {
  drug: "ยา", food: "อาหาร", cosm: "เครื่องสำอาง", hosp: "สถานพยาบาล",
  heal: "สถานประกอบการเพื่อสุขภาพ", haz: "วัตถุอันตราย", med: "เครื่องมือแพทย์",
  herb: "ผลิตภัณฑ์สมุนไพร", narc: "ยาเสพติด/วัตถุออกฤทธิ์",
};

function PublicStatusBadge({ code }) {
  const s = STATUS[code];
  if (!s) return null;
  return (
    <span className={`status-badge ${s.cls} lg`}>
      <Icon name={STATUS_ICONS[code]} size={14} stroke={2} /> {s.label}
    </span>
  );
}

export default function PublicTrackPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  async function search() {
    const et = q.trim();
    if (!et) return;
    try {
      const r = await api.get(`/public/track?etracking=${encodeURIComponent(et)}`);
      setResult(r.found ? r.case : null);
    } catch {
      setResult(null);
    }
    setSearched(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Logo />
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/login")}>
          <Icon name="user" size={14} /> เข้าสู่ระบบ
        </button>
      </header>

      <div style={{ flex: 1, padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 600, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>ติดตามสถานะเรื่องร้องเรียน</h1>
            <p className="muted" style={{ fontSize: 15 }}>กรอกเลข E-tracking ที่ได้รับเพื่อตรวจสอบสถานะปัจจุบัน</p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="field">
              <label>เลข E-tracking</label>
              <div className="row">
                <input className="input mono" style={{ flex: 1, height: 48, fontSize: 16 }} placeholder="เช่น ECP-2569-00123"
                  value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
                <button className="btn btn-primary btn-lg" onClick={search}><Icon name="search" size={16} /> ค้นหา</button>
              </div>
              <span className="hint">ตัวอย่าง: ECP-2569-00123, ECP-2569-00125</span>
            </div>
          </div>

          {searched && result && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-body">
                <div className="row between" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="small muted">E-tracking</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{result.etracking}</div>
                  </div>
                  <PublicStatusBadge code={result.status} />
                </div>
                <div className="hr" />
                <div className="kv">
                  <div className="k">วันที่ลงรับ</div><div className="v">{fmtThaiDate(result.postDate)}</div>
                  <div className="k">หมวด พรบ.</div><div className="v"><div className="tag-list">{result.laws.map((l) => <span key={l} className="chip primary">{LAWS[l] || l}</span>)}</div></div>
                  <div className="k">ขั้นปัจจุบัน</div><div className="v">{STATUS[result.status]?.label}</div>
                  <div className="k">อัปเดตล่าสุด</div><div className="v">{fmtThaiDate(result.timeline.at(-1)?.date)}</div>
                </div>
                <div className="hr" />
                <div className="small muted" style={{ fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>ความคืบหน้า</div>
                <SLATimelineHorizontal c={result} />
                <div style={{ marginTop: 16, padding: 12, background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5 }} className="muted">
                  <Icon name="shield" size={14} /> ระบบนี้แสดงเฉพาะสถานะเคส — ไม่แสดงข้อมูลส่วนบุคคล (PDPA)
                </div>
              </div>
            </div>
          )}
          {searched && !result && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="table-empty">
                <div className="empty-icon"><Icon name="search" size={24} /></div>
                <div style={{ fontWeight: 600 }}>ไม่พบเลข E-tracking ที่ค้นหา</div>
                <div className="small">กรุณาตรวจสอบรหัสและลองอีกครั้ง</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer style={{ padding: "20px 24px", textAlign: "center", borderTop: "1px solid var(--border)", background: "var(--surface)" }} className="muted small">
        © 2569 สำนักงานสาธารณสุขจังหวัดนนทบุรี · ช่วยเหลือ: 02-950-3112 · CMS v3.1
      </footer>
    </div>
  );
}
