"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Tabs } from "@/components/ui";
import { ExportButtons } from "@/components/ExportButtons";
import { ENTITY_META, EntityForm, blankEntityForm } from "@/components/EntityForm";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";
import { useAllCases } from "@/lib/useCases";
import { caseSectionIds, sectionShortLabel } from "@/lib/caseStats";
import { FINE_PAGE_ROLES } from "@/lib/roles";

export default function FinesPage() {
  const { cms, role, actions } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const { cases, loading } = useAllCases();
  const [tab, setTab] = useState("unpaid");
  // มุมมองของทั้งหน้า: ดูรวม หรือเจาะดูทีละ พรบ./มาตรา — เลือกได้ทีละอย่าง
  const [mode, setMode] = useState("all");
  const [pick, setPick] = useState("");
  // ฟอร์ม "เพิ่มมาตรา" ตัวเดียวกับหน้า Admin (มาตรา + ค่าปรับ)
  const [addingSection, setAddingSection] = useState(null);
  const canAddSection = FINE_PAGE_ROLES.includes(role?.id);

  async function saveSection(form) {
    try {
      await api.post("/master/sections", form);
      setAddingSection(null);
      toast.push({ kind: "success", title: "เพิ่มมาตราสำเร็จ" });
      actions.reloadMaster?.();
    } catch (e) {
      toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message });
    }
  }

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  const allFines = [];
  cases.forEach((c) => (c.fines || []).forEach((f) => allFines.push({ ...f, remaining: f.amount - (f.paidAmount || 0), c })));

  // ตัวเลือกในดรอปดาวน์เอาเฉพาะหมวดที่มีค่าปรับอยู่จริง ผู้ใช้จะได้ไม่เลือกไปเจอหน้าว่าง
  // เคสหนึ่งมีได้หลาย พรบ. ค่าปรับใบเดียวจึงถูกนับในทุก พรบ. ของเคสนั้น
  const tally = (keysOf) => {
    const m = new Map();
    for (const f of allFines) for (const k of keysOf(f)) m.set(k, (m.get(k) || 0) + 1);
    return m;
  };
  const lawCount = tally((f) => ((f.c.laws || []).length ? f.c.laws : ["_none"]));
  const lawOptions = (cms.MASTER.laws || [])
    .filter((l) => lawCount.has(l.id))
    .map((l) => ({ id: l.id, label: `${l.label} (${lawCount.get(l.id)})` }));
  if (lawCount.has("_none")) lawOptions.push({ id: "_none", label: `ไม่ระบุ พรบ. (${lawCount.get("_none")})` });

  const secCount = tally((f) => [f.secId || "_none"]);
  const secOptions = (cms.MASTER.sections || [])
    .filter((sec) => secCount.has(sec.id))
    .map((sec) => ({ id: sec.id, label: `${sectionShortLabel(sec.text)} · ${cms.lawLabel(sec.law)} (${secCount.get(sec.id)})` }));
  if (secCount.has("_none")) secOptions.push({ id: "_none", label: `ไม่ระบุมาตรา (${secCount.get("_none")})` });

  const options = mode === "law" ? lawOptions : mode === "sec" ? secOptions : [];
  // สลับมุมมองแล้วเลือกหมวดแรกให้เลย ปุ่มจะได้เห็นผลทันทีโดยไม่ต้องไปกดดรอปดาวน์ต่อ
  const switchMode = (next) => {
    setMode(next);
    const opts = next === "law" ? lawOptions : next === "sec" ? secOptions : [];
    setPick(opts[0]?.id || "");
  };
  const active = mode !== "all" && pick;

  const fineMatches = (f) => {
    if (!active) return true;
    if (mode === "law") {
      const laws = f.c.laws || [];
      return pick === "_none" ? laws.length === 0 : laws.includes(pick);
    }
    return pick === "_none" ? !f.secId : f.secId === pick;
  };
  // การ์ด "เคสที่อยู่ในขั้นเปรียบเทียบ" นับเป็นเคส ไม่ใช่ใบค่าปรับ จึงต้องกรองที่ตัวเคสเอง
  const caseMatches = (c) => {
    if (!active) return true;
    if (mode === "law") {
      const laws = c.laws || [];
      return pick === "_none" ? laws.length === 0 : laws.includes(pick);
    }
    const ids = caseSectionIds(c);
    return pick === "_none" ? ids.size === 0 : ids.has(pick);
  };

  const fines = allFines.filter(fineMatches);
  const unpaid = fines.filter((f) => !f.paid);
  const paid = fines.filter((f) => f.paid);
  const totalUnpaid = unpaid.reduce((s, f) => s + f.remaining, 0);
  const totalPaid = fines.reduce((s, f) => s + (f.paidAmount || 0), 0);
  const rows = tab === "unpaid" ? unpaid : paid;
  const compareStage = cases.filter((c) => c.status === "04" && caseMatches(c)).length;

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>ค่าปรับ</h1>
          {/* หมวดที่กำลังกรองอยู่อ่านได้จากดรอปดาวน์ทางขวาแล้ว ไม่ต้องเขียนซ้ำตรงนี้
              ให้บรรทัดนี้สั้นไว้ ไม่งั้นแถวหัวเรื่องจะยาวจนปุ่ม Export ตกบรรทัด */}
          <div className="page-meta">ติดตามการเปรียบเทียบปรับ · ประวัติการชำระ</div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            {canAddSection && (
              <button className="btn btn-primary" onClick={() => setAddingSection({ row: blankEntityForm(ENTITY_META.sections), isNew: true })}>
                <Icon name="plus" size={14} /> เพิ่มมาตรา
              </button>
            )}
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, padding: 2, background: "var(--surface)" }}>
              <button className={`btn btn-sm ${mode === "all" ? "btn-primary" : "btn-ghost"}`} onClick={() => switchMode("all")}>ทั้งหมด</button>
              <button className={`btn btn-sm ${mode === "law" ? "btn-primary" : "btn-ghost"}`} onClick={() => switchMode("law")} disabled={lawOptions.length === 0}>ตาม พรบ.</button>
              <button className={`btn btn-sm ${mode === "sec" ? "btn-primary" : "btn-ghost"}`} onClick={() => switchMode("sec")} disabled={secOptions.length === 0}>ตาม มาตรา</button>
            </div>
            {/* จำกัดความกว้างไว้ ไม่งั้นชื่อมาตรายาว ๆ จะดันปุ่ม Export ตกไปอีกบรรทัด */}
            {mode !== "all" && (
              <select className="select" value={pick} onChange={(e) => setPick(e.target.value)} style={{ minWidth: 160, maxWidth: 220 }}
                aria-label={mode === "law" ? "เลือก พรบ." : "เลือกมาตรา"}>
                {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            )}
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
          <div className="kpi-value">{compareStage}</div>
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

      {addingSection && (
        <EntityForm meta={ENTITY_META.sections} editing={addingSection} onClose={() => setAddingSection(null)} onSave={saveSection} />
      )}
    </main>
  );
}
