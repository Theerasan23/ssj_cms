/* =========================================================
   CMS — S02 Dashboard (per-role)
   ========================================================= */

const DashboardScreen = () => {
  const { role } = useApp();
  if (role.id === "head") return <HeadDashboard/>;
  return <OfficerDashboard/>;
};

// ============== HEAD — Approval queue + KPI ==============
const HeadDashboard = () => {
  const { state, setRoute, role, actions } = useApp();
  const toast = useToasts();
  const cases = state.cases;
  const [period, setPeriod] = React.useState("30");
  const [quickAssignFor, setQuickAssignFor] = React.useState(null); // case id

  // หัวหน้ากลุ่ม: เฉพาะรายการที่เจ้าหน้าที่ส่งมา
  const submittedByOfficer = cases.filter(c => c.createdBy === "officer");
  const queue       = submittedByOfficer.filter(c => c.status === "01"); // รอมอบหมาย
  const queueLive   = queue.filter(c => !window.CMS.isCaseLocked(c));
  const queueLocked = queue.filter(c =>  window.CMS.isCaseLocked(c));

  // KPI numbers (across submitted cases)
  const total       = submittedByOfficer.length;
  const inProgress  = submittedByOfficer.filter(c => !["05","06","07","08"].includes(c.status)).length;
  const lockedAll   = submittedByOfficer.filter(c => window.CMS.isCaseLocked(c)).length;
  const overdueAll  = submittedByOfficer.filter(c => {
    if (["05","06","07","08"].includes(c.status)) return false;
    return window.CMS.caseSla(c).kind === "overdue";
  }).length;
  const onTime = submittedByOfficer.filter(c => {
    const s = window.CMS.caseSla(c);
    return s.kind === "in-time" || s.kind === "far" || ["05","06","07","08"].includes(c.status);
  }).length;
  const onTimePct = total ? Math.round((onTime / total) * 100) : 0;

  // status counts
  const statusCounts = Object.keys(window.CMS.STATUS).map(code => ({
    code, count: submittedByOfficer.filter(c => c.status === code).length,
    label: window.CMS.STATUS[code].label,
  }));
  const maxStatus = Math.max(1, ...statusCounts.map(s => s.count));

  // officer workload
  const officerLoad = window.CMS.MASTER.officers.map(o => {
    const myCases = cases.filter(c => c.assignees.includes(o.id) && !["05","06","07","08"].includes(c.status));
    return { ...o, count: myCases.length, locked: myCases.filter(x => window.CMS.isCaseLocked(x)).length };
  }).sort((a, b) => a.count - b.count); // ascending so easy to pick least loaded
  const maxLoad = Math.max(1, ...officerLoad.map(o => o.count));

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>สวัสดีครับ {role.name.split(" ")[0]} 👋</h1>
          <div className="page-meta">
            วันนี้ {window.CMS.fmtThaiDate(window.CMS.TODAY)} · <b>หน้าจอหัวหน้ากลุ่ม คบส.</b> · แสดงเฉพาะเคสที่เจ้าหน้าที่ส่งเข้ามา
          </div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            <select className="select" style={{ width: 140 }} value={period} onChange={(e)=> setPeriod(e.target.value)}>
              <option value="7">7 วันล่าสุด</option>
              <option value="30">30 วันล่าสุด</option>
              <option value="90">90 วันล่าสุด</option>
              <option value="365">ปีนี้</option>
            </select>
            <button className="btn btn-outline" onClick={()=> setRoute({ name: "reports" })}>
              <Icon name="chart" size={16}/> Dashboard เต็ม
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: "4px solid var(--accent-600)" }}>
          <div className="kpi-label"><Icon name="hand" size={14}/> รอขออนุมัติ & มอบหมาย</div>
          <div className="kpi-value">{queueLive.length}</div>
          <div className="kpi-trend"><Icon name="inbox" size={14}/> ต้องดำเนินการภายใน 3 วัน</div>
          <div className="kpi-icon" style={{ background: "var(--accent-100)", color: "var(--accent-700)" }}><Icon name="approve" size={18}/></div>
        </div>
        <div className="kpi-card warn">
          <div className="kpi-label"><Icon name="clock" size={14}/> เกินเวลา (ทุก stage)</div>
          <div className="kpi-value">{overdueAll}</div>
          <div className="kpi-trend"><Icon name="alert" size={14}/> ใน {inProgress} เคสที่ active</div>
          <div className="kpi-icon"><Icon name="clock" size={18}/></div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-label"><Icon name="lock" size={14}/> เคสที่ถูกล็อก</div>
          <div className="kpi-value">{lockedAll}</div>
          <div className="kpi-trend down"><Icon name="ban" size={14}/> ห้ามแก้ไข/อัปเดต</div>
          <div className="kpi-icon"><Icon name="lock" size={18}/></div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label"><Icon name="check-circle" size={14}/> % เคส on-time</div>
          <div className="kpi-value">{onTimePct}%</div>
          <div className="kpi-trend up"><Icon name="trend-up" size={14}/> เป้า ≥ 90%</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18}/></div>
        </div>
      </div>

      {/* Approval Queue */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="hand" size={18} style={{ color: "var(--accent-700)" }}/>
              คิวขออนุมัติและมอบหมาย
              <span className="chip accent" style={{ fontSize: 11 }}>{queue.length} เคส</span>
            </h3>
            <div className="card-sub">เคสที่เจ้าหน้าที่ส่งเข้ามาเพื่อขออนุมัติ — กรุณามอบหมายภายใน 3 วันจากวันลงรับ POST</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={()=> setRoute({ name: "case-list", q: "" })}>
            ดูเคสทั้งหมด <Icon name="arrow-right" size={14}/>
          </button>
        </div>
        <div className="card-body" style={{ display: "grid", gap: 12 }}>
          {queue.length === 0 ? (
            <div className="table-empty" style={{ padding: "32px 16px" }}>
              <div className="empty-icon" style={{ background: "var(--success-100)", color: "var(--success-700)" }}>
                <Icon name="check-circle" size={24}/>
              </div>
              <div style={{ fontWeight: 600 }}>คิวว่าง — เจ้าหน้าที่ไม่มีรายการรอขออนุมัติ</div>
              <div className="small muted">เคสจะปรากฏที่นี่เมื่อเจ้าหน้าที่ส่งเข้ามา</div>
            </div>
          ) : queue.map(c => {
            const locked = window.CMS.isCaseLocked(c);
            const lockInfo = window.CMS.lockReason(c);
            const sla = window.CMS.caseSla(c);
            return (
              <div key={c.id} className={`approval-card ${locked ? "is-locked" : ""}`}>
                <div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span className="ap-tracking">{c.etracking}</span>
                    <StatusBadge code={c.status} size="sm"/>
                    {locked
                      ? <span className="lock-pill"><Icon name="lock" size={10}/> ล็อก — เกิน SLA</span>
                      : <SLABadge sla={sla}/>}
                    {c.bountyAmount && <span className="chip accent" style={{ fontSize: 10.5 }}>💰 สินบนนำจับ</span>}
                  </div>
                  <div className="ap-title">{c.title}</div>
                  <div className="ap-meta">
                    <span><Icon name="package" size={12}/> <b>{c.respondent.business || c.respondent.licensee || "—"}</b> · {c.respondent.district}</span>
                    <span><Icon name="shield" size={12}/> {c.laws.map(l => window.CMS.lawLabel(l)).join(", ")}</span>
                    <span><Icon name="phone" size={12}/> {c.complainant.channel}</span>
                  </div>
                  <div className="ap-sub-by" style={{ marginTop: 8 }}>
                    <Icon name="user" size={11}/>
                    เจ้าหน้าที่ส่งเมื่อ <b style={{ color: "var(--text)" }}>{window.CMS.fmtThaiDate(c.createdAt)}</b>
                    <span style={{ color: "var(--text-muted)" }}>·</span>
                    ลงรับ POST <b style={{ color: "var(--text)" }}>{window.CMS.fmtThaiDate(c.postDate)}</b>
                  </div>
                  {locked && lockInfo && (
                    <div className="small" style={{ marginTop: 8, padding: "6px 10px", borderRadius: 6, background: "var(--error-100)", color: "var(--error-700)", display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <Icon name="lock" size={12}/> {lockInfo.stage} — {lockInfo.detail}. ห้ามแก้ไข/มอบหมาย
                    </div>
                  )}
                </div>
                <div className="ap-actions">
                  <button className="btn btn-ghost btn-sm" onClick={()=> setRoute({ name: "case-detail", id: c.id })}>
                    <Icon name="eye" size={14}/> ดูรายละเอียด
                  </button>
                  {locked ? (
                    <button className="btn btn-outline btn-sm" disabled style={{ opacity: 0.6 }}>
                      <Icon name="lock" size={14}/> ล็อก
                    </button>
                  ) : (
                    <button className="btn btn-accent" onClick={()=> setQuickAssignFor(c.id)}>
                      <Icon name="approve" size={14}/> อนุมัติ & มอบหมาย
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts row */}
      <div className="head-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h3>ภาระงานเจ้าหน้าที่</h3>
              <div className="card-sub">เคส active ต่อคน · มอบเคสใหม่ให้ผู้ที่ภาระน้อย</div>
            </div>
          </div>
          <div className="card-body">
            <div className="stack-sm">
              {officerLoad.map(o => (
                <div key={o.id} style={{ display: "grid", gridTemplateColumns: "160px 1fr 80px", gap: 12, alignItems: "center" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Avatar name={o.name} size="sm"/>
                    <span style={{ fontSize: 12.5 }}>{o.name.replace(/^(นาย|นาง|นางสาว)/, "")}</span>
                  </div>
                  <div style={{ display: "flex", height: 22, borderRadius: 6, overflow: "hidden", background: "var(--surface-2)" }}>
                    <div style={{
                      width: `${(o.count / maxLoad) * 100}%`,
                      background: o.locked > 0 ? "var(--error-700)" : (o.count > maxLoad * 0.7 ? "var(--warning-700)" : "var(--primary-700)"),
                      display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8,
                      color: "#fff", fontSize: 11, fontWeight: 600,
                    }}>
                      {o.count > 0 && o.count}
                    </div>
                  </div>
                  <div className="row small" style={{ justifyContent: "flex-end", gap: 6 }}>
                    {o.locked > 0 && <span className="lock-pill"><Icon name="lock" size={10}/> {o.locked}</span>}
                    <span className="muted">{o.count} เคส</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3>เคสตามสถานะ</h3>
              <div className="card-sub">เฉพาะเคสที่เจ้าหน้าที่ส่งเข้ามา · {total} เคส</div>
            </div>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              {statusCounts.map(s => {
                const h = Math.max(8, (s.count / maxStatus) * 100);
                return (
                  <div key={s.code} className="bar" style={{ height: `${h}%`, background: `var(--st-${s.code}-fg)` }} title={`${s.label}: ${s.count}`}>
                    {s.count > 0 && <div className="bar-value">{s.count}</div>}
                  </div>
                );
              })}
            </div>
            <div className="bar-chart-x">
              {statusCounts.map(s => <span key={s.code}>{s.code}</span>)}
            </div>
            <div className="hr"/>
            <div className="tag-list">
              {statusCounts.map(s => <StatusBadge key={s.code} code={s.code} size="md"/>)}
            </div>
          </div>
        </div>
      </div>

      {quickAssignFor && (
        <window.AssignModal
          c={cases.find(x => x.id === quickAssignFor)}
          onClose={()=> setQuickAssignFor(null)}
          onSave={(ids, note) => {
            const c = cases.find(x => x.id === quickAssignFor);
            if (window.CMS.isCaseLocked(c)) {
              toast.push({ kind: "danger", title: "เคสถูกล็อก", msg: "เกิน SLA — ไม่สามารถมอบหมายได้" });
              setQuickAssignFor(null); return;
            }
            actions.updateCase(c.id, prev => ({
              ...prev,
              assignees: ids,
              assignedAt: window.CMS.TODAY,
              assignedBy: role.id,
              status: "02",
              timeline: [...prev.timeline, {
                date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
                title: `อนุมัติและมอบหมายให้ ${ids.length} เจ้าหน้าที่${note ? ` — ${note}` : ""}`,
                user: role.name, kind: "assign", status: "in-time",
              }]
            }));
            setQuickAssignFor(null);
            toast.push({ kind: "success", title: "อนุมัติและมอบหมายสำเร็จ", msg: "เจ้าหน้าที่ได้รับ notification แล้ว" });
          }}
        />
      )}
    </main>
  );
};

// ============== OFFICER / ADMIN / EXEC — original dashboard ==============
const OfficerDashboard = () => {
  const { state, setRoute, role } = useApp();
  const cases = state.cases;
  const [period, setPeriod] = React.useState("30");
  const [lawFilter, setLawFilter] = React.useState([]);

  // KPIs
  const totalCases = cases.length;
  const inProgress = cases.filter(c => !["05","06","07","08"].includes(c.status)).length;
  const nearCases  = cases.filter(c => {
    if (["05","06","07","08"].includes(c.status)) return false;
    const sla = window.CMS.caseSla(c);
    return sla.kind === "near";
  }).length;
  const overdueCases = cases.filter(c => {
    if (["05","06","07","08"].includes(c.status)) return false;
    const sla = window.CMS.caseSla(c);
    return sla.kind === "overdue";
  }).length;

  // status counts for bar chart
  const statusCounts = Object.keys(window.CMS.STATUS).map(code => ({
    code, count: cases.filter(c => c.status === code).length,
    label: window.CMS.STATUS[code].label,
  }));
  const maxStatus = Math.max(1, ...statusCounts.map(s => s.count));

  // law counts for donut
  const lawCounts = window.CMS.MASTER.laws.map(l => ({
    id: l.id, label: l.label,
    count: cases.filter(c => c.laws && c.laws.includes(l.id)).length,
  })).filter(l => l.count > 0).sort((a,b) => b.count - a.count);

  // recent cases (10)
  const recent = [...cases].sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 10);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>สวัสดีครับ {role.name.split(" ")[0]} 👋</h1>
          <div className="page-meta">วันนี้ {window.CMS.fmtThaiDate(window.CMS.TODAY)} · {role.role}</div>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8 }}>
            <select className="select" style={{ width: 140 }} value={period} onChange={(e)=> setPeriod(e.target.value)}>
              <option value="7">7 วันล่าสุด</option>
              <option value="30">30 วันล่าสุด</option>
              <option value="90">90 วันล่าสุด</option>
              <option value="365">ปีนี้</option>
            </select>
            <button className="btn btn-outline" onClick={()=> setRoute({ name: "reports" })}>
              <Icon name="chart" size={16}/> ดู Dashboard เต็ม
            </button>
            <button className="btn btn-primary" onClick={()=> setRoute({ name: "case-new" })}>
              <Icon name="plus" size={16}/> สร้างเคสใหม่
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">เคสทั้งหมด</div>
          <div className="kpi-value">{totalCases}</div>
          <div className="kpi-trend up"><Icon name="trend-up" size={14}/> +12% จากเดือนก่อน</div>
          <div className="kpi-icon"><Icon name="inbox" size={18}/></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">กำลังดำเนินการ</div>
          <div className="kpi-value">{inProgress}</div>
          <div className="kpi-trend"><Icon name="circle" size={10}/> รวม draft + active</div>
          <div className="kpi-icon"><Icon name="loupe" size={18}/></div>
        </div>
        <div className="kpi-card warn">
          <div className="kpi-label">ใกล้ครบ SLA (≤ 3 วัน)</div>
          <div className="kpi-value">{nearCases}</div>
          <div className="kpi-trend"><Icon name="clock" size={14}/> ต้องเร่งดำเนินการ</div>
          <div className="kpi-icon"><Icon name="clock" size={18}/></div>
        </div>
        <div className="kpi-card danger">
          <div className="kpi-label">เกินเวลา</div>
          <div className="kpi-value">{overdueCases}</div>
          <div className="kpi-trend down"><Icon name="alert" size={14}/> ต้องตรวจสอบเหตุผล</div>
          <div className="kpi-icon"><Icon name="alert" size={18}/></div>
        </div>
      </div>

      {/* Charts */}
      <div className="section-row" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <h3>เคสตามสถานะ</h3>
              <div className="card-sub">8 สถานะ · {totalCases} เคส</div>
            </div>
            <button className="btn btn-ghost btn-sm">รายละเอียด <Icon name="chevron-right" size={14}/></button>
          </div>
          <div className="card-body">
            <div className="bar-chart">
              {statusCounts.map((s, i) => {
                const h = Math.max(8, (s.count / maxStatus) * 100);
                const color = `var(--st-${s.code}-fg)`;
                return (
                  <div key={s.code} className="bar" style={{ height: `${h}%`, background: color }} title={`${s.label}: ${s.count}`}>
                    {s.count > 0 && <div className="bar-value">{s.count}</div>}
                  </div>
                );
              })}
            </div>
            <div className="bar-chart-x">
              {statusCounts.map(s => <span key={s.code}>{s.code}</span>)}
            </div>
            <div className="hr"/>
            <div className="tag-list">
              {statusCounts.map(s => <StatusBadge key={s.code} code={s.code} size="md"/>)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>เคสตามพรบ.</h3>
            <span className="muted small">{lawCounts.length} หมวด</span>
          </div>
          <div className="card-body">
            <Donut data={lawCounts}/>
          </div>
        </div>
      </div>

      {/* Recent cases table */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h3>เคสล่าสุด</h3>
            <div className="card-sub">10 รายการล่าสุดในระบบ</div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={()=> setRoute({ name: "case-list" })}>
            ดูทั้งหมด <Icon name="arrow-right" size={14}/>
          </button>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>E-tracking</th>
                <th>ชื่อเคส</th>
                <th>ผู้ถูกร้อง</th>
                <th>พรบ.</th>
                <th>ผู้รับผิดชอบ</th>
                <th>สถานะ</th>
                <th>SLA</th>
                <th>วันที่</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(c => (
                <tr key={c.id} onClick={()=> setRoute({ name: "case-detail", id: c.id })}>
                  <td className="num">{c.etracking}</td>
                  <td style={{ fontWeight: 500, maxWidth: 260, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.title}</td>
                  <td>{c.respondent.business || c.respondent.licensee || "—"}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

// Donut chart (CSS+SVG)
const COLORS = ["#1F4E79", "#2E74B5", "#E65100", "#2E7D32", "#6b3fa0", "#0e7c8a", "#F57F17", "#C62828", "#4a8fcc"];
const Donut = ({ data, size = 160 }) => {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eef0f4" strokeWidth="20"/>
        {data.map((d, i) => {
          const frac = d.count / total;
          const dash = frac * c;
          const el = (
            <circle key={d.id} cx={size/2} cy={size/2} r={r} fill="none"
              stroke={COLORS[i % COLORS.length]} strokeWidth="20"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-off}
              transform={`rotate(-90 ${size/2} ${size/2})`}/>
          );
          off += dash;
          return el;
        })}
        <text x={size/2} y={size/2 - 4} textAnchor="middle" style={{ fontSize: 22, fontWeight: 700, fill: "var(--text)" }}>{total}</text>
        <text x={size/2} y={size/2 + 14} textAnchor="middle" style={{ fontSize: 11, fill: "var(--text-muted)" }}>เคส</text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div key={d.id} className="legend-row">
            <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }}/>
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">{d.count}</span>
          </div>
        ))}
        {data.length === 0 && <div className="muted small">ไม่มีข้อมูล</div>}
      </div>
    </div>
  );
};

Object.assign(window, { DashboardScreen, HeadDashboard, OfficerDashboard, Donut });

// Sparkline component
const Sparkline = ({ data = [], color = "var(--primary-600)" }) => {
  const w = 200, h = 36;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  const gradId = "sg-" + Math.random().toString(36).slice(2, 7);
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5"/>
    </svg>
  );
};
Object.assign(window, { Sparkline });
