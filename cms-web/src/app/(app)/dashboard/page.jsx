"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusBadge, SLABadge, Avatar } from "@/components/ui";
import { AssignModal } from "@/components/CaseModals";
import { useApp, useToasts } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";
import { api } from "@/lib/api";
import { isHeadLevel, SUPERVISOR_ROLES } from "@/lib/roles";

// SLA stages in workflow order. `short` is the chip label (the configured names are too
// long for a KPI card); the full label + day count come from /master at render time.
// `status` = สถานะเคสที่ตรงกับขั้นนั้น ใช้เป็นตัวกรองตอนกดการ์ดไปหน้า /cases
const SLA_STAGES = [
  { stage: "assign", short: "รอมอบหมาย", status: "01" },
  { stage: "invest", short: "ตรวจสอบ", status: "02" },
  { stage: "board", short: "กรรมการ", status: "03" },
  { stage: "fine", short: "ค่าปรับ", status: "04" },
];
// a case's live SLA stage is decided by its status (see sla.js caseSla)
const STAGE_BY_STATUS = { "01": "assign", "02": "invest", "03": "board", "04": "fine" };

// งานค้างแยกตามขั้นตอนที่เคสอยู่ตอนนี้ — caseSla() คืนค่าของขั้นที่เคสกำลังอยู่ จึงจัดกลุ่มจากสถานะ
// nearSoonest = จำนวนวันที่เหลือของเคสที่ด่วนที่สุดในขั้นนั้น (มาจาก sla.js daysLeft)
function stageBreakdown(activeCases, cms) {
  return SLA_STAGES.map((s) => {
    const at = activeCases.filter((c) => STAGE_BY_STATUS[c.status] === s.stage);
    const slas = at.map((c) => cms.caseSla(c));
    const near = slas.filter((x) => x.kind === "near");
    return {
      ...s,
      label: cms.MASTER.slaConfig?.find((x) => x.stage === s.stage)?.label || s.short,
      days: cms.MASTER.slaDays?.[s.stage],
      count: at.length,
      near: near.length,
      nearSoonest: near.length ? Math.min(...near.map((x) => x.daysLeft ?? 0)) : null,
      overdue: slas.filter((x) => x.kind === "overdue").length,
    };
  });
}

// เคสที่ใกล้ครบกำหนด แยกเป็นการ์ดละสถานะ/ขั้นตอน — เกณฑ์ "ใกล้ครบ" คือเหลือ ≤ 3 วัน (sla.js)
function NearDeadlineCards({ stages, router }) {
  const total = stages.reduce((n, s) => n + s.near, 0);
  return (
    <>
      <div className="row" style={{ marginTop: 22, marginBottom: 10, gap: 10, alignItems: "baseline" }}>
        <span className="muted small">
          เคสที่ใกล้จะครบกำหนด (เหลือ ≤ 3 วัน) · รวม {total} เคส
          {total === 0 ? " — ยังไม่มีเคสที่ต้องเร่ง" : ""}
        </span>
      </div>
      <div className="kpi-grid">
        {stages.map((s) => (
          <div key={s.stage} className={`kpi-card is-link ${s.near > 0 ? "warn" : "is-zero"}`}
            {...cardLink(router, `/cases?status=${s.status}&sla=near`)}>
            <div className="kpi-label">{s.short}</div>
            <div className="kpi-value">{s.near}</div>
            <div className={`kpi-trend${s.near > 0 ? " down" : ""}`}>
              {s.near > 0
                ? <><Icon name="clock" size={14} /> ด่วนที่สุดเหลือ {s.nearSoonest} วัน</>
                : <>{s.label}{s.days ? ` · ภายใน ${s.days} วัน` : ""}</>}
            </div>
            <div className="kpi-icon"><Icon name="clock" size={18} /></div>
          </div>
        ))}
      </div>
    </>
  );
}

// หน้าหลักเป็น "สถานะปัจจุบัน" ล้วน ๆ แล้ว — วิดเจ็ตที่ต้องเลือกช่วงเวลา (กราฟย้อนหลัง) อยู่ที่หน้ารายงาน · KPI
// การ์ด KPI กดเข้าไปดูรายการเคสตามตัวกรองของการ์ดนั้นได้ (หน้า /cases อ่านตัวกรองจาก query string)
// ใช้ role=button + Enter/Space เพราะ .kpi-card เป็น div ที่มีไอคอน/ข้อความซ้อนอยู่แล้ว
const cardLink = (router, href) => ({
  role: "button",
  tabIndex: 0,
  title: "ดูรายการเคสตามตัวกรองนี้",
  onClick: () => router.push(href),
  onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(href); } },
});

