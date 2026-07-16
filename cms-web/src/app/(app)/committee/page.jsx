"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SLABadge, Tabs } from "@/components/ui";
import { ExportButtons } from "@/components/ExportButtons";
import { useApp } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";

export default function CommitteePage() {
  const { cms } = useApp();
  const router = useRouter();
  const { cases, loading } = useAllCases();
  const [tab, setTab] = useState("pending");

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;
  const pending = cases.filter((c) => c.status === "03");
  const history = cases.filter((c) => c.board && c.board.resolution);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>คณะกรรมการ</h1>
          <div className="page-meta">เคสที่รอเข้าประชุม · ประวัติมติคณะกรรมการ</div>
        </div>
        <div className="page-actions">
          <ExportButtons rows={() => (tab === "pending" ? pending : history)} filename={`committee-${tab}`} size="md"
            columns={tab === "pending" ? [
              { header: "E-tracking", value: (c) => c.etracking || "" },
              { header: "ชื่อเคส", value: (c) => c.title },
              { header: "พรบ.", value: (c) => c.laws.map((l) => cms.lawLabel(l)).join(", ") },
              { header: "คณะกรรมการ", value: (c) => (c.board ? c.board.committees.join(", ") : "คณะกรรมการพิจารณาคดี") },
              { header: "SLA", value: (c) => cms.caseSla(c).label },
            ] : [
              { header: "E-tracking", value: (c) => c.etracking || "" },
              { header: "ชื่อเคส", value: (c) => c.title },
              { header: "ครั้งที่ประชุม", value: (c) => `${c.board.meetingNo}/${c.board.year}` },
              { header: "วันที่ประชุม", value: (c) => cms.fmtThaiDate(c.board.meetingDate) },
              { header: "มติ", value: (c) => c.board.resolution },
            ]} />
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: "pending", label: "รอเข้าประชุม", icon: "calendar", count: pending.length },
            { value: "history", label: "ประวัติมติ", icon: "history", count: history.length },
          ]} />
        </div>
        <div className="table-wrap">
          <table className="data">
            {tab === "pending" ? (
              <>
                <thead><tr><th>E-tracking</th><th>ชื่อเคส</th><th>พรบ.</th><th>คณะกรรมการที่เหมาะสม</th><th>SLA</th><th></th></tr></thead>
                <tbody>
                  {pending.map((c) => (
                    <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                      <td className="num">{c.etracking || "—"}</td>
                      <td style={{ fontWeight: 500 }}>{c.title}</td>
                      <td><div className="tag-list">{c.laws.map((l) => <span key={l} className="chip">{cms.lawLabel(l)}</span>)}</div></td>
                      <td>{c.board ? c.board.committees.join(", ") : <span className="chip">คณะกรรมการพิจารณาคดี</span>}</td>
                      <td><SLABadge sla={cms.caseSla(c)} /></td>
                      <td><button className="btn btn-primary btn-sm">บันทึกมติ <Icon name="arrow-right" size={12} /></button></td>
                    </tr>
                  ))}
                  {pending.length === 0 && <tr><td colSpan="6"><div className="table-empty"><div className="empty-icon"><Icon name="calendar" size={24} /></div>ยังไม่มีเคสรอเข้าประชุม</div></td></tr>}
                </tbody>
              </>
            ) : (
              <>
                <thead><tr><th>E-tracking</th><th>ชื่อเคส</th><th>ครั้งที่ประชุม</th><th>วันที่ประชุม</th><th>มติ</th><th></th></tr></thead>
                <tbody>
                  {history.map((c) => (
                    <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                      <td className="num">{c.etracking || "—"}</td>
                      <td style={{ fontWeight: 500 }}>{c.title}</td>
                      <td className="num">{c.board.meetingNo}/{c.board.year}</td>
                      <td>{cms.fmtThaiDate(c.board.meetingDate)}</td>
                      <td><span className="chip accent">{c.board.resolution}</span></td>
                      <td><Icon name="chevron-right" size={16} style={{ color: "var(--text-muted)" }} /></td>
                    </tr>
                  ))}
                  {history.length === 0 && <tr><td colSpan="6"><div className="table-empty"><div className="empty-icon"><Icon name="history" size={24} /></div>ยังไม่มีประวัติมติ</div></td></tr>}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </main>
  );
}
