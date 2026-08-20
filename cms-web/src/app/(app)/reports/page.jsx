"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Avatar, Donut, SLABadge, StatusBadge, Tabs } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";
import { isSupervisor, SUPERVISOR_ROLES } from "@/lib/roles";
import { CANCELLED, deadlineWatch, officerPerformance, onTimeRate, problemBreakdown, reportScope, stageBreakdown } from "@/lib/caseStats";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const STAGES = ["มอบหมาย", "ตรวจสอบ", "กรรมการ", "ค่าปรับ"];
const PERIODS = [
  { value: "30", label: "30 วันล่าสุด" },
  { value: "90", label: "90 วันล่าสุด" },
  { value: "180", label: "6 เดือนล่าสุด" },
  { value: "365", label: "12 เดือนล่าสุด" },
  { value: "all", label: "ทั้งหมด (ทุกช่วงเวลา)" },
];

// การ์ด KPI กดเข้าไปดูรายการเคสตามตัวกรองของการ์ดนั้นได้ (หน้า /cases อ่านตัวกรองจาก query string)
// ใช้ role=button + Enter/Space เพราะ .kpi-card เป็น div ที่มีไอคอน/ข้อความซ้อนอยู่แล้ว
const cardLink = (router, href) => ({
  role: "button",
  tabIndex: 0,
  title: "ดูรายการเคสตามตัวกรองนี้",
  onClick: () => router.push(href),
  onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(href); } },
});

const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

// สีประจำ พรบ. — เฉดเดียวกับโดนัท "เคสตามพรบ." (DONUT_COLORS ใน ui.jsx)
// ผูกสีกับ "ลำดับของ พรบ. ใน MASTER" ไม่ใช่ลำดับที่แสดงผล สีของแต่ละ พรบ. จึงคงที่เสมอ
// ไม่ว่าจะเรียงตามจำนวนเคสของใคร
const LAW_COLORS = ["#1F4E79", "#2E74B5", "#E65100", "#2E7D32", "#6b3fa0", "#0e7c8a", "#F57F17", "#C62828", "#4a8fcc"];
// "ไม่ระบุ พรบ." ไม่ใช่หมวดกฎหมายจริง จึงเป็นสีกลาง ไม่แย่งสายตาจากหมวดจริง
const LAW_NONE_COLOR = "#9aa3ad";
function lawColor(id, laws) {
  if (id === "_none") return LAW_NONE_COLOR;
  const i = laws.findIndex((l) => l.id === id);
  return LAW_COLORS[(i < 0 ? 0 : i) % LAW_COLORS.length];
}
function lawTone(id, laws, strong) {
  if (id === "_none") return { bg: "var(--surface-2)", fg: "var(--text-soft)" };
  const c = lawColor(id, laws);
  return {
    bg: `color-mix(in oklab, ${c} ${strong ? 26 : 12}%, var(--surface))`,
    fg: `color-mix(in oklab, ${c} 82%, #000)`,
  };
}

