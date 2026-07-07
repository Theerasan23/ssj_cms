"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusBadge, SLABadge, AvatarStack, ChipPicker } from "@/components/ui";
import { ExportButtons } from "@/components/ExportButtons";
import { useApp } from "@/context/AppContext";
import { useAllCases } from "@/lib/useCases";

export default function CaseListPage() {
  return (
    <Suspense fallback={<main className="page"><div className="muted">กำลังโหลด…</div></main>}>
      <CaseList />
    </Suspense>
  );
}

function CaseList() {
  const { role, cms } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cases, loading } = useAllCases();

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState([]);
  const [lawFilter, setLawFilter] = useState([]);
  const [slaFilter, setSlaFilter] = useState("");
  const [scope, setScope] = useState(searchParams.get("scope") === "mine" ? "mine" : "all");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filtered = useMemo(() => cases.filter((c) => {
    if (scope === "mine") {
      const byMe = role.userId != null && c.createdByUserId === role.userId;
      const assignedToMe = role.officerId && c.assignees.includes(role.officerId);
      if (!byMe && !assignedToMe) return false;
    }
    if (query) {
      const q = query.toLowerCase();
      const hay = [c.etracking, c.title, c.respondent.business, c.respondent.licensee].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (statusFilter.length && !statusFilter.includes(c.status)) return false;
    if (lawFilter.length && !c.laws.some((l) => lawFilter.includes(l))) return false;
    if (slaFilter) {
      const sla = cms.caseSla(c);
      if (slaFilter === "near" && sla.kind !== "near") return false;
      if (slaFilter === "overdue" && sla.kind !== "overdue") return false;
      if (slaFilter === "in-time" && sla.kind !== "in-time") return false;
    }
    return true;
  }), [cases, query, statusFilter, lawFilter, slaFilter, scope, role, cms]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { if (page > totalPages) setPage(1); }, [filtered, totalPages, page]);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);
  const activeFiltersCount = statusFilter.length + lawFilter.length + (slaFilter ? 1 : 0) + (query ? 1 : 0);

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>เคสร้องเรียน</h1>
          <div className="page-meta">
            พบ {filtered.length} เคส{activeFiltersCount > 0 && <> (กรอง {activeFiltersCount} เงื่อนไข)</>} จากทั้งหมด {cases.length}
          </div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 8, padding: 2, background: "var(--surface)" }}>
              <button className={`btn btn-sm ${scope === "all" ? "btn-primary" : "btn-ghost"}`} onClick={() => setScope("all")}>เคสทั้งหมด</button>
              <button className={`btn btn-sm ${scope === "mine" ? "btn-primary" : "btn-ghost"}`} onClick={() => setScope("mine")}>เคสของฉัน</button>
            </div>
            <ExportButtons rows={() => filtered} columns={[
              { header: "E-tracking", value: (c) => c.etracking },
              { header: "ชื่อเคส", value: (c) => c.title },
              { header: "ผู้ถูกร้อง", value: (c) => c.respondent.business || c.respondent.licensee || "" },
              { header: "อำเภอ", value: (c) => c.respondent.district || "" },
              { header: "พรบ.", value: (c) => c.laws.map((l) => cms.lawLabel(l)).join(", ") },
              { header: "ผู้รับผิดชอบ", value: (c) => c.assignees.map((id) => cms.officerName(id)).join(", ") },
              { header: "สถานะ", value: (c) => cms.STATUS[c.status]?.label || c.status },
              { header: "SLA", value: (c) => cms.caseSla(c).label },
              { header: "วันลงรับ POST", value: (c) => cms.fmtThaiDate(c.postDate) },
            ]} filename="cases" size="md" />
            <button className="btn btn-primary" onClick={() => router.push("/cases/new")}><Icon name="plus" size={16} /> สร้างเคสใหม่</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body compact">
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, position: "relative", minWidth: 220 }}>
              <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-soft)" }} />
              <input className="input" placeholder="ค้นหา E-tracking, ชื่อเคส, ผู้ถูกร้อง..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingLeft: 36 }} />
            </div>
            <button className="btn btn-outline" onClick={() => setShowFilters((v) => !v)}>
              <Icon name="filter" size={16} /> ตัวกรอง
              {activeFiltersCount > 0 && <span className="chip primary" style={{ marginLeft: 4, fontSize: 11 }}>{activeFiltersCount}</span>}
              <Icon name={showFilters ? "chevron-up" : "chevron-down"} size={14} />
            </button>
            {activeFiltersCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setStatusFilter([]); setLawFilter([]); setSlaFilter(""); setQuery(""); }}>ล้างทั้งหมด</button>
            )}
          </div>
          {showFilters && (
            <div style={{ marginTop: 16, display: "grid", gap: 16 }}>
              <div className="field">
                <div className="field-label small">สถานะ</div>
                <ChipPicker options={Object.keys(cms.STATUS).map((code) => ({ id: code, label: cms.STATUS[code].label }))} value={statusFilter} onChange={setStatusFilter} />
              </div>
              <div className="field">
                <div className="field-label small">พรบ.</div>
                <ChipPicker options={cms.MASTER.laws.map((l) => ({ id: l.id, label: l.label }))} value={lawFilter} onChange={setLawFilter} />
              </div>
              <div className="field">
                <div className="field-label small">SLA</div>
                <ChipPicker single options={[{ id: "in-time", label: "ในเวลา" }, { id: "near", label: "ใกล้ครบ ≤ 3 วัน" }, { id: "overdue", label: "เกินเวลา / ล็อก" }]}
                  value={slaFilter ? [slaFilter] : []} onChange={(arr) => setSlaFilter(arr[0] === slaFilter ? "" : arr[0] || "")} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        {pageItems.length === 0 ? (
          <div className="table-empty">
            <div className="empty-icon"><Icon name="inbox" size={26} /></div>
            <div style={{ fontWeight: 600 }}>ไม่พบเคสตามเงื่อนไขที่ค้นหา</div>
            <div className="small">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรอง</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>E-tracking</th><th>ชื่อเคส</th><th>ผู้ถูกร้อง · อำเภอ</th><th>พรบ.</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th>SLA</th><th>ลงรับ</th><th></th></tr></thead>
                <tbody>
                  {pageItems.map((c) => {
                    const locked = cms.isCaseLocked(c);
                    return (
                      <tr key={c.id} className={locked ? "row-locked" : ""} onClick={() => router.push(`/cases/${c.id}`)}>
                        <td className="num">
                          <div className="row" style={{ gap: 6, alignItems: "center" }}>
                            {locked && <span className="lock-pill" title="เคสล็อก เกิน SLA"><Icon name="lock" size={10} /></span>}
                            {c.returned && <span className="lock-pill" style={{ background: "var(--warning-700)" }} title="ถูกส่งกลับให้แก้ไข"><Icon name="arrow-left" size={10} /></span>}
                            {c.isDraft && <span className="lock-pill" style={{ background: "var(--text-soft)" }} title="ร่าง — ยังไม่ส่งขออนุมัติ"><Icon name="edit" size={10} /> ร่าง</span>}
                            {c.etracking}
                          </div>
                        </td>
                        <td style={{ fontWeight: 500, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{c.respondent.business || c.respondent.licensee || "—"}</div>
                          <div className="small muted">{c.respondent.district}</div>
                        </td>
                        <td><div className="tag-list">{c.laws.slice(0, 2).map((id) => <span key={id} className="chip">{cms.lawLabel(id)}</span>)}{c.laws.length > 2 && <span className="chip">+{c.laws.length - 2}</span>}</div></td>
                        <td>{c.assignees.length === 0 ? <span className="muted small">— ยังไม่มอบหมาย</span> : <AvatarStack names={c.assignees.map((id) => cms.officerName(id))} max={3} size="sm" />}</td>
                        <td><StatusBadge code={c.status} /></td>
                        <td><SLABadge sla={cms.caseSla(c)} /></td>
                        <td className="muted small">{cms.fmtThaiDateShort(c.postDate)}</td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => router.push(`/cases/${c.id}`)}><Icon name="chevron-right" size={14} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-divider" />
            <div className="pagination">
              <div className="page-info">แสดง {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} จาก {filtered.length} เคส</div>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}><Icon name="chevron-left" size={14} /></button>
              {Array.from({ length: totalPages }).slice(0, 6).map((_, i) => (
                <button key={i} className={page === i + 1 ? "active" : ""} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              {totalPages > 6 && <span className="muted small" style={{ padding: "0 6px" }}>...</span>}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}><Icon name="chevron-right" size={14} /></button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
