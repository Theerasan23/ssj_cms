"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusBadge, SLABadge, AvatarStack, Tabs, DataCard, FormField, SLATimelineHorizontal, Modal } from "@/components/ui";
import { AssignModal, InvestigationModal, BoardModal, FineModal, fmtTimestamp } from "@/components/CaseModals";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";

const CLOSED = ["05", "06", "07", "08"];

export default function CaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { role, cms, actions } = useApp();
  const toast = useToasts();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [activeTab, setActiveTab] = useState("data");
  const [cancelReason, setCancelReason] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/cases/${id}`)
      .then((data) => { if (alive) setC(data); })
      .catch(() => { if (alive) setC(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;
  if (!c) {
    return (
      <main className="page">
        <div className="card">
          <div className="table-empty">
            <div className="empty-icon"><Icon name="alert" size={26} /></div>
            <div style={{ fontWeight: 600 }}>ไม่พบเคสที่ร้องขอ</div>
            <button className="btn btn-primary" onClick={() => router.push("/cases")}>กลับสู่รายการเคส</button>
          </div>
        </div>
      </main>
    );
  }

  const canAssign = ["head", "admin"].includes(role.id);
  const canEdit = ["officer", "head", "admin"].includes(role.id);
  const closedCase = CLOSED.includes(c.status);
  const sla = cms.caseSla(c);
  const locked = cms.isCaseLocked(c);
  const lock = cms.lockReason(c);
  const canEditCase = c.status === "01" && !locked && c.createdByUserId === role.userId;
  const canUnlock = role.id === "admin";

  function guardLocked() {
    if (locked) {
      toast.push({ kind: "danger", title: "เคสถูกล็อก", msg: "เกินกำหนด SLA — ไม่สามารถแก้ไขหรืออัปเดตสถานะได้" });
      setModal(null);
      return true;
    }
    return false;
  }

  async function run(fn, okTitle, okMsg) {
    try {
      const updated = await fn();
      setC(updated);
      setModal(null);
      actions.reloadNotifications?.();
      if (okTitle) toast.push({ kind: "success", title: okTitle, msg: okMsg });
    } catch (e) {
      toast.push({ kind: "danger", title: "ทำรายการไม่สำเร็จ", msg: e.message });
    }
  }

  const saveAssignment = (officerIds, note) => { if (guardLocked()) return; run(() => api.post(`/cases/${c.id}/assign`, { officerIds, note }), "มอบหมายสำเร็จ", "เจ้าหน้าที่ได้รับ notification แล้ว"); };
  async function addInvestEvent(payload) {
    if (guardLocked()) return;
    try {
      const updated = await api.post(`/cases/${c.id}/investigation/event`, payload);
      setC(updated);
      actions.reloadNotifications?.();
      toast.push({ kind: "success", title: "บันทึกรายการตรวจสอบแล้ว", msg: "เพิ่มรายการเพิ่มเติมหรือเลือกแนวทางถัดไปได้" });
    } catch (e) {
      toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message });
    }
  }
  const selectInvestPath = (path) => { if (guardLocked()) return; run(() => api.post(`/cases/${c.id}/decision`, { path }), "อัปเดตสถานะเคสสำเร็จ"); };
  // Appends one meeting record; the modal stays open so more meetings can be added.
  async function saveBoardMeeting(payload) {
    if (guardLocked()) return false;
    try {
      const updated = await api.post(`/cases/${c.id}/board`, payload);
      setC(updated);
      actions.reloadNotifications?.();
      toast.push(payload.resolution
        ? { kind: "success", title: "บันทึกมติแล้ว", msg: "สถานะเคสยังไม่เปลี่ยน — เพิ่มการประชุมหรือกดดำเนินการตามมติได้" }
        : { kind: "success", title: "บันทึกการเสนอเข้าที่ประชุมแล้ว", msg: "อยู่ระหว่างรอเข้าคณะกรรมการ — SLA ยังนับเวลาต่อ" });
      return true;
    } catch (e) {
      toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message });
      return false;
    }
  }
  const applyBoard = () => { if (guardLocked()) return; run(() => api.post(`/cases/${c.id}/board/apply`, {}), "ดำเนินการตามมติแล้ว"); };
  // Records a (possibly partial) payment; the modal stays open showing updated balances.
  async function savePayment(payload) {
    if (guardLocked()) return false;
    try {
      const updated = await api.post(`/cases/${c.id}/payment`, payload);
      setC(updated);
      actions.reloadNotifications?.();
      toast.push({ kind: "success", title: "บันทึกการชำระเงินสำเร็จ" });
      return true;
    } catch (e) {
      toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message });
      return false;
    }
  }
  const doCloseFine = () => { if (guardLocked()) return; run(() => api.post(`/cases/${c.id}/close`, {}), "ปิดเคสแล้ว", "ยุติคดี — ชำระค่าปรับครบ"); };

  async function uploadFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    setUploading(true);
    try {
      const updated = await api.upload(`/cases/${c.id}/attachments`, fd);
      setC(updated);
      actions.reloadNotifications?.();
      toast.push({ kind: "success", title: "อัปโหลดเอกสารแล้ว", msg: `${files.length} ไฟล์` });
    } catch (e) {
      toast.push({ kind: "danger", title: "อัปโหลดไม่สำเร็จ", msg: e.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }
  async function openAttachment(a, download) {
    try {
      const b = await api.blob(`/cases/${c.id}/attachments/${a.id}${download ? "?download=1" : ""}`);
      const url = URL.createObjectURL(b);
      if (download) {
        const link = document.createElement("a");
        link.href = url; link.download = a.name; document.body.appendChild(link); link.click(); link.remove();
      } else {
        window.open(url, "_blank", "noopener");
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      toast.push({ kind: "danger", title: "เปิดไฟล์ไม่สำเร็จ", msg: e.message });
    }
  }
  async function removeAttachment(a) {
    try {
      const updated = await api.del(`/cases/${c.id}/attachments/${a.id}`);
      setC(updated);
      toast.push({ kind: "success", title: "ลบเอกสารแล้ว" });
    } catch (e) {
      toast.push({ kind: "danger", title: "ลบไม่สำเร็จ", msg: e.message });
    }
  }
  const doUnlock = () => run(() => api.post(`/cases/${c.id}/unlock`, {}), "ปลดล็อกเคสแล้ว", "ดำเนินการต่อได้ตามปกติ");
  const doCancel = () => run(() => api.post(`/cases/${c.id}/cancel`, { reason: cancelReason }), "ยกเลิกเคสแล้ว");
  const doReturn = () => { if (!returnReason.trim()) { toast.push({ kind: "warn", title: "กรุณาระบุเหตุผล" }); return; } run(() => api.post(`/cases/${c.id}/return`, { reason: returnReason }), "ส่งกลับให้เจ้าหน้าที่แล้ว", "เจ้าหน้าที่จะแก้ไขและส่งใหม่"); };
  // draft or returned case → submit for head approval, then jump to "เคสของฉัน"
  async function doSubmitDraft() {
    if (guardLocked()) return;
    try {
      await api.post(`/cases/${c.id}/submit`, {});
      actions.reloadNotifications?.();
      toast.push({
        kind: "success",
        title: c.returned ? "ส่งขออนุมัติอีกครั้งแล้ว" : "ส่งขออนุมัติแล้ว",
        msg: "หัวหน้ากลุ่มงานได้รับแจ้งเตือนแล้ว (สถานะ 'รอมอบหมาย')",
      });
      router.push("/cases?scope=mine");
    } catch (e) {
      toast.push({ kind: "danger", title: "ส่งขออนุมัติไม่สำเร็จ", msg: e.message });
    }
  }

  const allFinesPaid = c.fines?.length > 0 && c.fines.every((f) => f.paid);
  const latestMeeting = c.boardMeetings?.length ? c.boardMeetings[c.boardMeetings.length - 1] : null;
  // spec ข้อ ii: proposed to a board but not yet resolved → "อยู่ระหว่างรอเข้าคณะกรรมการ" (SLA keeps counting)
  const waitingBoard = c.status === "03" && latestMeeting && !latestMeeting.resolution;
  const primaryAction = (() => {
    if (closedCase || locked) return null;
    if (c.status === "01" && c.isDraft) return { label: "ส่งขออนุมัติหัวหน้า", icon: "send", onClick: doSubmitDraft, disabled: c.createdByUserId !== role.userId };
    if (c.status === "01" && c.returned && c.createdByUserId === role.userId) return { label: "ส่งขออนุมัติอีกครั้ง", icon: "send", onClick: doSubmitDraft };
    if (c.status === "01") return { label: "มอบหมายเจ้าหน้าที่", icon: "users", onClick: () => setModal("assign"), disabled: !canAssign };
    if (c.status === "02") return { label: "บันทึกการตรวจสอบ", icon: "loupe", onClick: () => setModal("invest") };
    if (c.status === "03") return { label: "บันทึกมติคณะกรรมการ", icon: "users", onClick: () => setModal("board") };
    if (c.status === "04") {
      if (allFinesPaid) return { label: "ปิดเคส (ชำระค่าปรับครบ)", icon: "check-circle", onClick: doCloseFine };
      return { label: "บันทึกการชำระ", icon: "money", onClick: () => setModal("fine") };
    }
    return null;
  })();

  const StatusPanel = (
    <div className="card">
      <div className="card-body">
        <div className="row between" style={{ alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div className="small muted">E-tracking</div>
            <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{c.etracking}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <StatusBadge code={c.status} size="lg" />
            {!closedCase && <SLABadge sla={sla} />}
          </div>
        </div>
        <h2 style={{ margin: "8px 0 14px", fontSize: 19, lineHeight: 1.35, letterSpacing: "-0.01em" }}>{c.title}</h2>
        <div className="kv">
          <div className="k">ผู้ถูกร้อง</div><div className="v">{c.respondent.business || c.respondent.licensee || "—"}</div>
          <div className="k">อำเภอ</div><div className="v">{c.respondent.district || "—"}</div>
          <div className="k">พรบ.</div><div className="v"><div className="tag-list">{c.laws.map((id2) => <span key={id2} className="chip primary">{cms.lawLabel(id2)}</span>)}</div></div>
          <div className="k">ผู้รับผิดชอบ</div>
          <div className="v">{c.assignees.length === 0 ? <span className="muted">— ยังไม่มอบหมาย</span> : (
            <div className="row" style={{ gap: 6 }}>
              <AvatarStack names={c.assignees.map((id2) => cms.officerName(id2))} max={5} size="sm" />
              <span className="small">{c.assignees.map((id2) => cms.officerName(id2).split(" ")[1]).join(", ")}</span>
            </div>
          )}</div>
          <div className="k">วันลงรับ POST</div><div className="v">{cms.fmtThaiDate(c.postDate)}</div>
          <div className="k">วันที่หนังสือ</div><div className="v">{cms.fmtThaiDate(c.letterDate)}</div>
        </div>

        {waitingBoard && (
          <div style={{ background: "var(--warning-100)", color: "var(--warning-700)", padding: "10px 14px", borderRadius: 8, marginTop: 14, fontSize: 12.5, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Icon name="clock" size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700 }}>อยู่ระหว่างรอเข้าคณะกรรมการ: {latestMeeting.committees.join(", ")}</div>
              <div className="small">{latestMeeting.meetingDate ? `นัดประชุม ${cms.fmtThaiDate(latestMeeting.meetingDate)}` : "ยังไม่กำหนดวันประชุม"} · SLA ยังนับเวลาต่อ</div>
            </div>
          </div>
        )}
        {primaryAction && (
          <button className="btn btn-accent btn-lg btn-block" style={{ marginTop: 16 }} onClick={primaryAction.onClick} disabled={primaryAction.disabled}>
            <Icon name={primaryAction.icon} size={16} /> {primaryAction.label}
            {!primaryAction.disabled && <Icon name="arrow-right" size={14} />}
          </button>
        )}
        {primaryAction && primaryAction.disabled && <div className="small muted" style={{ textAlign: "center", marginTop: 8 }}>* เฉพาะหัวหน้ากลุ่มงาน/Admin</div>}
        {locked && !closedCase && (
          <div style={{ background: "var(--error-100)", color: "var(--error-700)", padding: "12px 14px", borderRadius: 8, marginTop: 16, display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, border: "1px dashed var(--error-700)" }}>
            <Icon name="lock" size={16} />
            <div style={{ flex: 1 }}>
              <div>เคสล็อก — ไม่สามารถดำเนินการต่อได้</div>
              <div className="small" style={{ fontWeight: 400 }}>เกิน SLA แล้ว · กรุณาติดต่อผู้ดูแลระบบเพื่อขอขยายกำหนด</div>
            </div>
          </div>
        )}
        {closedCase && (
          <div style={{ background: "var(--success-100)", color: "var(--success-700)", padding: "12px 14px", borderRadius: 8, marginTop: 16, display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
            <Icon name="check-circle" size={16} /> เคสนี้ถูกปิดแล้ว · {cms.STATUS[c.status].label}
          </div>
        )}
      </div>
      <div className="card-divider" />
      <div style={{ padding: "16px 22px" }}>
        <div className="small muted" style={{ marginBottom: 10, fontWeight: 600, color: "var(--text)" }}>SLA Timeline</div>
        <SLATimelineHorizontal c={c} />
      </div>
    </div>
  );

  const DataPanel = (
    <div className="stack">
      <DataCard title="เลขอ้างอิง" icon="paperclip">
        <div className="kv">
          <div className="k">E-tracking</div><div className="v mono">{c.etracking}</div>
          <div className="k">เลขรับหนังสือ</div><div className="v mono">{c.letterNo}</div>
          <div className="k">วันที่ของหนังสือ</div><div className="v">{cms.fmtThaiDate(c.letterDate)}</div>
          <div className="k">เลขรับ POST</div><div className="v mono">{c.postNo}</div>
          <div className="k">วันที่ลงรับ POST</div><div className="v">{cms.fmtThaiDate(c.postDate)}</div>
        </div>
      </DataCard>

      <DataCard title="ข้อมูลผู้ร้องเรียน" icon="user">
        {c.complainant.anonymous ? (
          <div className="muted small"><Icon name="shield" size={14} /> ผู้ร้องเรียนไม่ระบุตัวตน (PDPA)</div>
        ) : (
          <div className="kv">
            <div className="k">ชื่อ-นามสกุล</div><div className="v">{c.complainant.name || "—"}</div>
            <div className="k">เบอร์โทร</div><div className="v">{c.complainant.phone || "—"}</div>
            <div className="k">Email</div><div className="v">{c.complainant.email || "—"}</div>
          </div>
        )}
        <div className="kv" style={{ marginTop: 8 }}>
          <div className="k">ช่องทาง</div><div className="v"><span className="chip">{c.complainant.channel}</span></div>
        </div>
      </DataCard>

      <DataCard title="ข้อมูลผู้ถูกร้อง" icon="package">
        <div className="kv">
          <div className="k">ผู้รับอนุญาต</div><div className="v">{c.respondent.licensee || "—"}</div>
          <div className="k">สถานประกอบการ</div><div className="v">{c.respondent.business || "—"}</div>
          <div className="k">ที่อยู่</div><div className="v">{c.respondent.address || "—"}</div>
          <div className="k">ตำบล / อำเภอ</div><div className="v">{[c.respondent.subdistrict, c.respondent.district].filter(Boolean).join(" / ") || "—"}</div>
          <div className="k">เลขที่ใบอนุญาต</div><div className="v mono">{c.respondent.licenseNo || "—"}</div>
        </div>
      </DataCard>

      <DataCard title="รายละเอียดเรื่องร้องเรียน" icon="info">
        <div className="kv">
          <div className="k">พรบ.</div><div className="v"><div className="tag-list">{c.laws.map((id2) => <span key={id2} className="chip primary">{cms.lawLabel(id2)}</span>)}</div></div>
          <div className="k">ที่มา</div><div className="v"><span className="chip">{c.source}</span></div>
          <div className="k">ผลิตภัณฑ์/บริการ</div><div className="v">{c.product || "—"}</div>
          <div className="k">เลข อย./ทะเบียน</div><div className="v mono">{c.productLicense || "—"}</div>
          <div className="k">ประเภทปัญหา</div><div className="v"><div className="tag-list">{c.problems.map((p) => <span key={p} className="chip accent">{p}</span>)}</div></div>
          {c.bountyAmount && (<><div className="k">สินบนนำจับ</div><div className="v">{c.bountyAmount}</div></>)}
          {c.bountyRequested && (<>
            <div className="k">ผู้ประสงค์รับสินบน</div><div className="v">{[c.bountyFirstName, c.bountyLastName].filter(Boolean).join(" ") || "—"}</div>
            <div className="k">เลขสินบนนำจับ</div><div className="v mono">{c.bountyNo || "—"}</div>
          </>)}
        </div>
        {c.description && <p style={{ marginTop: 12, color: "var(--text)", lineHeight: 1.7, fontSize: 13.5 }}>{c.description}</p>}
      </DataCard>

      {c.investigations && c.investigations.length > 0 && (
        <DataCard title="การตรวจสอบข้อเท็จจริง" icon="loupe" actions={<span className="chip">{c.investigations.length} รายการ</span>}>
          <div className="stack-sm">
            {c.investigations.map((ev) => (
              <div key={ev.id} className="row" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: ev.kind === "site" ? "var(--primary-100)" : "var(--accent-100)", color: ev.kind === "site" ? "var(--primary-700)" : "var(--accent-700)" }}>
                  <Icon name={ev.kind === "site" ? "map-pin" : "users"} size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.kind === "site" ? "ลงพื้นที่ตรวจสอบ" : "เชิญพบเพื่อชี้แจง"} · {cms.fmtThaiDate(ev.date)}</div>
                  {ev.place && <div className="small muted">{ev.place}</div>}
                  {ev.result && <div className="small" style={{ marginTop: 2, lineHeight: 1.6 }}>{ev.result}</div>}
                </div>
              </div>
            ))}
          </div>
        </DataCard>
      )}

      {(c.boardMeetings?.length > 0 || (c.board && c.board.resolution)) && (
        <DataCard title="มติคณะกรรมการ" icon="users" actions={c.boardMeetings?.length > 0 && <span className="chip">{c.boardMeetings.length} ครั้ง</span>}>
          {c.boardMeetings?.length > 0 ? (
            <div className="stack-sm">
              {c.boardMeetings.slice().reverse().map((m, i) => (
                <div key={m.id} className="row" style={{ gap: 10, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent-100)", color: "var(--accent-700)" }}>
                    <Icon name="users" size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      ครั้งที่ {m.meetingNo ?? "—"}/{m.year ?? "—"} · {cms.fmtThaiDate(m.meetingDate)}
                      {i === 0 && <span className="chip accent" style={{ fontSize: 10, marginLeft: 6 }}>ล่าสุด</span>}
                    </div>
                    <div className="small muted">{m.committees.join(", ")}</div>
                    <div className="small" style={{ marginTop: 3 }}>
                      {m.resolution
                        ? <>มติ: <span className="chip accent" style={{ fontSize: 11, fontWeight: 600 }}>{m.resolution}</span></>
                        : <span className="chip" style={{ fontSize: 11, fontWeight: 600, background: "var(--warning-100)", color: "var(--warning-700)" }}>รอเข้าประชุม — ยังไม่มีมติ</span>}
                    </div>
                    {m.sections?.length > 0 && (
                      <div className="small muted" style={{ marginTop: 3 }}>
                        {m.sections.map((s, j) => <div key={j}>{cms.sectionById(s.secId)?.text} · ครั้งที่ {s.count} · {cms.fmtMoney(s.fine)}</div>)}
                      </div>
                    )}
                    {m.notes && <div className="small" style={{ marginTop: 3 }}>{m.notes}</div>}
                    <div className="small muted" style={{ marginTop: 4, fontSize: 11 }}>
                      <Icon name="clock" size={10} /> บันทึกเมื่อ {fmtTimestamp(cms, m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="kv">
              <div className="k">คณะกรรมการ</div><div className="v">{c.board.committees.join(", ")}</div>
              <div className="k">ครั้งที่ประชุม</div><div className="v">{c.board.meetingNo}/{c.board.year}</div>
              <div className="k">วันที่ประชุม</div><div className="v">{cms.fmtThaiDate(c.board.meetingDate)}</div>
              <div className="k">มติ</div><div className="v"><span className="chip accent" style={{ fontWeight: 600 }}>{c.board.resolution}</span></div>
              {c.board.notes && (<><div className="k">หมายเหตุ</div><div className="v">{c.board.notes}</div></>)}
            </div>
          )}
        </DataCard>
      )}

      {c.fines && c.fines.length > 0 && (
        <DataCard title="ค่าปรับ" icon="money">
          <table className="data" style={{ marginTop: -8 }}>
            <thead><tr><th>มาตรา</th><th>ครั้งที่</th><th>ค่าปรับ</th><th>ชำระแล้ว</th><th>คงเหลือ</th><th>สถานะ</th><th>วันชำระล่าสุด</th></tr></thead>
            <tbody>
              {c.fines.map((f, i) => {
                const sec = cms.sectionById(f.secId);
                const rem = f.amount - (f.paidAmount || 0);
                return (
                  <tr key={i} style={{ cursor: "default" }}>
                    <td style={{ maxWidth: 220 }}>{sec?.text}</td>
                    <td className="num">{f.count}</td>
                    <td className="num"><strong>{cms.fmtMoney(f.amount)}</strong></td>
                    <td className="num">{cms.fmtMoney(f.paidAmount || 0)}</td>
                    <td className="num" style={{ color: rem > 0 ? "var(--warning-700)" : "var(--success-700)", fontWeight: 600 }}>{cms.fmtMoney(rem)}</td>
                    <td>{f.paid
                      ? <span className="status-badge s05"><Icon name="check" size={12} stroke={2} />ชำระครบ</span>
                      : (f.paidAmount || 0) > 0
                        ? <span className="status-badge s03"><Icon name="clock" size={12} stroke={2} />ชำระบางส่วน</span>
                        : <span className="status-badge s04"><Icon name="clock" size={12} stroke={2} />ค้างชำระ</span>}</td>
                    <td className="muted small">{cms.fmtThaiDateShort(f.paidDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {allFinesPaid && !closedCase && c.status === "04" && (
            <button className="btn btn-success btn-block" style={{ marginTop: 12 }} onClick={doCloseFine} disabled={locked}>
              <Icon name="check-circle" size={16} /> ปิดเคส (ยุติคดี — ชำระค่าปรับครบ)
            </button>
          )}
        </DataCard>
      )}
    </div>
  );

  const TimelinePanel = (
    <DataCard title="Timeline / ประวัติการดำเนินการ" icon="history">
      <div className="v-timeline">
        {c.timeline.slice().reverse().map((t, i) => (
          <div key={i} className={`v-event ${t.kind === "close" ? "done" : ""}`}>
            <div className="v-when">{cms.fmtThaiDate(t.date)} เวลา {t.time} น.</div>
            <div className="v-title">{t.title}</div>
            <div className="v-body">โดย {t.user}</div>
            {t.status && <div className="v-meta"><SLABadge sla={{ kind: t.status, label: t.status === "in-time" ? "ในเวลา" : t.status }} /></div>}
          </div>
        ))}
      </div>
    </DataCard>
  );

  const canManageFiles = canEdit && !locked;
  const AttachmentsPanel = (
    <DataCard title="เอกสารแนบ" icon="paperclip" actions={canManageFiles && (
      <>
        <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => uploadFiles(e.target.files)} />
        <button className="btn btn-outline btn-sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
          <Icon name="upload" size={14} /> {uploading ? "กำลังอัปโหลด…" : "อัปโหลดเพิ่ม"}
        </button>
      </>
    )}>
      {c.attachments && c.attachments.length > 0 ? (
        <div className="stack-sm">
          {c.attachments.map((a) => (
            <div key={a.id} className="file-row">
              <div className="file-thumb">{a.type === "image" ? <Icon name="image" size={18} /> : a.type === "pdf" ? "PDF" : <Icon name="file" size={18} />}</div>
              <div className="file-name">{a.name}</div>
              <div className="file-meta">{a.size}</div>
              {a.hasFile ? (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => openAttachment(a, false)}><Icon name="eye" size={14} /> ดู</button>
                  <button className="btn btn-ghost btn-sm" title="ดาวน์โหลด" onClick={() => openAttachment(a, true)}><Icon name="download" size={14} /></button>
                </>
              ) : (
                <span className="small muted" title="เอกสารเก่า — ไม่มีไฟล์แนบจริง">ไม่มีไฟล์</span>
              )}
              {canManageFiles && (
                <button className="icon-btn" style={{ width: 30, height: 30 }} title="ลบเอกสาร" onClick={() => removeAttachment(a)}><Icon name="trash" size={14} /></button>
              )}
            </div>
          ))}
        </div>
      ) : <div className="muted small">ยังไม่มีเอกสารแนบ</div>}
    </DataCard>
  );

  return (
    <main className="page fade-in">
      <div className="print-only" style={{ textAlign: "center", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid var(--primary-700)" }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>สำนักงานสาธารณสุขจังหวัดนนทบุรี</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>รายงานเรื่องร้องเรียน · กลุ่มงานคุ้มครองผู้บริโภค (คบส.)</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          เลขที่ {c.etracking} · สถานะ {cms.STATUS[c.status]?.label} · พิมพ์เมื่อ {cms.fmtThaiDate(cms.TODAY)}
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12, gap: 4 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.push("/cases")}><Icon name="arrow-left" size={14} /> ทุกเคส</button>
        <span className="small muted">/</span>
        <span className="small mono" style={{ color: "var(--primary-700)" }}>{c.etracking}</span>
      </div>
      <div className="page-header">
        <div>
          <h1 style={{ maxWidth: 720 }}>{c.title}</h1>
          <div className="page-meta">สร้างโดย {c.createdByName} เมื่อ {cms.fmtThaiDate(c.createdAt)} · มอบหมาย {c.assignees.length} คน</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline btn-sm" onClick={() => window.print()}><Icon name="printer" size={14} /> พิมพ์ PDF</button>
          <button className="btn btn-outline btn-sm" disabled={!canEditCase}
            title={locked ? "เคสล็อก — เกิน SLA" : (c.status !== "01" ? "แก้ไขได้เฉพาะตอนรอมอบหมาย" : "")}
            onClick={() => canEditCase && router.push(`/cases/${c.id}/edit`)}>
            <Icon name={locked ? "lock" : "edit"} size={14} /> {locked ? "ล็อก" : "แก้ไข"}
          </button>
          {canAssign && c.status === "01" && !c.returned && !c.isDraft && (
            <button className="btn btn-outline btn-sm" style={{ color: "var(--warning-700)", borderColor: "color-mix(in oklab, var(--warning-600) 40%, var(--border))" }} onClick={() => setModal("return")}>
              <Icon name="arrow-left" size={14} /> ส่งกลับให้แก้ไข
            </button>
          )}
          {canAssign && !closedCase && (
            <button className="btn btn-outline btn-sm" style={{ color: "var(--error-700)", borderColor: "color-mix(in oklab, var(--error-600) 40%, var(--border))" }} onClick={() => setModal("cancel")}>
              <Icon name="ban" size={14} /> ยกเลิกเคส
            </button>
          )}
        </div>
      </div>

      {locked && (
        <div className="lock-banner">
          <div className="lock-ic"><Icon name="lock" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lock-title">เคสนี้ถูกล็อก — เกินกำหนด SLA</div>
            <div className="lock-body">ตามนโยบาย: timeline เกินกำหนดแล้ว <b>ทุกเงื่อนไข</b> — ไม่สามารถแก้ไขข้อมูล หรืออัปเดตสถานะของเคสได้ จนกว่าผู้ดูแลระบบจะปลดล็อกหรือขยายกำหนด</div>
            {lock && <span className="lock-stage"><Icon name="clock" size={11} /> {lock.stage} · {lock.detail}</span>}
          </div>
          {canUnlock && (
            <button className="btn btn-sm" style={{ alignSelf: "center", background: "var(--error-700)", color: "#fff", borderColor: "var(--error-700)", whiteSpace: "nowrap" }} onClick={doUnlock}>
              <Icon name="lock-open" size={14} /> ปลดล็อก / ขยายกำหนด
            </button>
          )}
        </div>
      )}

      {c.isDraft && !locked && (
        <div className="lock-banner" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--primary-50) 85%, var(--surface)) 0%, color-mix(in oklab, var(--primary-50) 30%, var(--surface)) 100%)", borderColor: "color-mix(in oklab, var(--primary-700) 22%, transparent)", color: "var(--primary-700)" }}>
          <div className="lock-ic" style={{ background: "var(--primary-700)" }}><Icon name="edit" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lock-title">เคสนี้เป็นร่าง — ยังไม่ได้ส่งขออนุมัติ</div>
            <div className="lock-body">หัวหน้ากลุ่มงานจะยังไม่เห็นเคสนี้ แก้ไขให้เรียบร้อยแล้วกด "ส่งขออนุมัติหัวหน้า" · SLA นับจากวันลงรับ POST แล้ว อย่าลืมส่งภายในกำหนด</div>
          </div>
          {c.createdByUserId === role.userId && (
            <button className="btn btn-sm" style={{ alignSelf: "center", background: "var(--primary-700)", color: "#fff", borderColor: "var(--primary-700)", whiteSpace: "nowrap" }} onClick={doSubmitDraft}>
              <Icon name="send" size={14} /> ส่งขออนุมัติหัวหน้า
            </button>
          )}
        </div>
      )}

      {c.returned && !closedCase && (
        <div className="lock-banner" style={{ background: "linear-gradient(135deg, color-mix(in oklab, var(--warning-100) 85%, var(--surface)) 0%, color-mix(in oklab, var(--warning-100) 30%, var(--surface)) 100%)", borderColor: "color-mix(in oklab, var(--warning-700) 22%, transparent)", color: "var(--warning-700)" }}>
          <div className="lock-ic" style={{ background: "var(--warning-700)" }}><Icon name="arrow-left" size={20} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lock-title">เคสนี้ถูกหัวหน้าส่งกลับให้แก้ไข</div>
            <div className="lock-body">{c.returnReason || "หัวหน้ากลุ่มงานส่งกลับให้แก้ไขข้อมูลก่อนมอบหมาย"}</div>
          </div>
          {canEditCase && (
            <button className="btn btn-sm" style={{ alignSelf: "center", background: "var(--warning-700)", color: "#fff", borderColor: "var(--warning-700)", whiteSpace: "nowrap" }} onClick={() => router.push(`/cases/${c.id}/edit`)}>
              <Icon name="edit" size={14} /> แก้ไข & ส่งใหม่
            </button>
          )}
        </div>
      )}

      <div className="detail-grid-2col">
        <div className="stack">{StatusPanel}{AttachmentsPanel}</div>
        <div className="stack">
          <div className="card">
            <div className="card-header" style={{ padding: 0, borderBottom: "none" }}>
              <Tabs value={activeTab} onChange={setActiveTab} tabs={[{ value: "data", label: "ข้อมูลเคส", icon: "info" }, { value: "timeline", label: "Timeline", icon: "history" }]} />
            </div>
            <div className="card-body">{activeTab === "data" ? DataPanel : TimelinePanel}</div>
          </div>
        </div>
      </div>

      {modal === "assign" && <AssignModal c={c} onClose={() => setModal(null)} onSave={saveAssignment} />}
      {modal === "invest" && <InvestigationModal c={c} onClose={() => setModal(null)} onAddEvent={addInvestEvent} onChoose={selectInvestPath} />}
      {modal === "board" && <BoardModal c={c} onClose={() => setModal(null)} onSaveMeeting={saveBoardMeeting} onApply={applyBoard} />}
      {modal === "fine" && <FineModal c={c} onClose={() => setModal(null)} onSave={savePayment} onCloseCase={doCloseFine} />}
      {modal === "return" && (
        <Modal open onClose={() => setModal(null)} title="ส่งกลับให้เจ้าหน้าที่แก้ไข" sub={c.etracking + " · " + c.title}
          footer={<>
            <button className="btn btn-outline" onClick={() => setModal(null)}>ปิด</button>
            <button className="btn btn-primary" onClick={doReturn}><Icon name="arrow-left" size={14} /> ยืนยันส่งกลับ</button>
          </>}>
          <div className="stack">
            <div style={{ padding: 12, background: "var(--warning-100)", borderRadius: 8, color: "var(--warning-700)", fontSize: 12.5 }}>
              เคสจะถูกส่งกลับให้เจ้าหน้าที่ผู้สร้างแก้ไข — ยังอยู่สถานะ "รอมอบหมาย" แต่จะออกจากคิวอนุมัติจนกว่าจะแก้ไขและส่งใหม่
            </div>
            <FormField label="เหตุผล / สิ่งที่ต้องแก้ไข" req>
              <textarea className="textarea" rows={3} placeholder="เช่น ข้อมูลผู้ถูกร้องไม่ครบ กรุณาระบุที่อยู่" value={returnReason} onChange={(e) => setReturnReason(e.target.value)} />
            </FormField>
          </div>
        </Modal>
      )}
      {modal === "cancel" && (
        <Modal open onClose={() => setModal(null)} title="ยกเลิกเคส" sub={c.etracking + " · " + c.title}
          footer={<>
            <button className="btn btn-outline" onClick={() => setModal(null)}>ปิด</button>
            <button className="btn btn-danger" onClick={doCancel}><Icon name="ban" size={14} /> ยืนยันยกเลิกเคส</button>
          </>}>
          <div className="stack">
            <div style={{ padding: 12, background: "var(--error-100)", borderRadius: 8, color: "var(--error-700)", fontSize: 12.5 }}>
              การยกเลิกจะเปลี่ยนสถานะเคสเป็น "ยกเลิก" และปิดเคส — ไม่สามารถดำเนินการต่อได้
            </div>
            <FormField label="เหตุผลการยกเลิก">
              <textarea className="textarea" rows={3} placeholder="ระบุเหตุผล (ถ้ามี)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </FormField>
          </div>
        </Modal>
      )}
    </main>
  );
}
