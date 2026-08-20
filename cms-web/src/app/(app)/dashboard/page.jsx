"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusBadge, SLABadge } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";
import { SUPERVISOR_ROLES } from "@/lib/roles";

// จำนวนแถวของตาราง "เคสล่าสุด" — มากกว่านี้ให้กด "ดูเคสทั้งหมด" ไปหน้า /cases ซึ่งมีตัวกรองครบ
const RECENT_LIMIT = 12;
const ELLIPSIS = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// หน้าหลักเหลือแค่ "เคสล่าสุด" — การ์ด KPI/กราฟ/งานค้าง/ภาระงานเจ้าหน้าที่ ย้ายไปหน้ารายงาน · KPI
// ทั้งหมดแล้ว เพื่อให้ตัวเลขทุกตัวอยู่ที่เดียวและนับด้วยเกณฑ์เดียวกัน (ดู lib/caseStats.js)
export default function DashboardPage() {
  const { role, cms } = useApp();
  const router = useRouter();
  const { cases, loading } = useAllCases();

  // API ส่งมาเรียงตามวันที่สร้างล่าสุดอยู่แล้ว — เรียงซ้ำฝั่ง client กัน order เปลี่ยนในอนาคต
  const recent = useMemo(
    () => [...cases]
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || b.id - a.id)
      .slice(0, RECENT_LIMIT),
    [cases]
  );

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>สวัสดีครับ {role.name.split(" ")[0]}</h1>
          <div className="page-meta">วันนี้ {cms.fmtThaiDate(cms.TODAY)} · {role.role}</div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-outline" onClick={() => router.push("/cases")}><Icon name="inbox" size={16} /> ดูเคสทั้งหมด</button>
            <button className="btn btn-outline" onClick={() => router.push("/reports")}><Icon name="chart" size={16} /> รายงาน · KPI</button>
            {["supply", ...SUPERVISOR_ROLES].includes(role.id) && (
              <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="history" size={18} style={{ color: "var(--primary-700)" }} /> เคสล่าสุด
              {/* ไม่โชว์ยอดรวมที่นี่ — หน้าหลักนับดิบ (รวมร่าง/ยกเลิก) ส่วนหน้ารายงานตัดสองอย่างนั้นออก
                  เลขสองหน้าจะไม่ตรงกันอีก ให้ตัวเลขสรุปทุกตัวอยู่ที่หน้ารายงาน · KPI ที่เดียว */}
              <span className="chip primary" style={{ fontSize: 11 }}>{recent.length} รายการล่าสุด</span>
            </h3>
            <div className="card-sub">เรียงตามวันที่สร้างล่าสุด · ตัวเลขสรุปและกราฟทั้งหมดอยู่ที่หน้ารายงาน · KPI</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => router.push("/cases")}>ดูเคสทั้งหมด <Icon name="arrow-right" size={14} /></button>
        </div>
        {recent.length === 0 ? (
          <div className="table-empty">
            <div className="empty-icon"><Icon name="inbox" size={26} /></div>
            <div style={{ fontWeight: 600 }}>ยังไม่มีเคสในระบบ</div>
            <div className="small">เคสที่สร้างใหม่จะขึ้นที่นี่</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>E-tracking</th><th>ชื่อเคส</th><th>ผู้ถูกร้อง · อำเภอ</th><th>พรบ.</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th>SLA</th><th>ลงรับ</th><th></th></tr></thead>
              <tbody>
                {recent.map((c) => {
                  const locked = cms.isCaseLocked(c);
                  return (
                    <tr key={c.id} className={locked ? "row-locked" : ""} onClick={() => router.push(`/cases/${c.id}`)}>
                      <td className="num">
                        <div className="row" style={{ gap: 6, alignItems: "center" }}>
                          {locked && <span className="lock-pill" title="เคสล็อก เกิน SLA"><Icon name="lock" size={10} /></span>}
                          {c.returned && <span className="lock-pill" style={{ background: "var(--warning-700)" }} title="ถูกส่งกลับให้แก้ไข"><Icon name="arrow-left" size={10} /></span>}
                          {c.isDraft && <span className="lock-pill" style={{ background: "var(--text-soft)" }} title="ร่าง — ยังไม่ส่งขออนุมัติ"><Icon name="edit" size={10} /> ร่าง</span>}
                          {c.etracking || <span className="muted">—</span>}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.title || <span className="muted">(ร่าง — ยังไม่ตั้งชื่อเรื่อง)</span>}
                      </td>
                      {/* ชื่อสถานประกอบการบางรายการยาวมาก (เกิน 100 ตัวอักษร) ปล่อยไว้แถวจะสูง 6-7 บรรทัด
                          จนตารางอ่านยาก — ตัดด้วย ellipsis และกางเต็มใน title เมื่อชี้เมาส์ */}
                      <td style={{ maxWidth: 240 }}>
                        <div style={{ fontWeight: 500, ...ELLIPSIS }} title={c.respondent.business || c.respondent.licensee || ""}>
                          {c.respondent.business || c.respondent.licensee || "—"}
                        </div>
                        <div className="small muted">{c.respondent.district}</div>
                      </td>
                      <td><div className="tag-list">{c.laws.slice(0, 2).map((id) => <span key={id} className="chip">{cms.lawLabel(id)}</span>)}{c.laws.length > 2 && <span className="chip">+{c.laws.length - 2}</span>}</div></td>
                      <td>{c.assignees.length === 0 ? <span className="muted small">— ยังไม่มอบหมาย</span> : c.assignees.map((id) => cms.officerName(id)).join(", ")}</td>
                      <td><StatusBadge code={c.status} /></td>
                      <td><SLABadge sla={cms.caseSla(c)} /></td>
                      <td className="muted small">{cms.fmtThaiDateShort(c.postDate)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => router.push(`/cases/${c.id}`)}><Icon name="chevron-right" size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
