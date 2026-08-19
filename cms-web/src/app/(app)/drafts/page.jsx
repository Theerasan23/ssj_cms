"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { SLABadge } from "@/components/ui";
import { useApp, useToasts } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";
import { api } from "@/lib/api";

// เอกสารฉบับร่าง = เคสที่บันทึกไว้แล้วแต่ยังไม่ส่งขออนุมัติ (cases.is_draft)
// API ส่งร่างมาให้เฉพาะผู้สร้างเท่านั้น (แอดมินเห็นทั้งหมด) หน้านี้จึงกรองแค่ isDraft
export default function DraftsPage() {
  const { cms } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const { cases, loading, reload } = useAllCases();
  const [submitting, setSubmitting] = useState(null);

  const drafts = useMemo(
    () => cases.filter((c) => c.isDraft).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [cases],
  );

  // ส่งขออนุมัติจากหน้านี้ได้เลย — API ตรวจความครบถ้วนให้ ถ้าไม่ครบจะตอบ 400 พร้อมบอกช่องที่ขาด
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

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>เอกสารฉบับร่าง</h1>
          <div className="page-meta">
            {drafts.length} ฉบับ · หัวหน้ากลุ่มงานยังไม่เห็นเคสเหล่านี้จนกว่าจะกดส่งขออนุมัติ
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
        </div>
      </div>

      {/* ร่างยังนับ SLA จากวันลงรับ POST อยู่ ค้างไว้นานเกินกำหนดแล้วเคสจะล็อกทันทีที่ส่ง */}
      {drafts.length > 0 && (
        <div className="lock-banner" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--primary-50) 85%, var(--surface)) 0%, color-mix(in oklab, var(--primary-50) 30%, var(--surface)) 100%)", borderColor: "color-mix(in oklab, var(--primary-700) 22%, transparent)", color: "var(--primary-700)" }}>
          <div className="lock-ic" style={{ background: "var(--primary-700)" }}><Icon name="clock" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lock-title">ร่างก็นับ SLA เหมือนกัน</div>
            <div className="lock-body">กำหนดเวลาเริ่มนับจากวันลงรับ POST ไม่ใช่วันที่ส่งขออนุมัติ — ร่างที่ค้างไว้นานจะเกินกำหนดตั้งแต่ยังไม่ได้ส่ง</div>
          </div>
        </div>
      )}

      <div className="card">
        {drafts.length === 0 ? (
          <div className="table-empty">
            <div className="empty-icon"><Icon name="file" size={26} /></div>
            <div style={{ fontWeight: 600 }}>ยังไม่มีเอกสารฉบับร่าง</div>
            <div className="small">ร่างจะมาอยู่ที่นี่เมื่อกด "บันทึกร่าง" ตอนสร้างเคสใหม่</div>
            <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>E-tracking</th><th>เลขรับ สสจ.</th><th>ชื่อเคส</th><th>ผู้ถูกร้อง · อำเภอ</th><th>ลงรับ POST</th><th>SLA</th><th>บันทึกเมื่อ</th><th></th></tr></thead>
              <tbody>
                {drafts.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                    <td className="num">
                      <div className="row" style={{ gap: 6, alignItems: "center" }}>
                        <span className="lock-pill" style={{ background: "var(--text-soft)" }}><Icon name="edit" size={10} /> ร่าง</span>
                        {c.etracking || <span className="muted">—</span>}
                      </div>
                    </td>
                    <td className="num">{c.letterNo || <span className="muted">—</span>}</td>
                    <td style={{ fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title || <span className="muted">(ยังไม่ตั้งชื่อเรื่อง)</span>}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.respondent.business || c.respondent.licensee || "—"}</div>
                      <div className="small muted">{c.respondent.district}</div>
                    </td>
                    <td className="muted small">{cms.fmtThaiDateShort(c.postDate)}</td>
                    <td><SLABadge sla={cms.caseSla(c)} /></td>
                    <td className="muted small">{cms.fmtThaiDateShort(c.createdAt)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                        <button className="btn btn-outline btn-sm" onClick={() => router.push(`/cases/${c.id}/edit`)}>
                          <Icon name="edit" size={14} /> แก้ไข
                        </button>
                        <button className="btn btn-primary btn-sm" disabled={submitting === c.id} onClick={() => submitDraft(c)}>
                          <Icon name="send" size={14} /> {submitting === c.id ? "กำลังส่ง…" : "ส่งขออนุมัติ"}
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