export default function DashboardPage() {
  const { role } = useApp();
  // ตัวเลขบนหน้าหลักเป็นภาพรวมทั้งระบบเสมอ — ทุกบทบาทเปิดดูเคสได้ สิทธิ์จำกัดแค่ตอนแก้ไข
  const { cases, loading, reload } = useAllCases();
  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;
  if (isHeadLevel(role.id)) return <HeadDashboard cases={cases} reload={reload} />;
  return <OfficerDashboard cases={cases} />;
}

function HeadDashboard({ cases, reload }) {
  const { role, cms, actions } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const [quickAssignFor, setQuickAssignFor] = useState(null);

  // every submitted (non-draft) case goes through the approval queue, whoever created it
  const submittedByOfficer = cases.filter((c) => !c.isDraft);
  const queue = submittedByOfficer.filter((c) => c.status === "01" && !c.returned);
  const queueLive = queue.filter((c) => !cms.isCaseLocked(c));

  const total = submittedByOfficer.length;
  const activeCases = submittedByOfficer.filter((c) => !c.closed);
  const inProgress = activeCases.length;
  const nearByStage = stageBreakdown(activeCases, cms);
  const lockedAll = submittedByOfficer.filter((c) => cms.isCaseLocked(c)).length;
  const overdueAll = submittedByOfficer.filter((c) => !c.closed && cms.caseSla(c).kind === "overdue").length;
  const onTime = submittedByOfficer.filter((c) => {
    const s = cms.caseSla(c);
    return s.kind === "in-time" || s.kind === "far" || c.closed;
  }).length;
  const onTimePct = total ? Math.round((onTime / total) * 100) : 0;

  const officerLoad = cms.MASTER.officers.map((o) => {
    const myCases = cases.filter((c) => c.assignees.includes(o.id) && !c.closed);
    return { ...o, count: myCases.length, locked: myCases.filter((x) => cms.isCaseLocked(x)).length };
  }).sort((a, b) => a.count - b.count);
  const maxLoad = Math.max(1, ...officerLoad.map((o) => o.count));

  async function doAssign(ids, note) {
    const c = cases.find((x) => x.id === quickAssignFor);
    if (cms.isCaseLocked(c)) { toast.push({ kind: "danger", title: "เคสถูกล็อก", msg: "เกิน SLA — ไม่สามารถมอบหมายได้" }); setQuickAssignFor(null); return; }
    try {
      await api.post(`/cases/${c.id}/assign`, { assigneeIds: ids, note });
      setQuickAssignFor(null);
      toast.push({ kind: "success", title: "อนุมัติและมอบหมายสำเร็จ", msg: "เจ้าหน้าที่ได้รับ notification แล้ว" });
      reload();
      actions.reloadNotifications?.();
    } catch (e) {
      setQuickAssignFor(null);
      toast.push({ kind: "danger", title: "ทำรายการไม่สำเร็จ", msg: e.message });
    }
  }

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>สวัสดีครับ {role.name.split(" ")[0]}</h1>
          <div className="page-meta">วันนี้ {cms.fmtThaiDate(cms.TODAY)} · <b>หน้าจอหัวหน้ากลุ่ม คบส.</b> · แสดงเฉพาะเคสที่เจ้าหน้าที่ส่งเข้ามา</div>
        </div>
        <div className="page-actions">
          {/* ไม่มีตัวเลือกช่วงเวลาแล้ว — การ์ดทุกใบบนหน้านี้เป็นสถานะปัจจุบัน ส่วนกราฟย้อนหลังอยู่ที่หน้ารายงาน */}
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-outline" onClick={() => router.push("/reports")}><Icon name="chart" size={16} /> Dashboard เต็ม</button>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card accent is-link" {...cardLink(router, "/cases?status=01")}>
          <div className="kpi-label"><Icon name="hand" size={14} /> รอขออนุมัติ & มอบหมาย</div>
          <div className="kpi-value">{queueLive.length}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> ต้องดำเนินการภายใน 3 วัน</div>
          <div className="kpi-icon" style={{ background: "var(--accent-100)", color: "var(--accent-700)" }}><Icon name="approve" size={18} /></div>
        </div>
        <div className="kpi-card warn is-link" {...cardLink(router, "/cases?sla=overdue&state=open")}>
          <div className="kpi-label"><Icon name="clock" size={14} /> เกินเวลา (ทุก stage)</div>
          <div className="kpi-value">{overdueAll}</div>
          <div className="kpi-trend"><Icon name="alert" size={14} /> ใน {inProgress} เคสที่ active</div>
          <div className="kpi-icon"><Icon name="clock" size={18} /></div>
        </div>
        <div className="kpi-card danger is-link" {...cardLink(router, "/cases?sla=overdue&state=open")}>
          <div className="kpi-label"><Icon name="lock" size={14} /> เคสที่ถูกล็อก</div>
          <div className="kpi-value">{lockedAll}</div>
          <div className="kpi-trend down"><Icon name="ban" size={14} /> ห้ามแก้ไข/อัปเดต</div>
          <div className="kpi-icon"><Icon name="lock" size={18} /></div>
        </div>
        <div className="kpi-card success is-link" {...cardLink(router, "/cases?sla=in-time")}>
          <div className="kpi-label"><Icon name="check-circle" size={14} /> % เคส on-time</div>
          <div className="kpi-value">{onTimePct}%</div>
          <div className="kpi-trend up"><Icon name="trend-up" size={14} /> เป้า ≥ 90%</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
      </div>

      <NearDeadlineCards stages={nearByStage} router={router} />

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="hand" size={18} style={{ color: "var(--accent-700)" }} /> คิวขออนุมัติและมอบหมาย
              <span className="chip accent" style={{ fontSize: 11 }}>{queue.length} เคส</span>
            </h3>
            <div className="card-sub">เคสที่เจ้าหน้าที่ส่งเข้ามาเพื่อขออนุมัติ — กรุณามอบหมายภายใน 3 วันจากวันลงรับ POST</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => router.push("/cases")}>ดูเคสทั้งหมด <Icon name="arrow-right" size={14} /></button>
        </div>
        <div className="card-body" style={{ display: "grid", gap: 12 }}>
          {queue.length === 0 ? (
            <div className="table-empty" style={{ padding: "32px 16px" }}>
              <div className="empty-icon" style={{ background: "var(--success-100)", color: "var(--success-700)" }}><Icon name="check-circle" size={24} /></div>
              <div style={{ fontWeight: 600 }}>คิวว่าง — เจ้าหน้าที่ไม่มีรายการรอขออนุมัติ</div>
              <div className="small muted">เคสจะปรากฏที่นี่เมื่อเจ้าหน้าที่ส่งเข้ามา</div>
            </div>
          ) : queue.map((c) => {
            const locked = cms.isCaseLocked(c);
            const lockInfo = cms.lockReason(c);
            const sla = cms.caseSla(c);
            return (
              <div key={c.id} className={`approval-card ${locked ? "is-locked" : ""}`}>
                <div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span className="ap-tracking">{c.etracking || "—"}</span>
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
                  <button className="btn btn-ghost btn-sm" onClick={() => router.push(`/cases/${c.id}`)}><Icon name="eye" size={14} /> ดูรายละเอียด</button>
                  {locked ? (
                    <button className="btn btn-outline btn-sm" disabled style={{ opacity: 0.6 }}><Icon name="lock" size={14} /> ล็อก</button>
                  ) : (
                    <button className="btn btn-accent" onClick={() => setQuickAssignFor(c.id)}><Icon name="approve" size={14} /> อนุมัติ & มอบหมาย</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* กราฟ "เคสตามสถานะ" / "เคสตามพรบ." ย้ายไปหน้ารายงาน · KPI แล้ว การ์ดนี้จึงเต็มความกว้าง */}
      <div style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header"><div><h3>ภาระงานเจ้าหน้าที่</h3><div className="card-sub">เคส active ต่อคน · มอบเคสใหม่ให้ผู้ที่ภาระน้อย</div></div></div>
          <div className="card-body">
            <div className="stack-sm">
              {officerLoad.map((o) => (
                <div key={o.id} style={{ display: "grid", gridTemplateColumns: "160px 1fr 80px", gap: 12, alignItems: "center" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Avatar name={o.name} size="sm" />
                    <span style={{ fontSize: 12.5 }}>{o.name.replace(/^(นาย|นาง|นางสาว)/, "")}</span>
                  </div>
                  <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "var(--surface-2)" }}>
                    <div style={{
                      width: `${(o.count / maxLoad) * 100}%`,
                      background: o.locked > 0 ? "var(--error-700)" : (o.count > maxLoad * 0.7 ? "var(--warning-700)" : "var(--primary-700)"),
                      display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8, color: "#fff", fontSize: 11, fontWeight: 600,
                    }}>{o.count > 0 && o.count}</div>
                  </div>
                  <div className="row small" style={{ justifyContent: "flex-end", gap: 6 }}>
                    {o.locked > 0 && <span className="lock-pill"><Icon name="lock" size={10} /> {o.locked}</span>}
                    <span className="muted">{o.count} เคส</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {quickAssignFor && <AssignModal c={cases.find((x) => x.id === quickAssignFor)} onClose={() => setQuickAssignFor(null)} onSave={doAssign} />}
    </main>
  );
}

function OfficerDashboard({ cases }) {
  const { role, cms } = useApp();
  const router = useRouter();
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => !c.closed);
  const inProgress = activeCases.length;
  const closedCases = cases.filter((c) => c.closed).length;
  const overdueCases = activeCases.filter((c) => cms.caseSla(c).kind === "overdue").length;

  // การ์ดงานค้างนับทุกเคสที่ยังไม่ปิดในขั้นนั้น ไม่ใช่เฉพาะที่ใกล้ครบ SLA: เกณฑ์ "ใกล้ครบ" คือ ≤ 3 วัน
  // เท่ากันทุกขั้น ขั้นที่ยาวอย่างกรรมการ/ค่าปรับ (60 วัน) จึงแทบไม่เคยขึ้นเลข การ์ดเลยว่างเปล่าตลอด
  // ตัวเลข SLA ไม่ได้หายไปไหน — อยู่บรรทัดล่างของการ์ด และแยกเป็นแถว "ใกล้จะครบกำหนด" ต่างหาก
  const byStage = stageBreakdown(activeCases, cms);
  // เคสที่ยังไม่ปิดแต่ไม่ได้อยู่ในสี่ขั้นนี้ = สถานะติดตามผล (06 ส่งต่อ / 07 ดำเนินคดี /
  // 09 เสนอนายแพทย์ยุติ) ซึ่งไม่มีกำหนด SLA แล้ว แยกบอกไว้ต่างหากเพื่อให้ยอดรวมกระทบกัน
  // (คำนวณจาก byStage เต็มเสมอ ไม่ขึ้นกับการ์ดที่ซ่อนตามบทบาท ไม่งั้นยอดติดตามผลจะเพี้ยน)
  const followupTotal = inProgress - byStage.reduce((n, s) => n + s.count, 0);
  // ขั้น "รอมอบหมาย" เป็นงานของหัวหน้า/รองหัวหน้า/ธุรการ/แอดมิน — บทบาทอื่นไม่ต้องเห็นการ์ดนี้
  const visibleStages = ["supply", ...SUPERVISOR_ROLES].includes(role.id)
    ? byStage
    : byStage.filter((s) => s.stage !== "assign");
  const stageTotal = visibleStages.reduce((n, s) => n + s.count, 0);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>สวัสดีครับ {role.name.split(" ")[0]}</h1>
          <div className="page-meta">วันนี้ {cms.fmtThaiDate(cms.TODAY)} · {role.role}</div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            {/* ทางเข้ารายการเคสต้องมีเสมอ — เดิมพึ่งปุ่มในการ์ดกราฟ/เคสล่าสุดซึ่งถูกย้ายและปิดไปแล้ว */}
            <button className="btn btn-outline" onClick={() => router.push("/cases")}><Icon name="inbox" size={16} /> ดูเคสทั้งหมด</button>
            {/* /reports เปิดให้เฉพาะหัวหน้า/รองหัวหน้า/แอดมิน/ผู้บริหาร — บทบาทอื่นเคยเห็นปุ่มที่พาไปหน้าที่ไม่มีในเมนู */}
            {[...SUPERVISOR_ROLES, "exec"].includes(role.id) && (
              <button className="btn btn-outline" onClick={() => router.push("/reports")}><Icon name="chart" size={16} /> ดู Dashboard เต็ม</button>
            )}
            {["supply", ...SUPERVISOR_ROLES].includes(role.id) && (
              <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
            )}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card is-link" {...cardLink(router, "/cases")}>
          <div className="kpi-label">เคสทั้งหมด</div>
          <div className="kpi-value">{totalCases}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> ทั้งระบบ</div>
          <div className="kpi-icon"><Icon name="inbox" size={18} /></div>
        </div>
        <div className="kpi-card is-link" {...cardLink(router, "/cases?state=open")}>
          <div className="kpi-label">กำลังดำเนินการ</div>
          <div className="kpi-value">{inProgress}</div>
          <div className="kpi-trend"><Icon name="circle" size={10} /> รวม draft + active</div>
          <div className="kpi-icon"><Icon name="loupe" size={18} /></div>
        </div>
        <div className="kpi-card success is-link" {...cardLink(router, "/cases?state=closed")}>
          <div className="kpi-label">เสร็จสิ้น</div>
          <div className="kpi-value">{closedCases}</div>
          <div className="kpi-trend"><Icon name="check-circle" size={14} /> ปิดเคสแล้ว</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
        <div className={`kpi-card is-link ${overdueCases > 0 ? "danger" : "is-zero"}`} {...cardLink(router, "/cases?sla=overdue&state=open")}>
          <div className="kpi-label">เกินเวลา</div>
          <div className="kpi-value">{overdueCases}</div>
          <div className="kpi-trend down"><Icon name="alert" size={14} /> ต้องตรวจสอบเหตุผล</div>
          <div className="kpi-icon"><Icon name="alert" size={18} /></div>
        </div>
      </div>

      {/* งานค้างแยกเป็น card ละขั้นตอน — ตัวเลขใหญ่คือจำนวนเคสที่ค้างอยู่ในขั้นนั้น
          บรรทัดล่างเตือนเมื่อขั้นนั้นมีเคสเกิน/ใกล้ครบ SLA ไม่งั้นบอกกรอบเวลาที่ตั้งไว้ */}
      <div className="row" style={{ marginTop: 22, marginBottom: 10, gap: 10, alignItems: "baseline" }}>
        <span className="muted small">
          เคสที่ยังไม่ปิด · รวม {stageTotal} เคส
          {followupTotal > 0 ? ` · อยู่ระหว่างติดตามผลอีก ${followupTotal} เคส` : ""}
        </span>
      </div>
      <div className="kpi-grid">
        {visibleStages.map((s) => {
          const alerts = [];
          if (s.overdue > 0) alerts.push(`เกินเวลา ${s.overdue}`);
          if (s.near > 0) alerts.push(`ใกล้ครบ ${s.near}`);
          return (
            <div key={s.stage} className={`kpi-card is-link ${s.overdue > 0 ? "danger" : s.near > 0 ? "warn" : s.count === 0 ? "is-zero" : ""}`}
              {...cardLink(router, `/cases?status=${s.status}`)}>
              <div className="kpi-label">{s.short}</div>
              <div className="kpi-value">{s.count}</div>
              <div className={`kpi-trend${s.overdue > 0 ? " down" : ""}`}>
                {alerts.length > 0
                  ? <><Icon name="alert" size={14} /> {alerts.join(" · ")} เคส</>
                  : <>{s.label}{s.days ? ` · ภายใน ${s.days} วัน` : ""}</>}
              </div>
              <div className="kpi-icon"><Icon name="clock" size={18} /></div>
            </div>
          );
        })}
      </div>

      <NearDeadlineCards stages={visibleStages} router={router} />

      {/* กราฟ "เคสตามสถานะ"/"เคสตามพรบ." ย้ายไปหน้ารายงาน · KPI · ตาราง "เคสล่าสุด" ปิดไปแล้ว
          เพราะซ้ำกับหน้าเคสร้องเรียน — เข้าถึงได้จากปุ่ม "ดูเคสทั้งหมด" ด้านบนหรือกดที่การ์ด */}
    </main>
  );
}
