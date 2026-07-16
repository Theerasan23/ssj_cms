"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Tabs } from "@/components/ui";
import { ExportButtons } from "@/components/ExportButtons";
import { useApp } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";

export default function FinesPage() {
  const { cms } = useApp();
  const router = useRouter();
  const { cases, loading } = useAllCases();
  const [tab, setTab] = useState("unpaid");

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  const allFines = [];
  cases.forEach((c) => (c.fines || []).forEach((f) => allFines.push({ ...f, remaining: f.amount - (f.paidAmount || 0), c })));
  const unpaid = allFines.filter((f) => !f.paid);
  const paid = allFines.filter((f) => f.paid);
  const totalUnpaid = unpaid.reduce((s, f) => s + f.remaining, 0);
  const totalPaid = allFines.reduce((s, f) => s + (f.paidAmount || 0), 0);
  const rows = tab === "unpaid" ? unpaid : paid;

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>ค่าปรับ</h1>
          <div className="page-meta">ติดตามการเปรียบเทียบปรับ · ประวัติการชำระ</div>
        </div>
        <div className="page-actions">
          <ExportButtons rows={() => rows} filename={`fines-${tab}`} size="md" columns={[
            { header: "E-tracking", value: (f) => f.c.etracking || "" },
            { header: "เคส", value: (f) => f.c.title },
            { header: "มาตรา", value: (f) => cms.sectionById(f.secId)?.text || f.secId },
            { header: "ครั้งที่", value: (f) => f.count },
            { header: "จำนวนเงิน", value: (f) => f.amount },
            { header: "ชำระแล้ว", value: (f) => f.paidAmount || 0 },
            { header: "คงเหลือ", value: (f) => f.remaining },
            { header: "สถานะ", value: (f) => (f.paid ? "ชำระครบ" : (f.paidAmount || 0) > 0 ? "ชำระบางส่วน" : "ค้างชำระ") },
            { header: "วันชำระล่าสุด", value: (f) => (f.paidDate ? cms.fmtThaiDate(f.paidDate) : "") },
          ]} />
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card warn">
          <div className="kpi-label">ค่าปรับค้างจ่าย</div>
          <div className="kpi-value">{cms.fmtMoney(totalUnpaid).replace(" บาท", "")}</div>
          <div className="kpi-trend"><Icon name="coin" size={14} /> {unpaid.length} รายการ</div>
          <div className="kpi-icon"><Icon name="coin" size={18} /></div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label">ชำระแล้วในปีนี้</div>
          <div className="kpi-value">{cms.fmtMoney(totalPaid).replace(" บาท", "")}</div>
          <div className="kpi-trend up"><Icon name="check-circle" size={14} /> {paid.length} รายการ</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เคสที่อยู่ในขั้นเปรียบเทียบ</div>
          <div className="kpi-value">{cases.filter((c) => c.status === "04").length}</div>
          <div className="kpi-trend"><Icon name="money" size={14} /> รออัปเดต</div>
          <div className="kpi-icon"><Icon name="money" size={18} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เคสค้างจ่าย ≥ 30 วัน</div>
          <div className="kpi-value">{unpaid.length}</div>
          <div className="kpi-trend down"><Icon name="alert" size={14} /> ต้องติดตาม</div>
          <div className="kpi-icon"><Icon name="alert" size={18} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: "unpaid", label: "ค้างชำระ", icon: "coin", count: unpaid.length },
            { value: "paid", label: "ชำระแล้ว", icon: "check-circle", count: paid.length },
          ]} />
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>E-tracking</th><th>เคส</th><th>มาตรา</th><th>ครั้งที่</th><th>ค่าปรับ</th><th>ชำระแล้ว</th><th>คงเหลือ</th><th>วันชำระล่าสุด</th><th></th></tr></thead>
            <tbody>
              {rows.map((f, i) => {
                const sec = cms.sectionById(f.secId);
                return (
                  <tr key={i} onClick={() => router.push(`/cases/${f.c.id}`)}>
                    <td className="num">{f.c.etracking || "—"}</td>
                    <td style={{ fontWeight: 500 }}>{f.c.title}</td>
                    <td>{sec?.text}</td>
                    <td className="num">{f.count}</td>
                    <td className="num"><strong>{cms.fmtMoney(f.amount)}</strong></td>
                    <td className="num">{cms.fmtMoney(f.paidAmount || 0)}</td>
                    <td className="num" style={{ color: f.remaining > 0 ? "var(--warning-700)" : "var(--success-700)", fontWeight: 600 }}>{cms.fmtMoney(f.remaining)}</td>
                    <td className="muted small">{f.paidDate ? cms.fmtThaiDateShort(f.paidDate) : "—"}</td>
                    <td>{f.paid ? <span className="status-badge s05"><Icon name="check" size={12} /></span> : <button className="btn btn-accent btn-sm">บันทึกชำระ</button>}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan="9"><div className="table-empty"><div className="empty-icon"><Icon name="coin" size={24} /></div>ไม่มีรายการ</div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
