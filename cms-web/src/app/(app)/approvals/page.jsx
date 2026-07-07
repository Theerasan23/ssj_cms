"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusBadge, SLABadge, AvatarStack, Tabs, Modal, FormField } from "@/components/ui";
import { AssignModal } from "@/components/CaseModals";
import { useApp, useToasts } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";
import { api } from "@/lib/api";

const CLOSED = ["05", "06", "07", "08"];

export default function ApprovalsPage() {
  const { role, cms, actions } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const { cases, loading, reload } = useAllCases();
  const [tab, setTab] = useState("pending");
  const [assignFor, setAssignFor] = useState(null);
  const [reassignFor, setReassignFor] = useState(null);
  const [returnFor, setReturnFor] = useState(null);
  const [returnReason, setReturnReason] = useState("");

  // Only the group head (and admin) may approve & assign.
  if (!["head", "admin"].includes(role.id)) {
    return (
      <main className="page">
        <div className="card">
          <div className="table-empty">
            <div className="empty-icon"><Icon name="lock" size={26} /></div>
            <div style={{ fontWeight: 600 }}>เฉพาะหัวหน้ากลุ่มงาน / Admin เท่านั้น</div>
            <div className="small">หน้านี้สำหรับอนุมัติและมอบหมายเคสที่เจ้าหน้าที่ส่งเข้ามา</div>
            <button className="btn btn-primary" onClick={() => router.push("/dashboard")}>กลับหน้าหลัก</button>
          </div>
        </div>
      </main>
    );
  }

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  // every submitted (non-draft) case goes through the approval queue, whoever created it
  const submittedByOfficer = cases.filter((c) => !c.isDraft);
  const pending = submittedByOfficer.filter((c) => c.status === "01" && !c.returned);
  const pendingLive = pending.filter((c) => !cms.isCaseLocked(c));
  const pendingLocked = pending.filter((c) => cms.isCaseLocked(c));
  const returnedList = submittedByOfficer.filter((c) => c.status === "01" && c.returned);
  const approved = submittedByOfficer
    .filter((c) => c.assignedAt && c.status !== "01")
    .sort((a, b) => (b.assignedAt || "").localeCompare(a.assignedAt || ""));

  async function doReturn() {
    if (!returnReason.trim()) { toast.push({ kind: "warn", title: "กรุณาระบุเหตุผล" }); return; }
    const c = cases.find((x) => x.id === returnFor);
    try {
      await api.post(`/cases/${c.id}/return`, { reason: returnReason });
      setReturnFor(null); setReturnReason("");
      toast.push({ kind: "success", title: "ส่งกลับให้เจ้าหน้าที่แล้ว", msg: "เจ้าหน้าที่จะแก้ไขและส่งใหม่" });
      reload(); actions.reloadNotifications?.();
    } catch (e) {
      toast.push({ kind: "danger", title: "ทำรายการไม่สำเร็จ", msg: e.message });
    }
  }

  async function doReassign(ids, note) {
    const c = cases.find((x) => x.id === reassignFor);
    try {
      await api.post(`/cases/${c.id}/reassign`, { officerIds: ids, note });
      setReassignFor(null);
      toast.push({ kind: "success", title: "เปลี่ยนเจ้าหน้าที่สำเร็จ", msg: "ผู้รับผิดชอบชุดใหม่ได้รับ notification แล้ว" });
      reload();
      actions.reloadNotifications?.();
    } catch (e) {
      setReassignFor(null);
      toast.push({ kind: "danger", title: "ทำรายการไม่สำเร็จ", msg: e.message });
    }
  }

  async function doAssign(ids, note) {
    const c = cases.find((x) => x.id === assignFor);
    if (cms.isCaseLocked(c)) {
      toast.push({ kind: "danger", title: "เคสถูกล็อก", msg: "เกิน SLA — ไม่สามารถมอบหมายได้" });
      setAssignFor(null);
      return;
    }
    try {
      await api.post(`/cases/${c.id}/assign`, { officerIds: ids, note });
      setAssignFor(null);
      toast.push({ kind: "success", title: "อนุมัติและมอบหมายสำเร็จ", msg: "เจ้าหน้าที่ได้รับ notification แล้ว" });
      reload();
      actions.reloadNotifications?.();
    } catch (e) {
      setAssignFor(null);
      toast.push({ kind: "danger", title: "ทำรายการไม่สำเร็จ", msg: e.message });
    }
  }

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>รายการขออนุมัติ</h1>
          <div className="page-meta">เคสที่เจ้าหน้าที่ส่งเข้ามาเพื่อขออนุมัติและมอบหมาย · ต้องดำเนินการภายใน 3 วันจากวันลงรับ POST</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-label"><Icon name="hand" size={14} /> รออนุมัติ (ดำเนินการได้)</div>
          <div className="kpi-value">{pendingLive.length}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> ต้องมอบหมายภายใน 3 วัน</div>
          <div className="kpi-icon" style={{ background: "var(--accent-100)", color: "var(--accent-700)" }}><Icon name="approve" size={18} /></div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-label"><Icon name="lock" size={14} /> ล็อก — เกิน SLA</div>
          <div className="kpi-value">{pendingLocked.length}</div>
          <div className="kpi-trend down"><Icon name="ban" size={14} /> ห้ามมอบหมาย</div>
          <div className="kpi-icon"><Icon name="lock" size={18} /></div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label"><Icon name="check-circle" size={14} /> อนุมัติแล้ว</div>
          <div className="kpi-value">{approved.length}</div>
          <div className="kpi-trend up"><Icon name="users" size={14} /> มอบหมายเรียบร้อย</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: "pending", label: "รออนุมัติ", icon: "hand", count: pending.length },
            { value: "returned", label: "ตีกลับแล้ว", icon: "arrow-left", count: returnedList.length },
            { value: "approved", label: "อนุมัติแล้ว", icon: "check-circle", count: approved.length },
          ]} />
        </div>

        {tab === "pending" ? (
          <div className="card-body" style={{ display: "grid", gap: 12 }}>
            {pending.length === 0 ? (
              <div className="table-empty" style={{ padding: "40px 16px" }}>
                <div className="empty-icon" style={{ background: "var(--success-100)", color: "var(--success-700)" }}><Icon name="check-circle" size={24} /></div>
                <div style={{ fontWeight: 600 }}>ไม่มีรายการรออนุมัติ</div>
                <div className="small muted">เคสจะปรากฏที่นี่เมื่อเจ้าหน้าที่ส่งเข้ามา</div>
              </div>
            ) : pending.map((c) => {
              const locked = cms.isCaseLocked(c);
              const lockInfo = cms.lockReason(c);
              const sla = cms.caseSla(c);
              return (
                <div key={c.id} className={`approval-card ${locked ? "is-locked" : ""}`}>
                  <div>
                    <div className="row" style={{ gap: 8, alignItems: "center" }}>
                      <span className="ap-tracking">{c.etracking}</span>
                      <StatusBadge code={c.status} size="sm" />
                      {locked ? <span className="lock-pill"><Icon name="lock" size={10} /> ล็อก — เกิน SLA</span> : <SLABadge sla={sla} />}
                      {c.bountyAmount && <span className="chip accent" style={{ fontSize: 10.5 }}>💰 สินบนนำจับ</span>}
                    </div>
                    <div className="ap-title">{c.title}</div>
                    <div className="ap-meta">
                      <span><Icon name="package" size={12} /> <b>{c.respondent.business || c.respondent.licensee || "—"}</b> · {c.respondent.district}</span>
                      <span><Icon name="shield" size={12} /> {c.laws.map((l) => cms.lawLabel(l)).join(", ")}</span>
                      <span><Icon name="phone" size={12} /> {c.complainant.channel}</span>
                    </div>
                    <div className="ap-sub-by" style={{ marginTop: 8 }}>
                      <Icon name="user" size={11} /> เจ้าหน้าที่ส่งเมื่อ <b style={{ color: "var(--text)" }}>{cms.fmtThaiDate(c.createdAt)}</b>
                      <span style={{ color: "var(--text-muted)" }}>·</span> ลงรับ POST <b style={{ color: "var(--text)" }}>{cms.fmtThaiDate(c.postDate)}</b>
                    </div>
                    {locked && lockInfo && (
                      <div className="small" style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "var(--error-100)", color: "var(--error-700)", display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <Icon name="lock" size={12} /> {lockInfo.stage} — {lockInfo.detail}. ห้ามแก้ไข/มอบหมาย
                      </div>
                    )}
                  </div>
                  <div className="ap-actions">
                    <div className="row" style={{ gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/cases/${c.id}`)}><Icon name="eye" size={14} /> ดูรายละเอียด</button>
                      {!locked && (
                        <button className="btn btn-ghost btn-sm" style={{ color: "var(--warning-700)" }} onClick={() => { setReturnReason(""); setReturnFor(c.id); }}><Icon name="arrow-left" size={14} /> ส่งกลับ</button>
                      )}
                    </div>
                    {locked ? (
                      <button className="btn btn-outline btn-sm" disabled style={{ opacity: 0.6 }}><Icon name="lock" size={14} /> ล็อก</button>
                    ) : (
                      <button className="btn btn-accent" onClick={() => setAssignFor(c.id)}><Icon name="approve" size={14} /> อนุมัติ & มอบหมาย</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : tab === "returned" ? (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>E-tracking</th><th>ชื่อเคส</th><th>เหตุผลที่ตีกลับ</th><th>SLA</th><th></th></tr></thead>
              <tbody>
                {returnedList.map((c) => (
                  <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                    <td className="num">{c.etracking}</td>
                    <td style={{ fontWeight: 500, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                    <td className="small muted" style={{ maxWidth: 300 }}>{c.returnReason || "—"}</td>
                    <td><SLABadge sla={cms.caseSla(c)} /></td>
                    <td><Icon name="chevron-right" size={16} style={{ color: "var(--text-muted)" }} /></td>
                  </tr>
                ))}
                {returnedList.length === 0 && <tr><td colSpan="5"><div className="table-empty"><div className="empty-icon"><Icon name="arrow-left" size={24} /></div>ไม่มีเคสที่ตีกลับ</div></td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>E-tracking</th><th>ชื่อเคส</th><th>ผู้รับผิดชอบ</th><th>มอบหมายเมื่อ</th><th>สถานะ</th><th>จัดการ</th><th></th></tr></thead>
              <tbody>
                {approved.map((c) => {
                  const activeCase = ["02", "03", "04"].includes(c.status);
                  const locked = cms.isCaseLocked(c);
                  return (
                    <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                      <td className="num">{c.etracking}</td>
                      <td style={{ fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                      <td>{c.assignees.length === 0 ? <span className="muted small">—</span> : <AvatarStack names={c.assignees.map((id) => cms.officerName(id))} max={3} size="sm" />}</td>
                      <td className="muted small">{cms.fmtThaiDate(c.assignedAt)}</td>
                      <td><StatusBadge code={c.status} /></td>
                      <td>
                        {activeCase && !locked ? (
                          <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); setReassignFor(c.id); }}>
                            <Icon name="users" size={13} /> เปลี่ยนเจ้าหน้าที่
                          </button>
                        ) : activeCase && locked ? (
                          <span className="lock-pill"><Icon name="lock" size={10} /> ล็อก</span>
                        ) : (
                          <span className="muted small">—</span>
                        )}
                      </td>
                      <td><Icon name="chevron-right" size={16} style={{ color: "var(--text-muted)" }} /></td>
                    </tr>
                  );
                })}
                {approved.length === 0 && <tr><td colSpan="7"><div className="table-empty"><div className="empty-icon"><Icon name="check-circle" size={24} /></div>ยังไม่มีเคสที่อนุมัติแล้ว</div></td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {assignFor && <AssignModal c={cases.find((x) => x.id === assignFor)} onClose={() => setAssignFor(null)} onSave={doAssign} />}
      {reassignFor && <AssignModal mode="reassign" c={cases.find((x) => x.id === reassignFor)} onClose={() => setReassignFor(null)} onSave={doReassign} />}
      {returnFor && (
        <Modal open onClose={() => setReturnFor(null)} title="ส่งกลับให้เจ้าหน้าที่แก้ไข" sub={(cases.find((x) => x.id === returnFor) || {}).etracking}
          footer={<>
            <button className="btn btn-outline" onClick={() => setReturnFor(null)}>ปิด</button>
            <button className="btn btn-primary" onClick={doReturn}><Icon name="arrow-left" size={14} /> ยืนยันส่งกลับ</button>
          </>}>
          <div className="stack">
            <div style={{ padding: 12, background: "var(--warning-100)", borderRadius: 8, color: "var(--warning-700)", fontSize: 12.5 }}>
              เคสจะถูกส่งกลับให้เจ้าหน้าที่ผู้สร้างแก้ไข — ออกจากคิวอนุมัติจนกว่าจะแก้ไขและส่งใหม่
            </div>
            <FormField label="เหตุผล / สิ่งที่ต้องแก้ไข" req>
              <textarea className="textarea" rows={3} placeholder="เช่น ข้อมูลผู้ถูกร้องไม่ครบ กรุณาระบุที่อยู่" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            </FormField>
          </div>
        </Modal>
      )}
    </main>
  );
}
