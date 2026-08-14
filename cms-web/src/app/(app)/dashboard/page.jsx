"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusBadge, SLABadge, Avatar, Donut } from "@/components/ui";
import { AssignModal } from "@/components/CaseModals";
import { useApp, useToasts } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";
import { api } from "@/lib/api";
import { isHeadLevel, SUPERVISOR_ROLES, seesOwnCasesOnly } from "@/lib/roles";

// SLA stages in workflow order. `short` is the chip label (the configured names are too
// long for a KPI card); the full label + day count come from /master at render time.
const SLA_STAGES = [
  { stage: "assign", short: "รอมอบหมาย" },
  { stage: "invest", short: "ตรวจสอบ" },
  { stage: "board", short: "กรรมการ" },
  { stage: "fine", short: "ค่าปรับ" },
];
// a case's live SLA stage is decided by its status (see sla.js caseSla)
const STAGE_BY_STATUS = { "01": "assign", "02": "invest", "03": "board", "04": "fine" };

export default function DashboardPage() {
  const { role } = useApp();
  const { cases, loading, reload } = useAllCases();
  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;
  if (isHeadLevel(role.id)) return <HeadDashboard cases={cases} reload={reload} />;
  return <OfficerDashboard cases={cases} />;
}

function HeadDashboard({ cases, reload }) {
  const { role, cms, actions } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const [period, setPeriod] = useState("30");
  const [quickAssignFor, setQuickAssignFor] = useState(null);

  // every submitted (non-draft) case goes through the approval queue, whoever created it
  const submittedByOfficer = cases.filter((c) => !c.isDraft);
  const queue = submittedByOfficer.filter((c) => c.status === "01" && !c.returned);
  const queueLive = queue.filter((c) => !cms.isCaseLocked(c));

  const total = submittedByOfficer.length;
  const inProgress = submittedByOfficer.filter((c) => !c.closed).length;
  const lockedAll = submittedByOfficer.filter((c) => cms.isCaseLocked(c)).length;
  const overdueAll = submittedByOfficer.filter((c) => !c.closed && cms.caseSla(c).kind === "overdue").length;
  const onTime = submittedByOfficer.filter((c) => {
    const s = cms.caseSla(c);
    return s.kind === "in-time" || s.kind === "far" || c.closed;
  }).length;
  const onTimePct = total ? Math.round((onTime / total) * 100) : 0;

  // status distribution respects the period selector (created within the window)
  const cutoff = cms.offsetDays(cms.TODAY, -Number(period));
  const inPeriod = submittedByOfficer.filter((c) => c.createdAt && c.createdAt >= cutoff);
  const statusCounts = Object.keys(cms.STATUS).map((code) => ({ code, count: inPeriod.filter((c) => c.status === code).length, label: cms.STATUS[code].label }));
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));

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
          <div className="row" style={{ gap: 8 }}>
            <select className="select" style={{ width: 140 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="7">7 วันล่าสุด</option><option value="30">30 วันล่าสุด</option>
              <option value="90">90 วันล่าสุด</option><option value="365">ปีนี้</option>
            </select>
            <button className="btn btn-outline" onClick={() => router.push("/reports")}><Icon name="chart" size={16} /> Dashboard เต็ม</button>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card accent">
          <div className="kpi-label"><Icon name="hand" size={14} /> รอขออนุมัติ & มอบหมาย</div>
          <div className="kpi-value">{queueLive.length}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> ต้องดำเนินการภายใน 3 วัน</div>
          <div className="kpi-icon" style={{ background: "var(--accent-100)", color: "var(--accent-700)" }}><Icon name="approve" size={18} /></div>
        </div>
        <div className="kpi-card warn">
          <div className="kpi-label"><Icon name="clock" size={14} /> เกินเวลา (ทุก stage)</div>
          <div className="kpi-value">{overdueAll}</div>
          <div className="kpi-trend"><Icon name="alert" size={14} /> ใน {inProgress} เคสที่ active</div>
          <div className="kpi-icon"><Icon name="clock" size={18} /></div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-label"><Icon name="lock" size={14} /> เคสที่ถูกล็อก</div>
          <div className="kpi-value">{lockedAll}</div>
          <div className="kpi-trend down"><Icon name="ban" size={14} /> ห้ามแก้ไข/อัปเดต</div>
          <div className="kpi-icon"><Icon name="lock" size={18} /></div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label"><Icon name="check-circle" size={14} /> % เคส on-time</div>
          <div className="kpi-value">{onTimePct}%</div>
          <div className="kpi-trend up"><Icon name="trend-up" size={14} /> เป้า ≥ 90%</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
      </div>

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

      <div className="head-grid">
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

        <div className="card">
          <div className="card-header"><div><h3>เคสตามสถานะ</h3><div className="card-sub">เฉพาะเคสที่เจ้าหน้าที่ส่งเข้ามา · {inPeriod.length} เคส (ช่วง {period} วัน)</div></div></div>
          <div className="card-body">
            <div className="bar-chart">
              {statusCounts.map((s) => {
                const h = Math.max(8, (s.count / maxStatus) * 100);
                return <div key={s.code} className="bar" style={{ height: `${h}%`, background: `var(--st-${s.code}-fg)` }} title={`${s.label}: ${s.count}`}>{s.count > 0 && <div className="bar-value">{s.count}</div>}</div>;
              })}
            </div>
            <div className="bar-chart-x">{statusCounts.map((s) => <span key={s.code}>{s.code}</span>)}</div>
            <div className="hr" />
            <div className="tag-list">{statusCounts.map((s) => <StatusBadge key={s.code} code={s.code} size="md" />)}</div>
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
  const [period, setPeriod] = useState("30");

  // period filters the analytical widgets below (charts + recent list); the alert
  // KPI cards stay current-state because "ใกล้ครบ/เกินเวลา" are about the whole book.
  const cutoff = cms.offsetDays(cms.TODAY, -Number(period));
  const inPeriod = cases.filter((c) => c.createdAt && c.createdAt >= cutoff);

  const totalCases = cases.length;
  const activeCases = cases.filter((c) => !c.closed);
  const inProgress = activeCases.length;
  const closedCases = cases.filter((c) => c.closed).length;
  const overdueCases = activeCases.filter((c) => cms.caseSla(c).kind === "overdue").length;

  // งานค้างแยกตามขั้นตอนที่เคสอยู่ตอนนี้ — caseSla() คืนค่าของขั้นที่เคสกำลังอยู่ จึงจัดกลุ่มจากสถานะ.
  // นับทุกเคสที่ยังไม่ปิดในขั้นนั้น ไม่ใช่เฉพาะที่ใกล้ครบ SLA: เกณฑ์ "ใกล้ครบ" คือ ≤ 3 วันเท่ากัน
  // ทุกขั้น ขั้นที่ยาวอย่างกรรมการ/ค่าปรับ (60 วัน) จึงแทบไม่เคยขึ้นเลข การ์ดเลยว่างเปล่าตลอด
  // ตัวเลข SLA ไม่ได้หายไปไหน — ย้ายไปอยู่บรรทัดล่างของการ์ดแทน
  const byStage = SLA_STAGES.map((s) => {
    const at = activeCases.filter((c) => STAGE_BY_STATUS[c.status] === s.stage);
    const kinds = at.map((c) => cms.caseSla(c).kind);
    return {
      ...s,
      label: cms.MASTER.slaConfig?.find((x) => x.stage === s.stage)?.label || s.short,
      days: cms.MASTER.slaDays?.[s.stage],
      count: at.length,
      near: kinds.filter((k) => k === "near").length,
      overdue: kinds.filter((k) => k === "overdue").length,
    };
  });
  // เคสที่ยังไม่ปิดแต่ไม่ได้อยู่ในสี่ขั้นนี้ = สถานะติดตามผล (06 ส่งต่อ / 07 ดำเนินคดี /
  // 09 เสนอนายแพทย์ยุติ) ซึ่งไม่มีกำหนด SLA แล้ว แยกบอกไว้ต่างหากเพื่อให้ยอดรวมกระทบกัน
  const stageTotal = byStage.reduce((n, s) => n + s.count, 0);
  const followupTotal = inProgress - stageTotal;

  const statusCounts = Object.keys(cms.STATUS).map((code) => ({ code, count: inPeriod.filter((c) => c.status === code).length, label: cms.STATUS[code].label }));
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));

  const lawCounts = cms.MASTER.laws.map((l) => ({ id: l.id, label: l.label, count: inPeriod.filter((c) => c.laws && c.laws.includes(l.id)).length }))
    .filter((l) => l.count > 0).sort((a, b) => b.count - a.count);

  const recent = [...inPeriod].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 10);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>สวัสดีครับ {role.name.split(" ")[0]}</h1>
          <div className="page-meta">วันนี้ {cms.fmtThaiDate(cms.TODAY)} · {role.role}</div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            <select className="select" style={{ width: 140 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="7">7 วันล่าสุด</option><option value="30">30 วันล่าสุด</option>
              <option value="90">90 วันล่าสุด</option><option value="365">ปีนี้</option>
            </select>
            <button className="btn btn-outline" onClick={() => router.push("/reports")}><Icon name="chart" size={16} /> ดู Dashboard เต็ม</button>
            {["supply", ...SUPERVISOR_ROLES].includes(role.id) && (
              <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
            )}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">เคสทั้งหมด</div>
          <div className="kpi-value">{totalCases}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> {seesOwnCasesOnly(role.id) ? "เฉพาะเคสของฉัน" : "ทั้งระบบ"}</div>
          <div className="kpi-icon"><Icon name="inbox" size={18} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">กำลังดำเนินการ</div>
          <div className="kpi-value">{inProgress}</div>
          <div className="kpi-trend"><Icon name="circle" size={10} /> รวม draft + active</div>
          <div className="kpi-icon"><Icon name="loupe" size={18} /></div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label">เสร็จสิ้น</div>
          <div className="kpi-value">{closedCases}</div>
          <div className="kpi-trend"><Icon name="check-circle" size={14} /> ปิดเคสแล้ว</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
        <div className={`kpi-card ${overdueCases > 0 ? "danger" : "is-zero"}`}>
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
        {byStage.map((s) => {
          const alerts = [];
          if (s.overdue > 0) alerts.push(`เกินเวลา ${s.overdue}`);
          if (s.near > 0) alerts.push(`ใกล้ครบ ${s.near}`);
          return (
            <div key={s.stage} className={`kpi-card ${s.overdue > 0 ? "danger" : s.near > 0 ? "warn" : s.count === 0 ? "is-zero" : ""}`}>
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

      <div className="section-row" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header">
            <div><h3>เคสตามสถานะ</h3><div className="card-sub">8 สถานะ · {inPeriod.length} เคส (ช่วง {period} วัน)</div></div>
            <button className="btn btn-ghost btn-sm" onClick={() => router.push("/cases")}>รายละเอียด <Icon name="chevron-right" size={14} /></button>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              {statusCounts.map((s) => {
                const h = Math.max(8, (s.count / maxStatus) * 100);
                return <div key={s.code} className="bar" style={{ height: `${h}%`, background: `var(--st-${s.code}-fg)` }} title={`${s.label}: ${s.count}`}>{s.count > 0 && <div className="bar-value">{s.count}</div>}</div>;
              })}
            </div>
            <div className="bar-chart-x">{statusCounts.map((s) => <span key={s.code}>{s.code}</span>)}</div>
            <div className="hr" />
            <div className="tag-list">{statusCounts.map((s) => <StatusBadge key={s.code} code={s.code} size="md" />)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3>เคสตามพรบ.</h3><span className="muted small">{lawCounts.length} หมวด</span></div>
          <div className="card-body"><Donut data={lawCounts} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div><h3>เคสล่าสุด</h3><div className="card-sub">10 รายการล่าสุด (ช่วง {period} วัน)</div></div>
          <button className="btn btn-outline btn-sm" onClick={() => router.push("/cases")}>ดูทั้งหมด <Icon name="arrow-right" size={14} /></button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>E-tracking</th><th>เลขรับ สสจ.</th><th>ชื่อเคส</th><th>ผู้ถูกร้อง</th><th>พรบ.</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th>SLA</th><th>วันที่</th></tr></thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} onClick={() => router.push(`/cases/${c.id}`)}>
                  <td className="num">{c.etracking || "—"}</td>
                  <td className="num">{c.letterNo || "—"}</td>
                  <td style={{ fontWeight: 500, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                  <td>{c.respondent.business || c.respondent.licensee || "—"}</td>
                  <td><div className="tag-list">{c.laws.slice(0, 2).map((id) => <span key={id} className="chip">{cms.lawLabel(id)}</span>)}{c.laws.length > 2 && <span className="chip">+{c.laws.length - 2}</span>}</div></td>
                  <td>{c.assignees.length === 0 ? <span className="muted small">— ยังไม่มอบหมาย</span> : c.assignees.map((id) => cms.officerName(id)).join(", ")}</td>
                  <td><StatusBadge code={c.status} /></td>
                  <td><SLABadge sla={cms.caseSla(c)} /></td>
                  <td className="muted small">{cms.fmtThaiDateShort(c.postDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
