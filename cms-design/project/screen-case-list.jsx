/* =========================================================
   CMS — S03 Case List
   ========================================================= */

const CaseListScreen = () => {
  const { state, setRoute, route } = useApp();
  const [query, setQuery] = React.useState(route.q || "");
  const [statusFilter, setStatusFilter] = React.useState([]);
  const [lawFilter, setLawFilter] = React.useState([]);
  const [slaFilter, setSlaFilter] = React.useState("");
  const [scope, setScope] = React.useState("all"); // all | mine
  const [showFilters, setShowFilters] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const me = state.currentRole;
  const filtered = React.useMemo(() => {
    return state.cases.filter(c => {
      if (scope === "mine") {
        // For demo: officer == ณป (off-3), so we count cases assigned to off-3 OR created by officer
        const myOfficerId = "off-3";
        if (!c.assignees.includes(myOfficerId) && c.createdBy !== me) return false;
      }
      if (query) {
        const q = query.toLowerCase();
        const hay = [c.etracking, c.title, c.respondent.business, c.respondent.licensee].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter.length && !statusFilter.includes(c.status)) return false;
      if (lawFilter.length && !c.laws.some(l => lawFilter.includes(l))) return false;
      if (slaFilter) {
        const sla = window.CMS.caseSla(c);
        if (slaFilter === "near"    && sla.kind !== "near")    return false;
        if (slaFilter === "overdue" && sla.kind !== "overdue") return false;
        if (slaFilter === "in-time" && sla.kind !== "in-time") return false;
      }
      return true;
    });
  }, [state.cases, query, statusFilter, lawFilter, slaFilter, scope, me]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  React.useEffect(() => { if (page > totalPages) setPage(1); }, [filtered, totalPages]);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activeFiltersCount =
    statusFilter.length + lawFilter.length + (slaFilter ? 1 : 0) + (query ? 1 : 0);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>เคสร้องเรียน</h1>
          <div className="page-meta">
            พบ {filtered.length} เคส
            {activeFiltersCount > 0 && <> (กรอง {activeFiltersCount} เงื่อนไข)</>}
            {" "}จากทั้งหมด {state.cases.length}
          </div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            <div style={{ display:"flex", border:"1px solid var(--border)", borderRadius:8, padding:2, background:"var(--surface)" }}>
              <button className={`btn btn-sm ${scope === "all" ? "btn-primary" : "btn-ghost"}`} onClick={()=> setScope("all")}>เคสทั้งหมด</button>
              <button className={`btn btn-sm ${scope === "mine" ? "btn-primary" : "btn-ghost"}`} onClick={()=> setScope("mine")}>เคสของฉัน</button>
            </div>
            <button className="btn btn-outline">
              <Icon name="download" size={16}/> Export Excel
            </button>
            <button className="btn btn-primary" onClick={()=> setRoute({ name: "case-new" })}>
              <Icon name="plus" size={16}/> สร้างเคสใหม่
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body compact">
          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1, position:"relative", minWidth: 220 }}>
              <Icon name="search" size={16} style={{ position:"absolute", left: 12, top: 12, color:"var(--text-soft)" }}/>
              <input className="input" placeholder="ค้นหา E-tracking, ชื่อเคส, ผู้ถูกร้อง..."
                value={query} onChange={(e)=> setQuery(e.target.value)} style={{ paddingLeft: 36 }}/>
            </div>
            <button className={`btn ${showFilters ? "btn-outline" : "btn-outline"}`} onClick={()=> setShowFilters(v => !v)}>
              <Icon name="filter" size={16}/>
              ตัวกรอง
              {activeFiltersCount > 0 && <span className="chip primary" style={{ marginLeft: 4, fontSize: 11 }}>{activeFiltersCount}</span>}
              <Icon name={showFilters ? "chevron-up" : "chevron-down"} size={14}/>
            </button>
            {activeFiltersCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={()=> { setStatusFilter([]); setLawFilter([]); setSlaFilter(""); setQuery(""); }}>
                ล้างทั้งหมด
              </button>
            )}
          </div>

          {showFilters && (
            <div style={{ marginTop: 16, display:"grid", gap: 16 }}>
              <div className="field">
                <div className="field-label small">สถานะ</div>
                <ChipPicker
                  options={Object.keys(window.CMS.STATUS).map(code => ({ id: code, label: window.CMS.STATUS[code].label }))}
                  value={statusFilter} onChange={setStatusFilter}/>
              </div>
              <div className="field">
                <div className="field-label small">พรบ.</div>
                <ChipPicker
                  options={window.CMS.MASTER.laws.map(l => ({ id: l.id, label: l.label }))}
                  value={lawFilter} onChange={setLawFilter}/>
              </div>
              <div className="field">
                <div className="field-label small">SLA</div>
                <ChipPicker
                  single
                  options={[
                    { id: "in-time", label: "ในเวลา" },
                    { id: "near",    label: "ใกล้ครบ ≤ 3 วัน" },
                    { id: "overdue", label: "เกินเวลา / ล็อก" },
                  ]}
                  value={slaFilter ? [slaFilter] : []}
                  onChange={(arr) => setSlaFilter(arr[0] === slaFilter ? "" : arr[0] || "")}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {pageItems.length === 0 ? (
          <div className="table-empty">
            <div className="empty-icon"><Icon name="inbox" size={26}/></div>
            <div style={{ fontWeight: 600 }}>ไม่พบเคสตามเงื่อนไขที่ค้นหา</div>
            <div className="small">ลองเปลี่ยนคำค้นหา หรือล้างตัวกรอง</div>
            {state.cases.length === 0 && (
              <button className="btn btn-primary" onClick={()=> setRoute({ name: "case-new" })}>
                <Icon name="plus" size={16}/> สร้างเคสแรก
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>E-tracking</th>
                    <th>ชื่อเคส</th>
                    <th>ผู้ถูกร้อง · อำเภอ</th>
                    <th>พรบ.</th>
                    <th>ผู้รับผิดชอบ</th>
                    <th>สถานะ</th>
                    <th>SLA</th>
                    <th>ลงรับ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(c => {
                    const locked = window.CMS.isCaseLocked(c);
                    return (
                    <tr key={c.id} className={locked ? "row-locked" : ""} onClick={()=> setRoute({ name: "case-detail", id: c.id })}>
                      <td className="num">
                        <div className="row" style={{ gap: 6, alignItems:"center" }}>
                          {locked && <span className="lock-pill" title="เคสล็อก เกิน SLA"><Icon name="lock" size={10}/></span>}
                          {c.etracking}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500, maxWidth: 280, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{c.respondent.business || c.respondent.licensee || "—"}</div>
                        <div className="small muted">{c.respondent.district}</div>
                      </td>
                      <td>
                        <div className="tag-list">
                          {c.laws.slice(0,2).map(id => <span key={id} className="chip">{window.CMS.lawLabel(id)}</span>)}
                          {c.laws.length > 2 && <span className="chip">+{c.laws.length - 2}</span>}
                        </div>
                      </td>
                      <td>{c.assignees.length === 0 ? <span className="muted small">— ยังไม่มอบหมาย</span> :
                        <AvatarStack names={c.assignees.map(id => window.CMS.officerName(id))} max={3} size="sm"/>}</td>
                      <td><StatusBadge code={c.status}/></td>
                      <td><SLABadge sla={window.CMS.caseSla(c)}/></td>
                      <td className="muted small">{window.CMS.fmtThaiDateShort(c.postDate)}</td>
                      <td onClick={(e)=> e.stopPropagation()}>
                        <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={(e)=> { e.stopPropagation(); setRoute({ name:"case-detail", id: c.id }); }}>
                          <Icon name="chevron-right" size={14}/>
                        </button>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card-divider"/>
            <div className="pagination">
              <div className="page-info">แสดง {(page-1)*pageSize + 1}–{Math.min(page*pageSize, filtered.length)} จาก {filtered.length} เคส</div>
              <button onClick={()=> setPage(p => Math.max(1, p-1))} disabled={page === 1}><Icon name="chevron-left" size={14}/></button>
              {Array.from({ length: totalPages }).slice(0, 6).map((_, i) => (
                <button key={i} className={page === i+1 ? "active" : ""} onClick={()=> setPage(i+1)}>{i+1}</button>
              ))}
              {totalPages > 6 && <span className="muted small" style={{ padding: "0 6px" }}>...</span>}
              <button onClick={()=> setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}><Icon name="chevron-right" size={14}/></button>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

Object.assign(window, { CaseListScreen });