function SectionHead({ title, sub, actions }) {
  return (
    <div className="row between" style={{ marginTop: 28, marginBottom: 12, gap: 12, alignItems: "flex-end" }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
        {sub && <div className="muted small" style={{ marginTop: 3 }}>{sub}</div>}
      </div>
      {actions}
    </div>
  );
}

// เคสที่ใกล้ครบกำหนด แยกเป็นการ์ดละขั้นตอน — เกณฑ์ "ใกล้ครบ" คือเหลือ ≤ 3 วัน (sla.js)
function NearDeadlineCards({ stages, router }) {
  return (
    <div className="kpi-grid">
      {stages.map((s) => (
        <div key={s.stage} className={`kpi-card is-link ${s.near > 0 ? "warn" : "is-zero"}`}
          {...cardLink(router, `/cases?status=${s.status}&sla=near`)}>
          <div className="kpi-label">ใกล้ครบ · {s.short}</div>
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
  );
}

// รายชื่อเคสที่ต้องเร่ง — ชื่อเคส + เจ้าหน้าที่ + นับถอยหลัง เรียงจากด่วนที่สุด
function DeadlineList({ rows, cms, router, empty }) {
  if (rows.length === 0) {
    return (
      <div className="table-empty" style={{ padding: "32px 16px" }}>
        <div className="empty-icon" style={{ background: "var(--success-100)", color: "var(--success-700)" }}><Icon name="check-circle" size={24} /></div>
        <div style={{ fontWeight: 600 }}>{empty}</div>
      </div>
    );
  }
  return (
    <div className="stack-sm">
      {rows.map(({ c, sla, daysLeft }) => {
        const late = sla.kind === "overdue";
        return (
          <div key={c.id} role="button" tabIndex={0}
            onClick={() => router.push(`/cases/${c.id}`)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/cases/${c.id}`); } }}
            style={{
              display: "grid", gridTemplateColumns: "minmax(0,1fr) 92px", gap: 12, alignItems: "center",
              padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer",
            }}>
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="mono small muted">{c.etracking || "—"}</span>
                <StatusBadge code={c.status} size="sm" />
                {cms.isCaseLocked(c) && <span className="lock-pill"><Icon name="lock" size={10} /> ล็อก</span>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 4, ...ellipsis }}>{c.title || "(ยังไม่ตั้งชื่อเรื่อง)"}</div>
              <div className="row small muted" style={{ gap: 12, marginTop: 4 }}>
                <span style={{ ...ellipsis, maxWidth: 320 }}>
                  <Icon name="user" size={11} />{" "}
                  {c.assignees.length ? c.assignees.map((id) => cms.officerName(id)).join(", ") : "ยังไม่มอบหมาย"}
                </span>
                {sla.due && <span><Icon name="calendar" size={11} /> ครบกำหนด {cms.fmtThaiDate(sla.due)}</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: `var(--${late ? "error" : "warning"}-700)` }}>
                {daysLeft == null ? "—" : Math.abs(daysLeft)}
              </div>
              <div className="small muted" style={{ marginTop: 3 }}>
                {daysLeft == null ? "เกินกำหนดแล้ว" : late ? "วันที่เกินมา" : "วันที่เหลือ"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ผลการดำเนินงานรายบุคคล — การ์ดเดียว สลับดูทีละคน (หัวหน้า/รองหัวหน้า/แอดมิน/ผู้บริหารเห็นทุกคน
// บทบาทอื่นเห็นเฉพาะการ์ดของตัวเอง)
function OfficerPerformanceCard({ cases, cms, people, canSwitch, router }) {
  const [idx, setIdx] = useState(0);
  // พรบ. ที่กางรายการเคสอยู่ — ถ้าสลับไปดูคนที่ไม่มี พรบ. นั้น activeLaw จะเป็น undefined เอง
  // (ไม่ต้องรีเซ็ต state) ส่วนคนที่มี พรบ. เดียวกันจะยังกางค้างไว้ ซึ่งช่วยเทียบคนต่อคนได้
  const [openLaw, setOpenLaw] = useState(null);
  // clamp เผื่อรายชื่อหดลง (แอดมินปิดบัญชีเจ้าหน้าที่ระหว่างเปิดหน้าอยู่) — เดินหน้า/ถอยหลัง
  // ต้องนับจากตำแหน่งที่แสดงอยู่จริง ไม่ใช่ค่า idx เดิมที่เกินขอบไปแล้ว
  const at = Math.min(idx, people.length - 1);
  const cur = people[at];
  const perf = useMemo(() => officerPerformance(cur, cases, cms), [cur, cases, cms]);
  const roleLabel = cms.MASTER.roles?.find((r) => r.id === cur.role)?.role || "";
  const activeLaw = perf.byLaw.find((g) => g.id === openLaw);
  const step = (d) => setIdx((at + d + people.length) % people.length);

  const stats = [
    { key: "invest", label: "อยู่ระหว่างตรวจสอบ", code: "02", n: perf.stages.invest },
    { key: "board", label: "เข้ากรรมการ", code: "03", n: perf.stages.board },
    { key: "fine", label: "ค่าปรับ", code: "04", n: perf.stages.fine },
  ];
  if (perf.stages.assign > 0) stats.unshift({ key: "assign", label: "รอมอบหมาย", code: "01", n: perf.stages.assign });
  if (perf.stages.followup > 0) stats.push({ key: "followup", label: "ติดตามผล", code: "06", n: perf.stages.followup });

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>ผลการดำเนินงานรายบุคคล</h3>
          <div className="card-sub">
            {canSwitch ? `เจ้าหน้าที่ ${people.length} คน · เลือกดูทีละคน` : "เคสที่คุณรับผิดชอบ"} · “เคสในมือ” = เคสที่ได้รับมอบหมายและยังไม่ปิด
          </div>
        </div>
        {canSwitch && people.length > 1 && (
          <div className="row data-print-hide" style={{ gap: 6 }}>
            <button className="icon-btn" title="คนก่อนหน้า" onClick={() => step(-1)}><Icon name="chevron-left" size={16} /></button>
            <select className="select" style={{ width: 210 }} value={cur.id}
              onChange={(e) => { const i = people.findIndex((p) => String(p.id) === e.target.value); if (i >= 0) setIdx(i); }}>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button className="icon-btn" title="คนถัดไป" onClick={() => step(1)}><Icon name="chevron-right" size={16} /></button>
          </div>
        )}
      </div>
      <div className="card-body">
        <div className="row between" style={{ gap: 16, alignItems: "flex-start" }}>
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={cur.name} size="lg" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5 }}>{cur.name}</div>
              <div className="small muted">{roleLabel}{cur.email ? ` · ${cur.email}` : ""}</div>
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                {perf.overdue > 0 && <span className="sla-badge overdue"><Icon name="alert" size={11} /> เกินเวลา {perf.overdue}</span>}
                {perf.near > 0 && <span className="sla-badge near"><Icon name="clock" size={11} /> ใกล้ครบ {perf.near}</span>}
                {perf.locked > 0 && <span className="lock-pill"><Icon name="lock" size={10} /> ล็อก {perf.locked}</span>}
                {perf.overdue === 0 && perf.near === 0 && <span className="sla-badge in-time"><Icon name="check" size={11} /> ไม่มีเคสที่ต้องเร่ง</span>}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: "var(--primary-700)" }}>{perf.inHand}</div>
            <div className="small muted" style={{ marginTop: 4 }}>เคสที่อยู่ในมือ</div>
            <div className="small muted">ปิดไปแล้ว {perf.closed} · รวมทั้งหมด {perf.total}</div>
          </div>
        </div>

        <div className="hr" />

        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(130px, 1fr))`, gap: 10 }}>
          {/* ตัวเลขพวกนี้เป็นของ "คนที่กำลังดู" เท่านั้น จึงไม่ลิงก์ไป /cases?status=XX ซึ่งเป็นยอดทั้งระบบ
              — ต้องการเจาะรายเคส ให้กดจากรายชื่อเคสแยกตาม พรบ. ด้านล่าง */}
          {stats.map((s) => (
            // ใช้โทนสีประจำสถานะชุดเดียวกับ StatusBadge ทั้งระบบ (--st-XX-bg / --st-XX-fg)
            // ตัวเลขจึงสื่อถึงสถานะเดียวกับป้ายที่เห็นในตารางเคสและไทม์ไลน์
            <div key={s.key}
              style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: `var(--st-${s.code}-bg)` }}>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: `var(--st-${s.code}-fg)` }}>{s.n}</div>
              <div className="small" style={{ marginTop: 3, color: `var(--st-${s.code}-fg)`, opacity: 0.78 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="hr" />

        <div className="row between" style={{ marginBottom: 10 }}>
          <b style={{ fontSize: 13 }}>ตาม พรบ.</b>
          <span className="muted small">กดที่การ์ดเพื่อดูรายการเคส · เคสที่มีหลาย พรบ. จะถูกนับในทุก พรบ. ที่เกี่ยวข้อง</span>
        </div>
        {perf.byLaw.length === 0 ? (
          <div className="muted small">ยังไม่มีเคสที่อยู่ในมือ</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))", gap: 10 }}>
              {perf.byLaw.map((g) => {
                const on = openLaw === g.id;
                const tone = lawTone(g.id, cms.MASTER.laws, on);
                return (
                  <div key={g.id} role="button" tabIndex={0} aria-expanded={on}
                    title={`${g.label} — ${g.cases.length} เคส (กดเพื่อดูรายการ)`}
                    onClick={() => setOpenLaw(on ? null : g.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenLaw(on ? null : g.id); } }}
                    style={{
                      border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                      background: tone.bg, transition: "background .14s ease",
                    }}>
                    <div className="row between" style={{ gap: 6, flexWrap: "nowrap" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: tone.fg, ...ellipsis }}>{g.label}</span>
                      <Icon name={on ? "chevron-up" : "chevron-down"} size={13} style={{ color: tone.fg, opacity: 0.7, flexShrink: 0 }} />
                    </div>
                    <div className="num" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, marginTop: 4, color: tone.fg }}>{g.cases.length}</div>
                    <div className="small" style={{ color: tone.fg, opacity: 0.7 }}>เคส</div>
                  </div>
                );
              })}
            </div>
            {activeLaw && (
              <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginTop: 12 }}>
                <div className="row between" style={{ padding: "8px 12px", gap: 8, ...(() => { const t = lawTone(activeLaw.id, cms.MASTER.laws, true); return { background: t.bg, color: t.fg }; })() }}>
                  <b style={{ fontSize: 12.5, ...ellipsis }}>{activeLaw.label}</b>
                  <span className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                    <span className="chip primary" style={{ fontSize: 11 }}>{activeLaw.cases.length} เคส</span>
                    <button className="icon-btn" style={{ width: 26, height: 26 }} title="ปิดรายการ"
                      onClick={() => setOpenLaw(null)}><Icon name="x" size={13} /></button>
                  </span>
                </div>
                {activeLaw.cases.map((c) => (
                  <div key={c.id} role="button" tabIndex={0}
                    onClick={() => router.push(`/cases/${c.id}`)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(`/cases/${c.id}`); } }}
                    style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "8px 12px", borderTop: "1px solid var(--border)", cursor: "pointer" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, ...ellipsis }}>{c.title || "(ยังไม่ตั้งชื่อเรื่อง)"}</div>
                      <div className="mono muted" style={{ fontSize: 11 }}>{c.etracking || "—"}</div>
                    </div>
                    <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                      <StatusBadge code={c.status} size="sm" showLabel={false} />
                      <SLABadge sla={cms.caseSla(c)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ประเภทปัญหา — เรียงจากที่พบมากที่สุด
function ProblemTypesCard({ data, scopeLabel }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const totalTags = data.reduce((n, d) => n + d.count, 0);
  // อันดับ 1 เสมอกันได้ (ข้อมูลจริงมี 2 ประเภทที่ 6 เคสเท่ากัน) — ต้องประกาศให้ครบ ไม่ใช่หยิบมาชื่อเดียว
  const leaders = data.filter((d) => d.count === max);
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h3>ประเภทปัญหา</h3>
          <div className="card-sub">{data.length} ประเภท · รวม {totalTags} รายการ ({scopeLabel}) · เคสหนึ่งเลือกได้หลายประเภท</div>
        </div>
        {data.length > 0 && (
          <span className="chip accent" style={{ fontSize: 11 }}>
            พบมากที่สุด{leaders.length > 1 ? ` (เท่ากัน ${leaders.length} ประเภท)` : ""}: {leaders.map((d) => d.name).join(" · ")} — {max} เคส
          </span>
        )}
      </div>
      <div className="card-body">
        {data.length === 0 ? (
          <div className="muted small">ไม่มีข้อมูลประเภทปัญหาในช่วงที่เลือก</div>
        ) : (
          <div className="stack-sm">
            {data.map((d) => (
              <div key={d.name} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr 56px", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12.5, fontWeight: d.count === max ? 700 : 500, ...ellipsis }} title={d.name}>{d.name}</span>
                <div style={{ display: "flex", height: 20, borderRadius: 6, overflow: "hidden", background: "var(--surface-2)" }}>
                  <div style={{ width: `${(d.count / max) * 100}%`, background: d.count === max ? "var(--accent-600)" : "var(--primary-600)", borderRadius: 6 }} />
                </div>
                <span className="num small" style={{ textAlign: "right", fontWeight: 600 }}>{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { role, cms } = useApp();
  const router = useRouter();
  const { cases, loading } = useAllCases();
  const [period, setPeriod] = useState("90");
  const [watchTab, setWatchTab] = useState("near");

  // ฐานการนับเดียวกันทั้งหน้า: ไม่รวมร่างและเคสที่ยกเลิก (lib/caseStats.js)
  const { scoped, draftCount, cancelledCount } = useMemo(() => reportScope(cases), [cases]);

  // เคสที่สร้างในช่วงที่เลือก — ใช้กับ KPI/กราฟในหมวด "สรุปตามช่วงเวลา" เท่านั้น
  const inPeriod = useMemo(() => {
    if (period === "all") return scoped;
    const cutoff = cms.offsetDays(cms.TODAY, -Number(period));
    return scoped.filter((c) => c.createdAt && c.createdAt >= cutoff);
  }, [scoped, period, cms]);

  // Last-12-months buckets (real year+month, so cases from different years don't collapse).
  const monthlyData = useMemo(() => {
    const buckets = [];
    const [ty, tm] = cms.TODAY.split("-").map(Number);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ty, tm - 1 - i, 1);
      buckets.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTHS[d.getMonth()], count: 0 });
    }
    scoped.forEach((c) => {
      if (!c.createdAt) return;
      const y = Number(c.createdAt.slice(0, 4)), m = Number(c.createdAt.slice(5, 7)) - 1;
      const b = buckets.find((x) => x.y === y && x.m === m);
      if (b) b.count++;
    });
    return buckets;
  }, [scoped, cms]);

  const heat = useMemo(() => {
    const grid = STAGES.map(() => Array(12).fill(0));
    const stageIdx = { "01": 0, "02": 1, "03": 2, "04": 3 };
    scoped.forEach((c) => {
      const si = stageIdx[c.status];
      if (si === undefined) return; // skip closed cases
      if (cms.caseSla(c).kind !== "overdue") return;
      const idx = monthlyData.findIndex((b) => c.createdAt && b.y === Number(c.createdAt.slice(0, 4)) && b.m === Number(c.createdAt.slice(5, 7)) - 1);
      if (idx >= 0) grid[si][idx]++;
    });
    return grid;
  }, [scoped, cms, monthlyData]);

  const watch = useMemo(() => deadlineWatch(scoped, cms), [scoped, cms]);
  const problems = useMemo(() => problemBreakdown(inPeriod), [inPeriod]);

  // ผู้ที่รับมอบหมายเคสได้ (เจ้าหน้าที่ดำเนินการ + หัวหน้า/รองหัวหน้า) — หัวหน้า/รองหัวหน้า/
  // แอดมิน/ผู้บริหารสลับดูได้ทุกคน บทบาทอื่นเห็นเฉพาะการ์ดของตัวเอง
  const canSwitchPeople = isSupervisor(role.id) || role.id === "exec";
  const people = useMemo(() => {
    const all = cms.MASTER.officers || [];
    return canSwitchPeople ? all : all.filter((o) => o.id === role.userId);
  }, [cms, canSwitchPeople, role]);

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  // ----- หมวด ก. สถานะปัจจุบัน (ไม่ขึ้นกับช่วงเวลา) -----
  const activeCases = scoped.filter((c) => !c.closed);
  const closedNow = scoped.length - activeCases.length;
  const byStage = stageBreakdown(activeCases, cms);
  // เคสที่ยังไม่ปิดแต่ไม่ได้อยู่ในสี่ขั้นนี้ = สถานะติดตามผล (06/07/09) ซึ่งไม่มีกำหนด SLA แล้ว
  // แสดงครบทั้งสี่ขั้นทุกบทบาท (เดิมหน้าหลักซ่อนขั้น "รอมอบหมาย" จากบางบทบาท ยอดรวมจึงไม่ตรง
  // กับการ์ด "กำลังดำเนินการ") — ที่นี่เป็นหน้ารายงาน ตัวเลขต้องบวกกันได้เสมอ
  const stageTotal = byStage.reduce((n, s) => n + s.count, 0);
  const followupTotal = activeCases.length - stageTotal;
  const queueLive = scoped.filter((c) => c.status === "01" && !c.returned && !cms.isCaseLocked(c)).length;
  const lockedAll = scoped.filter((c) => cms.isCaseLocked(c)).length;
  const overdueAll = activeCases.filter((c) => cms.caseSla(c).kind === "overdue").length;
  const onTimeNow = onTimeRate(scoped, cms);

  // ----- หมวด ง. สรุปตามช่วงเวลา -----
  const periodNote = period === "all" ? "ทุกช่วงเวลา" : `${period} วันล่าสุด`;
  // ใช้ต่อท้ายคำว่า "สร้าง" — เดิมเขียน `สร้างใน${periodNote}` ได้ "สร้างใน90 วันล่าสุด" ติดกัน
  const periodPhrase = period === "all" ? "ทุกช่วงเวลา" : `ใน ${period} วันล่าสุด`;
  const totalCases = inPeriod.length;
  const closedList = inPeriod.filter((c) => c.closed);
  const closedCases = closedList.length;
  const onTimePeriod = onTimeRate(inPeriod, cms);
  // Real average processing time: created → close event, over closed cases in the window.
  const durations = closedList.map((c) => {
    const closeEv = (c.timeline || []).find((t) => t.kind === "close");
    if (!closeEv || !c.createdAt || !closeEv.date) return null;
    return Math.round((new Date(closeEv.date) - new Date(c.createdAt)) / 86400000);
  }).filter((d) => d != null && d >= 0);
  const avgDays = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const maxMonth = Math.max(1, ...monthlyData.map((d) => d.count));
  // เคสที่ไม่ได้ระบุ พรบ. เคยหายไปจากโดนัททั้งหมด (ข้อมูลจริงมีถึง 19 จาก 44 เคส) — ต้องแสดงด้วย
  // ไม่งั้นผู้อ่านเข้าใจว่าเคสทั้งช่วงมีแค่ 26 เคส ทั้งที่ตัวเลขนั้นคือจำนวน "ป้าย พรบ." ไม่ใช่จำนวนเคส
  const lawNone = inPeriod.filter((c) => !(c.laws || []).length).length;
  const lawMulti = inPeriod.filter((c) => (c.laws || []).length > 1).length;
  // ส่งสีไปกับข้อมูลด้วย เพื่อให้ พรบ. เดียวกันเป็นสีเดียวกันทั้งโดนัทและการ์ด "ตาม พรบ."
  // (ถ้าปล่อยให้โดนัทไล่สีตาม index หมวดที่ไม่มีเคสจะถูกกรองออกแล้วสีเลื่อนไม่ตรงกัน)
  const lawData = cms.MASTER.laws
    .map((l) => ({ id: l.id, label: l.label, color: lawColor(l.id, cms.MASTER.laws), count: inPeriod.filter((c) => c.laws && c.laws.includes(l.id)).length }))
    .filter((l) => l.count > 0);
  if (lawNone > 0) lawData.push({ id: "_none", label: "ไม่ระบุ พรบ.", color: LAW_NONE_COLOR, count: lawNone });
  // ตัดสถานะ 08 ยกเลิกออกจากกราฟ — ฐานการนับไม่รวมอยู่แล้ว แท่งนี้จึงเป็น 0 ตลอดและชวนเข้าใจผิด
  const statusOrder = Object.keys(cms.STATUS).filter((code) => code !== CANCELLED);
  const statusCounts = statusOrder.map((code) => ({ code, count: inPeriod.filter((c) => c.status === code).length, label: cms.STATUS[code].label }));
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));

  // ภาระงานเจ้าหน้าที่ (ย้ายมาจากหน้าหลัก) — เคสที่ยังไม่ปิดต่อคน
  const officerLoad = (cms.MASTER.officers || []).map((o) => {
    const myCases = activeCases.filter((c) => c.assignees.includes(o.id));
    return { ...o, count: myCases.length, locked: myCases.filter((x) => cms.isCaseLocked(x)).length };
  }).sort((a, b) => a.count - b.count);
  const maxLoad = Math.max(1, ...officerLoad.map((o) => o.count));

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>รายงาน · KPI Dashboard</h1>
          <div className="page-meta">
            ภาพรวมการดำเนินงานและตัวชี้วัด · ฐานการนับ <b>{scoped.length} เคส</b>
            {(draftCount > 0 || cancelledCount > 0) && (
              <> (ไม่รวมร่าง {draftCount} เคส · ยกเลิก {cancelledCount} เคส)</>
            )}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => window.print()}><Icon name="printer" size={16} /> พิมพ์รายงาน</button>
        </div>
      </div>

      <SectionHead title="สถานะปัจจุบัน" sub="นับจากเคสทั้งหมดในระบบ ณ วันนี้ · ไม่ขึ้นกับช่วงเวลาที่เลือกในหมวด “สรุปตามช่วงเวลา”" />
      <div className="kpi-grid">
        {SUPERVISOR_ROLES.includes(role.id) && (
          <div className="kpi-card accent is-link" {...cardLink(router, "/cases?status=01")}>
            <div className="kpi-label"><Icon name="hand" size={14} /> รอขออนุมัติ & มอบหมาย</div>
            <div className="kpi-value">{queueLive}</div>
            <div className="kpi-trend"><Icon name="inbox" size={14} /> ต้องดำเนินการภายใน {cms.MASTER.slaDays?.assign ?? 3} วัน</div>
            <div className="kpi-icon"><Icon name="approve" size={18} /></div>
          </div>
        )}
        <div className="kpi-card is-link" {...cardLink(router, "/cases")}>
          <div className="kpi-label">เคสทั้งหมด</div>
          <div className="kpi-value">{scoped.length}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> ไม่รวมร่างและเคสที่ยกเลิก</div>
          <div className="kpi-icon"><Icon name="inbox" size={18} /></div>
        </div>
        <div className="kpi-card is-link" {...cardLink(router, "/cases?state=open")}>
          <div className="kpi-label">กำลังดำเนินการ</div>
          <div className="kpi-value">{activeCases.length}</div>
          <div className="kpi-trend"><Icon name="circle" size={10} /> เคสที่ยังไม่ปิด</div>
          <div className="kpi-icon"><Icon name="loupe" size={18} /></div>
        </div>
        <div className="kpi-card success is-link" {...cardLink(router, "/cases?state=closed")}>
          <div className="kpi-label">เสร็จสิ้น</div>
          <div className="kpi-value">{closedNow}</div>
          <div className="kpi-trend"><Icon name="check-circle" size={14} /> ปิดเคสแล้ว</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
        <div className={`kpi-card is-link ${overdueAll > 0 ? "danger" : "is-zero"}`} {...cardLink(router, "/cases?sla=overdue&state=open")}>
          <div className="kpi-label"><Icon name="clock" size={14} /> เกินเวลา (ทุกขั้น)</div>
          <div className="kpi-value">{overdueAll}</div>
          <div className="kpi-trend down"><Icon name="alert" size={14} /> ใน {activeCases.length} เคสที่ยังไม่ปิด</div>
          <div className="kpi-icon"><Icon name="clock" size={18} /></div>
        </div>
        <div className={`kpi-card is-link ${lockedAll > 0 ? "danger" : "is-zero"}`} {...cardLink(router, "/cases?sla=overdue&state=open")}>
          <div className="kpi-label"><Icon name="lock" size={14} /> เคสที่ถูกล็อก</div>
          <div className="kpi-value">{lockedAll}</div>
          <div className="kpi-trend down"><Icon name="ban" size={14} /> ห้ามแก้ไข/อัปเดต</div>
          <div className="kpi-icon"><Icon name="lock" size={18} /></div>
        </div>
        <div className={`kpi-card is-link ${onTimeNow.pct >= 90 ? "success" : ""}`} {...cardLink(router, "/cases?sla=in-time")}>
          <div className="kpi-label"><Icon name="check-circle" size={14} /> % เคส on-time</div>
          <div className="kpi-value">{onTimeNow.pct == null ? "—" : `${onTimeNow.pct}%`}</div>
          <div className={`kpi-trend ${onTimeNow.pct >= 90 ? "up" : "down"}`}>
            <Icon name={onTimeNow.pct >= 90 ? "trend-up" : "alert"} size={14} />
            {onTimeNow.onTime}/{onTimeNow.measurable} เคสที่วัดได้ · เป้า ≥ 90%
          </div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
      </div>

      <div className="row" style={{ marginTop: 22, marginBottom: 10, gap: 10, alignItems: "baseline" }}>
        <span className="muted small">
          เคสที่ยังไม่ปิด แยกตามขั้นตอน · อยู่ในขั้น SLA {stageTotal} เคส
          {followupTotal > 0 ? ` + อยู่ระหว่างติดตามผล ${followupTotal} เคส` : ""}
          {" "}= กำลังดำเนินการ {activeCases.length} เคส
        </span>
      </div>
      <div className="kpi-grid">
        {byStage.map((s) => {
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

      <SectionHead
        title="เคสที่ใกล้จะเกินเวลา"
        sub={`ใกล้ครบกำหนด (เหลือ ≤ 3 วัน) ${watch.near.length} เคส · เกินเวลาไปแล้ว ${watch.overdue.length} เคส`}
      />
      <NearDeadlineCards stages={byStage} router={router} />
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div>
            <h3>รายชื่อเคสที่ต้องเร่ง</h3>
            <div className="card-sub">ชื่อเคส · เจ้าหน้าที่ผู้รับผิดชอบ · นับถอยหลังถึงวันครบกำหนด (เรียงจากด่วนที่สุด)</div>
          </div>
          <div className="data-print-hide">
            <Tabs value={watchTab} onChange={setWatchTab} tabs={[
              { value: "near", label: "ใกล้ครบกำหนด", icon: "clock", count: watch.near.length },
              { value: "overdue", label: "เกินเวลาแล้ว", icon: "alert", count: watch.overdue.length },
            ]} />
          </div>
        </div>
        <div className="card-body">
          {watchTab === "near"
            ? <DeadlineList rows={watch.near} cms={cms} router={router} empty="ยังไม่มีเคสที่ใกล้ครบกำหนด" />
            : <DeadlineList rows={watch.overdue} cms={cms} router={router} empty="ไม่มีเคสที่เกินเวลา" />}
        </div>
      </div>

      <SectionHead title="ผลการดำเนินงานรายบุคคล" sub="ภาระงานและความคืบหน้าของเจ้าหน้าที่แต่ละคน ณ วันนี้" />
      {people.length === 0 ? (
        <div className="card"><div className="card-body muted small">บัญชีของคุณไม่ได้อยู่ในรายชื่อผู้รับมอบหมายเคส จึงยังไม่มีข้อมูลรายบุคคล</div></div>
      ) : (
        <OfficerPerformanceCard cases={scoped} cms={cms} people={people} canSwitch={canSwitchPeople} router={router} />
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div><h3>ภาระงานเจ้าหน้าที่</h3><div className="card-sub">เคสที่ยังไม่ปิดต่อคน · มอบเคสใหม่ให้ผู้ที่ภาระน้อย</div></div></div>
        <div className="card-body">
          <div className="stack-sm">
            {officerLoad.map((o) => (
              <div key={o.id} style={{ display: "grid", gridTemplateColumns: "160px 1fr 80px", gap: 12, alignItems: "center" }}>
                {/* .row มี flex-wrap: wrap ชื่อยาว ๆ อย่าง "ณรงค์เดช นนทเบญจวรรณ" จึงตกไปอยู่ใต้รูป
                    ทำให้แถวเสียแนว — ห้ามตกบรรทัดแล้วตัดชื่อด้วย ellipsis แทน */}
                <div className="row" style={{ gap: 8, flexWrap: "nowrap", minWidth: 0 }}>
                  <Avatar name={o.name} size="sm" />
                  <span style={{ fontSize: 12.5, ...ellipsis }} title={o.name}>{o.name.replace(/^(นาย|นาง|นางสาว)/, "")}</span>
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

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div><h3>เคสตามสถานะ + กลุ่มเจ้าหน้าที่</h3><div className="card-sub">สัดส่วนสถานะของเคสทั้งหมดที่แต่ละคนเคยรับผิดชอบ</div></div></div>
        <div className="card-body">
          <div className="stack">
            {(cms.MASTER.officers || []).map((o) => {
              const myCases = scoped.filter((c) => c.assignees.includes(o.id));
              // ต้องครบทุกสถานะในฐานการนับ ไม่งั้นความยาวแถบไม่ตรงกับจำนวนเคสที่แสดงด้านขวา
              const segs = statusOrder.map((code) => ({ code, count: myCases.filter((c) => c.status === code).length }));
              return (
                <div key={o.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 60px", gap: 12, alignItems: "center" }}>
                  {/* .row มี flex-wrap: wrap ชื่อยาว ๆ อย่าง "ณรงค์เดช นนทเบญจวรรณ" จึงตกไปอยู่ใต้รูป
                      ทำให้แถวเสียแนว — ห้ามตกบรรทัดแล้วตัดชื่อด้วย ellipsis แทน */}
                  <div className="row" style={{ gap: 8, flexWrap: "nowrap", minWidth: 0 }}>
                    <Avatar name={o.name} size="sm" />
                    <span style={{ fontSize: 12.5, ...ellipsis }} title={o.name}>{o.name.replace(/^(นาย|นาง|นางสาว)/, "")}</span>
                  </div>
                  <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "var(--surface-2)" }}>
                    {segs.map((s) => s.count > 0 && <div key={s.code} style={{ flex: s.count, background: `var(--st-${s.code}-fg)` }} title={`${cms.STATUS[s.code].label}: ${s.count}`} />)}
                  </div>
                  <div className="num small" style={{ textAlign: "right", fontWeight: 600 }}>{myCases.length} เคส</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <SectionHead
        title="สรุปตามช่วงเวลา"
        sub={`นับเฉพาะเคสที่สร้าง${periodPhrase} · ${totalCases} เคส`}
        actions={
          <select className="select data-print-hide" style={{ width: 190 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        }
      />
      <div className="kpi-grid">
        <div className="kpi-card success">
          <div className="kpi-label">เคสในช่วงที่เลือก</div><div className="kpi-value">{totalCases}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> สร้าง{periodPhrase}</div>
          <div className="kpi-icon"><Icon name="inbox" size={18} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เคสปิดแล้ว</div><div className="kpi-value">{closedCases}</div>
          <div className="kpi-trend"><Icon name="check-circle" size={14} /> ปิด {totalCases ? Math.round(closedCases / totalCases * 100) : 0}% ของช่วงนี้</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
        <div className={`kpi-card ${onTimePeriod.pct >= 90 ? "success" : ""}`}>
          <div className="kpi-label">% เคส on-time</div>
          <div className="kpi-value">{onTimePeriod.pct == null ? "—" : `${onTimePeriod.pct}%`}</div>
          <div className={`kpi-trend ${onTimePeriod.pct >= 90 ? "up" : "down"}`}>
            <Icon name={onTimePeriod.pct >= 90 ? "trend-up" : "alert"} size={14} />
            {onTimePeriod.onTime}/{onTimePeriod.measurable} เคสที่วัดได้ · เป้า ≥ 90%
          </div>
          <div className="kpi-icon"><Icon name="clock" size={18} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เวลาเฉลี่ยต่อเคส (ที่ปิดแล้ว)</div>
          <div className="kpi-value">{avgDays == null ? "—" : avgDays}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}> วัน</span></div>
          <div className="kpi-trend"><Icon name="history" size={14} /> {durations.length ? `จาก ${durations.length} เคสที่ปิด` : "ยังไม่มีเคสปิดในช่วงนี้"}</div>
          <div className="kpi-icon"><Icon name="history" size={18} /></div>
        </div>
      </div>

      <div className="section-row" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-header"><h3>เคสตามเดือน (12 เดือนล่าสุด)</h3><span className="muted small">ทุกช่วงเวลา · จำนวนเคส</span></div>
          <div className="card-body">
            <div className="bar-chart" style={{ height: 240 }}>
              {monthlyData.map((d, i) => (
                <div key={i} className="bar" style={{ height: `${(d.count / maxMonth) * 100}%`, background: i === monthlyData.length - 1 ? "var(--accent-600)" : "var(--primary-600)" }}>
                  <div className="bar-value">{d.count}</div>
                </div>
              ))}
            </div>
            <div className="bar-chart-x">{monthlyData.map((d, i) => <span key={i}>{d.label}</span>)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div>
              <h3>เคสตามพรบ.</h3>
              <div className="card-sub">
                {lawData.length} หมวด · สร้าง{periodPhrase}
                {lawMulti > 0 ? ` · ${lawMulti} เคสมีหลาย พรบ. จึงถูกนับซ้ำ` : ""}
              </div>
            </div>
          </div>
          <div className="card-body"><Donut data={lawData} /></div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <ProblemTypesCard data={problems} scopeLabel={periodNote} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div><h3>เคสตามสถานะ</h3><div className="card-sub">{statusCounts.length} สถานะ · {totalCases} เคส (สร้าง{periodPhrase}) · ไม่รวมสถานะยกเลิก</div></div>
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

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><h3>เคสเกินเวลาตามขั้น × เดือน (Heatmap)</h3><span className="muted small">ทุกช่วงเวลา · เข้มกว่า = เกินเวลามากกว่า</span></div>
        <div className="card-body">
          <div className="heatmap-scroll">
          <div className="heatmap-grid">
            <div></div>
            {MONTHS.map((m, i) => <div key={i} className="h-label" style={{ textAlign: "center" }}>{m}</div>)}
            {STAGES.map((s, i) => (
              <Fragment key={i}>
                <div className="h-label">{s}</div>
                {heat[i].map((v, j) => (
                  <div key={j} className="h-cell" style={{ background: v === 0 ? "var(--surface-2)" : `oklch(${95 - v * 6}% ${0.05 + v * 0.025} 30)`, color: v > 3 ? "#fff" : "var(--primary-900)" }} title={`${s} - ${MONTHS[j]}: ${v}`}>{v || ""}</div>
                ))}
              </Fragment>
            ))}
          </div>
          </div>
        </div>
      </div>
    </main>
  );
}
