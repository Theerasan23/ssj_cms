"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusBadge, SLABadge, Tabs } from "@/components/ui";
import { ExportButtons } from "@/components/ExportButtons";
import { useApp, useToasts } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";
import { api } from "@/lib/api";

// เอกสารทั้งหมด = ทุกเคสที่ "ผู้ใช้คนนี้บันทึกเข้าระบบเอง" แยกเป็นร่างที่ยังไม่ส่ง กับที่ส่งขออนุมัติแล้ว
// (ถ้าไม่กรองตามผู้บันทึก ฝั่ง "ส่งแล้ว" จะกลายเป็นเคสของทั้งกลุ่มงาน = ซ้ำกับหน้าเคสร้องเรียน)
export default function DocumentsPage() {
  const { role, cms } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const { cases, loading, reload } = useAllCases();
  const [tab, setTab] = useState("all");
  const [submitting, setSubmitting] = useState(null);

  const { mine, drafts, sent } = useMemo(() => {
    const m = cases
      .filter((c) => role.userId != null && c.createdByUserId === role.userId)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return { mine: m, drafts: m.filter((c) => c.isDraft), sent: m.filter((c) => !c.isDraft) };
  }, [cases, role]);

  const rows = tab === "draft" ? drafts : tab === "sent" ? sent : mine;

  async function submitDraft(c) {
    setSubmitting(c.id);
    try {
      await api.post(`/cases/${c.id}/submit`, {});
      toast.push({ kind: "success", title: "ส่งขออนุมัติแล้ว", msg: `${c.title || "เคส"} — หัวหน้ากลุ่มงานได้รับแจ้งเตือนแล้ว` });
      reload();
    } catch (e) {
      toast.push({ kind: "danger", title: "ส่งขออนุมัติไม่สำเร็จ", msg: e.message });
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  const returnedCount = sent.filter((c) => c.returned).length;

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>เอกสารทั้งหมด</h1>
          <div className="page-meta">
            เอกสารที่คุณบันทึกเข้าระบบ {mine.length} ฉบับ · ร่าง {drafts.length} · ส่งขออนุมัติแล้ว {sent.length}
            {returnedCount > 0 && <> · <span style={{ color: "var(--warning-700)", fontWeight: 600 }}>ถูกส่งกลับให้แก้ไข {returnedCount}</span></>}
          </div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            <ExportButtons rows={() => rows} filename="documents" size="md" columns={[
              { header: "E-tracking", value: (c) => c.etracking || "" },
              { header: "เลขรับ สสจ.", value: (c) => c.letterNo || "" },
              { header: "ชื่อเคส", value: (c) => c.title || "" },
              { header: "ผู้ถูกร้อง", value: (c) => c.respondent.business || c.respondent.licensee || "" },
              { header: "ประเภทเอกสาร", value: (c) => (c.isDraft ? "ร่าง" : c.returned ? "ถูกส่งกลับ" : "ส่งขออนุมัติแล้ว") },
              { header: "สถานะเคส", value: (c) => cms.STATUS[c.status]?.label || c.status },
              { header: "วันลงรับ POST", value: (c) => cms.fmtThaiDate(c.postDate) },
              { header: "บันทึกเมื่อ", value: (c) => cms.fmtThaiDate(c.createdAt) },
            ]} />
            <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: "all", label: "ทั้งหมด", icon: "stack", count: mine.length },
            { value: "draft", label: "ร่าง (ยังไม่ส่ง)", icon: "edit", count: drafts.length },
            { value: "sent", label: "ส่งขออนุมัติแล้ว", icon: "send", count: sent.length },
          ]} />
        </div>
        {rows.length === 0 ? (
          <div className="table-empty">
            <div className="empty-icon"><Icon name="stack" size={26} /></div>
            <div style={{ fontWeight: 600 }}>
              {tab === "draft" ? "ไม่มีร่างที่ค้างอยู่" : tab === "sent" ? "ยังไม่มีเอกสารที่ส่งขออนุมัติ" : "ยังไม่ได้บันทึกเอกสารเข้าระบบ"}
            </div>
            <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>E-tracking</th><th>เลขรับ สสจ.</th><th>ชื่อเคส</th><th>ผู้ถูกร้อง · อำเภอ</th><th>ประเภท</th><th>สถานะเคส</th><th>SLA</th><th>บันทึกเมื่อ</th><th></th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                    <td className="num">{c.etracking || <span className="muted">—</span>}</td>
                    <td className="num">{c.letterNo || <span className="muted">—</span>}</td>
                    <td style={{ fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title || <span className="muted">(ยังไม่ตั้งชื่อเรื่อง)</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.respondent.business || c.respondent.licensee || "—"}</div>
                      <div className="small muted">{c.respondent.district}</div>
                    </td>
                    <td>
                      {c.isDraft
                        ? <span className="lock-pill" style={{ background: "var(--text-soft)" }}><Icon name="edit" size={10} /> ร่าง</span>
                        : c.returned
                          ? <span className="lock-pill" style={{ background: "var(--warning-700)" }}><Icon name="arrow-left" size={10} /> ถูกส่งกลับ</span>
                          : <span className="chip">ส่งแล้ว</span>}
                    </td>
                    <td>{c.isDraft ? <span className="muted small">—</span> : <StatusBadge code={c.status} />}</td>
                    <td><SLABadge sla={cms.caseSla(c)} /></td>
                    <td className="muted small">{cms.fmtThaiDateShort(c.createdAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        {(c.isDraft || c.returned) && (
                          <>
                            <button className="btn btn-outline btn-sm" onClick={() => router.push(`/cases/${c.id}/edit`)}>
                              <Icon name="edit" size={14} /> แก้ไข
                            </button>
                            <button className="btn btn-primary btn-sm" disabled={submitting === c.id} onClick={() => submitDraft(c)}>
                              <Icon name="send" size={14} /> {submitting === c.id ? "กำลังส่ง…" : c.returned ? "ส่งอีกครั้ง" : "ส่งขออนุมัติ"}
                            </button>
                          </>
                        )}
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => router.push(`/cases/${c.id}`)}>
                          <Icon name="chevron-right" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
