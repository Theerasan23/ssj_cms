"use client";

import { Fragment, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { Avatar, Donut } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const STAGES = ["มอบหมาย", "ตรวจสอบ", "กรรมการ", "ค่าปรับ"];

export default function ReportsPage() {
  const { cms } = useApp();
  const { cases, loading } = useAllCases();
  const [period, setPeriod] = useState("90");

  // Cases created within the selected window — drives the KPI cards + law donut.
  const inPeriod = useMemo(() => {
    const cutoff = cms.offsetDays(cms.TODAY, -Number(period));
    return cases.filter((c) => c.createdAt && c.createdAt >= cutoff);
  }, [cases, period, cms]);

  // Last-12-months buckets (real year+month, so cases from different years don't collapse).
  const monthlyData = useMemo(() => {
    const buckets = [];
    const [ty, tm] = cms.TODAY.split("-").map(Number);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ty, tm - 1 - i, 1);
      buckets.push({ y: d.getFullYear(), m: d.getMonth(), label: MONTHS[d.getMonth()], count: 0 });
    }
    cases.forEach((c) => {
      if (!c.createdAt) return;
      const y = Number(c.createdAt.slice(0, 4)), m = Number(c.createdAt.slice(5, 7)) - 1;
      const b = buckets.find((x) => x.y === y && x.m === m);
      if (b) b.count++;
    });
    return buckets;
  }, [cases, cms]);
  const heat = useMemo(() => {
    const grid = STAGES.map(() => Array(12).fill(0));
    const stageIdx = { "01": 0, "02": 1, "03": 2, "04": 3 };
    cases.forEach((c) => {
      const si = stageIdx[c.status];
      if (si === undefined) return; // skip closed cases
      if (cms.caseSla(c).kind !== "overdue") return;
      const idx = monthlyData.findIndex((b) => c.createdAt && b.y === Number(c.createdAt.slice(0, 4)) && b.m === Number(c.createdAt.slice(5, 7)) - 1);
      if (idx >= 0) grid[si][idx]++;
    });
    return grid;
  }, [cases, cms, monthlyData]);

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  const totalCases = inPeriod.length;
  const closedList = inPeriod.filter((c) => c.closed);
  const closedCases = closedList.length;
  const onTime = inPeriod.filter((c) => { const s = cms.caseSla(c); return s.kind === "in-time" || s.kind === "far" || c.closed; }).length;
  const onTimePct = totalCases ? Math.round((onTime / totalCases) * 100) : 0;
  // Real average processing time: created → close event, over closed cases in the window.
  const durations = closedList.map((c) => {
    const closeEv = (c.timeline || []).find((t) => t.kind === "close");
    if (!closeEv || !c.createdAt || !closeEv.date) return null;
    return Math.round((new Date(closeEv.date) - new Date(c.createdAt)) / 86400000);
  }).filter((d) => d != null && d >= 0);
  const avgDays = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;
  const maxMonth = Math.max(1, ...monthlyData.map((d) => d.count));
  const lawData = cms.MASTER.laws.map((l) => ({ id: l.id, label: l.label, count: inPeriod.filter((c) => c.laws && c.laws.includes(l.id)).length })).filter((l) => l.count > 0);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div><h1>รายงาน · KPI Dashboard</h1><div className="page-meta">ภาพรวมการดำเนินงานและตัวชี้วัด · เคสที่สร้างใน {period} วันล่าสุด ({totalCases} เคส)</div></div>
        <div className="page-actions">
          <select className="select" style={{ width: 160 }} value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="30">30 วันล่าสุด</option><option value="90">90 วันล่าสุด</option>
            <option value="180">6 เดือนล่าสุด</option><option value="365">12 เดือนล่าสุด</option>
          </select>
          <button className="btn btn-outline" onClick={() => window.print()}><Icon name="printer" size={16} /> พิมพ์รายงาน</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card success">
          <div className="kpi-label">เคสในช่วงที่เลือก</div><div className="kpi-value">{totalCases}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14} /> สร้างใน {period} วันล่าสุด</div>
          <div className="kpi-icon"><Icon name="inbox" size={18} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เคสปิดแล้ว</div><div className="kpi-value">{closedCases}</div>
          <div className="kpi-trend"><Icon name="check-circle" size={14} /> ปิด {totalCases ? Math.round(closedCases / totalCases * 100) : 0}% ของช่วงนี้</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18} /></div>
        </div>
        <div className={`kpi-card ${onTimePct >= 90 ? "success" : ""}`}>
          <div className="kpi-label">% เคส on-time</div><div className="kpi-value">{onTimePct}%</div>
          <div className={`kpi-trend ${onTimePct >= 90 ? "up" : "down"}`}><Icon name={onTimePct >= 90 ? "trend-up" : "alert"} size={14} /> เป้า ≥ 90%</div>
          <div className="kpi-icon"><Icon name="clock" size={18} /></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เวลาเฉลี่ยต่อเคส (ที่ปิดแล้ว)</div>
          <div className="kpi-value">{avgDays == null ? "—" : avgDays}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-muted)" }}> วัน</span></div>
          <div className="kpi-trend"><Icon name="history" size={14} /> {durations.length ? `จาก ${durations.length} เคสที่ปิด` : "ยังไม่มีเคสปิดในช่วงนี้"}</div>
          <div className="kpi-icon"><Icon name="history" size={18} /></div>
        </div>
      </div>

      <div className="section-row" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header"><h3>เคสตามเดือน (12 เดือนล่าสุด)</h3><span className="muted small">จำนวนเคส</span></div>
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
          <div className="card-header"><h3>เคสตามพรบ.</h3></div>
          <div className="card-body"><Donut data={lawData} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>เคสเกินเวลาตามขั้น × เดือน (Heatmap)</h3><span className="muted small">เข้มกว่า = เกินเวลามากกว่า</span></div>
        <div className="card-body">
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

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><h3>เคสตามสถานะ + กลุ่มเจ้าหน้าที่</h3></div>
        <div className="card-body">
          <div className="stack">
            {cms.MASTER.officers.slice(0, 5).map((o) => {
              const myCases = cases.filter((c) => c.assignees.includes(o.id));
              const segs = ["02", "03", "04", "05"].map((code) => ({ code, count: myCases.filter((c) => c.status === code).length }));
              return (
                <div key={o.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 60px", gap: 12, alignItems: "center" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Avatar name={o.name} size="sm" />
                    <span style={{ fontSize: 12.5 }}>{o.name.replace(/^(นาย|นาง|นางสาว)/, "")}</span>
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
    </main>
  );
}
