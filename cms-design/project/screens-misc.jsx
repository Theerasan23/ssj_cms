/* =========================================================
   CMS — S10 Reports/KPI, Committee, Fines, Admin, Public Track
   ========================================================= */

// ========================= REPORTS / KPI =========================
const ReportsScreen = () => {
  const { state } = useApp();
  const cases = state.cases;
  const [period, setPeriod] = React.useState("90");

  const totalCases = cases.length;
  const closedCases = cases.filter(c => ["05","06","07","08"].includes(c.status)).length;
  const onTime = cases.filter(c => {
    const sla = window.CMS.caseSla(c);
    return sla.kind === "in-time" || sla.kind === "far" || ["05","06","07","08"].includes(c.status);
  }).length;
  const onTimePct = totalCases ? Math.round((onTime / totalCases) * 100) : 0;
  const avgDays = 28;

  // by month (last 12)
  const months = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const monthlyData = months.map((m, i) => ({ label: m, count: Math.max(2, Math.round(Math.random() * 14) + (i === 4 ? 8 : 0)) }));
  const maxMonth = Math.max(...monthlyData.map(d => d.count));

  // by law
  const lawData = window.CMS.MASTER.laws.map(l => ({
    id: l.id, label: l.label,
    count: cases.filter(c => c.laws && c.laws.includes(l.id)).length,
  })).filter(l => l.count > 0);

  // heatmap (stage x month, last 12)
  const stages = ["มอบหมาย", "ตรวจสอบ", "กรรมการ", "ค่าปรับ"];
  const heat = stages.map(() => Array.from({ length: 12 }, (_, i) => Math.round(Math.random() * 6)));

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>รายงาน · KPI Dashboard</h1>
          <div className="page-meta">ภาพรวมการดำเนินงานและตัวชี้วัด</div>
        </div>
        <div className="page-actions">
          <select className="select" style={{ width: 160 }} value={period} onChange={(e)=> setPeriod(e.target.value)}>
            <option value="30">30 วันล่าสุด</option>
            <option value="90">90 วันล่าสุด</option>
            <option value="180">6 เดือนล่าสุด</option>
            <option value="365">12 เดือนล่าสุด</option>
          </select>
          <button className="btn btn-outline"><Icon name="download" size={16}/> Export Excel</button>
          <button className="btn btn-outline"><Icon name="printer" size={16}/> พิมพ์รายงาน</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card success">
          <div className="kpi-label">เคสรวมในระบบ</div>
          <div className="kpi-value">{totalCases}</div>
          <div className="kpi-trend up"><Icon name="trend-up" size={14}/> +18% YoY</div>
          <div className="kpi-icon"><Icon name="inbox" size={18}/></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เคสปิดแล้ว</div>
          <div className="kpi-value">{closedCases}</div>
          <div className="kpi-trend"><Icon name="check-circle" size={14}/> ปิด {totalCases ? Math.round(closedCases/totalCases*100) : 0}% ของทั้งหมด</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18}/></div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label">% เคส on-time</div>
          <div className="kpi-value">{onTimePct}%</div>
          <div className="kpi-trend up"><Icon name="trend-up" size={14}/> เป้า ≥ 90%</div>
          <div className="kpi-icon"><Icon name="clock" size={18}/></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เวลาเฉลี่ยต่อเคส</div>
          <div className="kpi-value">{avgDays}<span style={{fontSize:14, fontWeight:400, color:"var(--text-muted)"}}> วัน</span></div>
          <div className="kpi-trend down"><Icon name="trend-down" size={14}/> ลดลง 4 วัน vs ปีที่แล้ว</div>
          <div className="kpi-icon"><Icon name="history" size={18}/></div>
        </div>
      </div>

      <div className="section-row" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-header">
            <h3>เคสตามเดือน (12 เดือนล่าสุด)</h3>
            <span className="muted small">จำนวนเคส</span>
          </div>
          <div className="card-body">
            <div className="bar-chart" style={{ height: 240 }}>
              {monthlyData.map((d, i) => (
                <div key={i} className="bar" style={{ height: `${(d.count/maxMonth)*100}%`, background: i === 4 ? "var(--accent-600)" : "var(--primary-600)" }}>
                  <div className="bar-value">{d.count}</div>
                </div>
              ))}
            </div>
            <div className="bar-chart-x">{monthlyData.map((d, i) => <span key={i}>{d.label}</span>)}</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>เคสตามพรบ.</h3>
          </div>
          <div className="card-body">
            <Donut data={lawData}/>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>เคสเกินเวลาตามขั้น × เดือน (Heatmap)</h3>
          <span className="muted small">เข้มกว่า = เกินเวลามากกว่า</span>
        </div>
        <div className="card-body">
          <div className="heatmap-grid">
            <div></div>
            {months.map((m, i) => <div key={i} className="h-label" style={{ textAlign:"center" }}>{m}</div>)}
            {stages.map((s, i) => (
              <React.Fragment key={i}>
                <div className="h-label">{s}</div>
                {heat[i].map((v, j) => (
                  <div key={j} className="h-cell" style={{
                    background: v === 0 ? "var(--surface-2)" :
                                `oklch(${95 - v*6}% ${0.05 + v*0.025} 30)`,
                    color: v > 3 ? "#fff" : "var(--primary-900)"
                  }} title={`${s} - ${months[j]}: ${v}`}>
                    {v || ""}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>เคสตามสถานะ + กลุ่มเจ้าหน้าที่</h3>
        </div>
        <div className="card-body">
          <div className="stack">
            {window.CMS.MASTER.officers.slice(0, 5).map(o => {
              const myCases = cases.filter(c => c.assignees.includes(o.id));
              const total = myCases.length || 1;
              const segs = ["02","03","04","05"].map(code => ({
                code, count: myCases.filter(c => c.status === code).length,
              }));
              return (
                <div key={o.id} style={{ display: "grid", gridTemplateColumns: "180px 1fr 60px", gap: 12, alignItems: "center" }}>
                  <div className="row" style={{ gap: 8 }}>
                    <Avatar name={o.name} size="sm"/>
                    <span style={{ fontSize: 12.5 }}>{o.name.replace(/^(นาย|นาง|นางสาว)/, "")}</span>
                  </div>
                  <div style={{ display:"flex", height: 22, borderRadius: 6, overflow:"hidden", background:"var(--surface-2)" }}>
                    {segs.map(s => s.count > 0 && (
                      <div key={s.code} style={{ flex: s.count, background: `var(--st-${s.code}-fg)` }} title={`${window.CMS.STATUS[s.code].label}: ${s.count}`}/>
                    ))}
                  </div>
                  <div className="num small" style={{ textAlign:"right", fontWeight: 600 }}>{myCases.length} เคส</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

// ========================= COMMITTEE =========================
const CommitteeScreen = () => {
  const { state, setRoute } = useApp();
  const [tab, setTab] = React.useState("pending");
  const pending = state.cases.filter(c => c.status === "03");
  const history = state.cases.filter(c => c.board && c.board.resolution);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>คณะกรรมการ</h1>
          <div className="page-meta">เคสที่รอเข้าประชุม · ประวัติมติคณะกรรมการ</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: "pending", label: "รอเข้าประชุม", icon: "calendar", count: pending.length },
            { value: "history", label: "ประวัติมติ",   icon: "history",  count: history.length },
          ]}/>
        </div>
        <div className="table-wrap">
          <table className="data">
            {tab === "pending" ? (
              <>
                <thead>
                  <tr>
                    <th>E-tracking</th><th>ชื่อเคส</th><th>พรบ.</th><th>คณะกรรมการที่เหมาะสม</th><th>SLA</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map(c => (
                    <tr key={c.id} onClick={()=> setRoute({ name: "case-detail", id: c.id })}>
                      <td className="num">{c.etracking}</td>
                      <td style={{ fontWeight: 500 }}>{c.title}</td>
                      <td><div className="tag-list">{c.laws.map(l => <span key={l} className="chip">{window.CMS.lawLabel(l)}</span>)}</div></td>
                      <td>{c.board ? c.board.committees.join(", ") : <span className="chip">คณะกรรมการพิจารณาคดี</span>}</td>
                      <td><SLABadge sla={window.CMS.caseSla(c)}/></td>
                      <td><button className="btn btn-primary btn-sm">บันทึกมติ <Icon name="arrow-right" size={12}/></button></td>
                    </tr>
                  ))}
                  {pending.length === 0 && <tr><td colSpan="6"><div className="table-empty"><div className="empty-icon"><Icon name="calendar" size={24}/></div>ยังไม่มีเคสรอเข้าประชุม</div></td></tr>}
                </tbody>
              </>
            ) : (
              <>
                <thead>
                  <tr>
                    <th>E-tracking</th><th>ชื่อเคส</th><th>ครั้งที่ประชุม</th><th>วันที่ประชุม</th><th>มติ</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(c => (
                    <tr key={c.id} onClick={()=> setRoute({ name: "case-detail", id: c.id })}>
                      <td className="num">{c.etracking}</td>
                      <td style={{ fontWeight: 500 }}>{c.title}</td>
                      <td className="num">{c.board.meetingNo}/{c.board.year}</td>
                      <td>{window.CMS.fmtThaiDate(c.board.meetingDate)}</td>
                      <td><span className="chip accent">{c.board.resolution}</span></td>
                      <td><Icon name="chevron-right" size={16} style={{ color: "var(--text-muted)" }}/></td>
                    </tr>
                  ))}
                  {history.length === 0 && <tr><td colSpan="6"><div className="table-empty"><div className="empty-icon"><Icon name="history" size={24}/></div>ยังไม่มีประวัติมติ</div></td></tr>}
                </tbody>
              </>
            )}
          </table>
        </div>
      </div>
    </main>
  );
};

// ========================= FINES =========================
const FinesScreen = () => {
  const { state, setRoute } = useApp();
  const [tab, setTab] = React.useState("unpaid");

  const allFines = [];
  state.cases.forEach(c => {
    (c.fines || []).forEach((f, i) => allFines.push({ ...f, c, idx: i }));
  });
  const unpaid = allFines.filter(f => !f.paid);
  const paid = allFines.filter(f => f.paid);
  const totalUnpaid = unpaid.reduce((s, f) => s + f.amount, 0);
  const totalPaid = paid.reduce((s, f) => s + f.amount, 0);

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>ค่าปรับ</h1>
          <div className="page-meta">ติดตามการเปรียบเทียบปรับ · ประวัติการชำระ</div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card warn">
          <div className="kpi-label">ค่าปรับค้างจ่าย</div>
          <div className="kpi-value">{window.CMS.fmtMoney(totalUnpaid).replace(" บาท","")}</div>
          <div className="kpi-trend"><Icon name="coin" size={14}/> {unpaid.length} รายการ</div>
          <div className="kpi-icon"><Icon name="coin" size={18}/></div>
        </div>
        <div className="kpi-card success">
          <div className="kpi-label">ชำระแล้วในปีนี้</div>
          <div className="kpi-value">{window.CMS.fmtMoney(totalPaid).replace(" บาท","")}</div>
          <div className="kpi-trend up"><Icon name="check-circle" size={14}/> {paid.length} รายการ</div>
          <div className="kpi-icon"><Icon name="check-circle" size={18}/></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เคสที่อยู่ในขั้นเปรียบเทียบ</div>
          <div className="kpi-value">{state.cases.filter(c => c.status === "04").length}</div>
          <div className="kpi-trend"><Icon name="money" size={14}/> รออัปเดต</div>
          <div className="kpi-icon"><Icon name="money" size={18}/></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">เคสค้างจ่าย ≥ 30 วัน</div>
          <div className="kpi-value">2</div>
          <div className="kpi-trend down"><Icon name="alert" size={14}/> ต้องติดตาม</div>
          <div className="kpi-icon"><Icon name="alert" size={18}/></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header" style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: "unpaid", label: "ค้างชำระ", icon: "coin", count: unpaid.length },
            { value: "paid",   label: "ชำระแล้ว", icon: "check-circle", count: paid.length },
          ]}/>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>E-tracking</th><th>เคส</th><th>มาตรา</th><th>ครั้งที่</th><th>จำนวนเงิน</th><th>วันที่</th><th></th></tr>
            </thead>
            <tbody>
              {(tab === "unpaid" ? unpaid : paid).map((f, i) => {
                const sec = window.CMS.sectionById(f.secId);
                return (
                  <tr key={i} onClick={()=> setRoute({ name:"case-detail", id: f.c.id })}>
                    <td className="num">{f.c.etracking}</td>
                    <td style={{ fontWeight: 500 }}>{f.c.title}</td>
                    <td>{sec?.text}</td>
                    <td className="num">{f.count}</td>
                    <td className="num"><strong>{window.CMS.fmtMoney(f.amount)}</strong></td>
                    <td className="muted small">{f.paid ? window.CMS.fmtThaiDateShort(f.paidDate) : "—"}</td>
                    <td>{f.paid ? <span className="status-badge s05"><Icon name="check" size={12}/></span> : <button className="btn btn-accent btn-sm">บันทึกชำระ</button>}</td>
                  </tr>
                );
              })}
              {(tab === "unpaid" ? unpaid : paid).length === 0 && (
                <tr><td colSpan="7"><div className="table-empty"><div className="empty-icon"><Icon name="coin" size={24}/></div>ไม่มีรายการ</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

// ========================= ADMIN =========================
const AdminScreen = () => {
  const [section, setSection] = React.useState("channels");
  const { actions } = useApp();
  const toast = useToasts();

  const sections = [
    { key: "channels",   label: "ช่องทางการร้องเรียน", icon: "phone" },
    { key: "laws",       label: "พรบ.",                  icon: "shield" },
    { key: "sources",    label: "ที่มาของผู้ร้อง",       icon: "tag" },
    { key: "problems",   label: "ประเภทปัญหา",          icon: "alert" },
    { key: "officers",   label: "พนักงานเจ้าหน้าที่",   icon: "users" },
    { key: "sections",   label: "มาตรา + ค่าปรับ",      icon: "gavel" },
    { key: "committees", label: "คณะกรรมการ",          icon: "users" },
    { key: "users",      label: "ผู้ใช้และสิทธิ์",       icon: "user" },
    { key: "audit",      label: "Audit Log",            icon: "history" },
  ];

  const renderTable = () => {
    if (section === "channels") return <SimpleList items={window.CMS.MASTER.channels}/>;
    if (section === "laws") return <SimpleList items={window.CMS.MASTER.laws.map(l => l.label)}/>;
    if (section === "sources") return <SimpleList items={window.CMS.MASTER.sources}/>;
    if (section === "problems") return <SimpleList items={window.CMS.MASTER.problems}/>;
    if (section === "officers") return <OfficerList/>;
    if (section === "sections") return <SectionsList/>;
    if (section === "committees") return <SimpleList items={window.CMS.MASTER.committees}/>;
    if (section === "users") return <UserList/>;
    if (section === "audit") return <AuditLog/>;
    return null;
  };

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div>
          <h1>ตั้งค่าระบบ</h1>
          <div className="page-meta">Master Data · ผู้ใช้และสิทธิ์ · Audit Log</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={()=> { actions.resetData(); toast.push({ kind: "success", title: "รีเซ็ตข้อมูลตัวอย่างสำเร็จ" }); }}>
            <Icon name="history" size={16}/> รีเซ็ตข้อมูลตัวอย่าง
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        <div className="card" style={{ alignSelf: "start", position: "sticky", top: 84 }}>
          <div className="card-body" style={{ padding: 8 }}>
            {sections.map(s => (
              <button key={s.key} className={`nav-item ${section === s.key ? "active" : ""}`} onClick={()=> setSection(s.key)}>
                <Icon className="nav-icon" name={s.icon}/>
                <span className="nav-label">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>{sections.find(s => s.key === section)?.label}</h3>
            <button className="btn btn-primary btn-sm"><Icon name="plus" size={14}/> เพิ่มใหม่</button>
          </div>
          {renderTable()}
        </div>
      </div>
    </main>
  );
};

const SimpleList = ({ items }) => (
  <div className="table-wrap">
    <table className="data">
      <thead><tr><th style={{width: 60}}>#</th><th>ชื่อ</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} style={{cursor:"default"}}>
            <td className="num">{i+1}</td>
            <td>{it}</td>
            <td><span className="status-badge s05"><Icon name="check" size={12} stroke={2}/>Active</span></td>
            <td className="actions-cell">
              <button className="btn btn-ghost btn-sm"><Icon name="edit" size={14}/></button>
              <button className="btn btn-ghost btn-sm"><Icon name="trash" size={14}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const OfficerList = () => (
  <div className="table-wrap">
    <table className="data">
      <thead><tr><th>ชื่อ</th><th>ตำแหน่ง</th><th>โทร</th><th>email</th><th>สถานะ</th><th></th></tr></thead>
      <tbody>
        {window.CMS.MASTER.officers.map((o, i) => (
          <tr key={o.id} style={{cursor:"default"}}>
            <td><div className="row"><Avatar name={o.name} size="sm"/><span style={{fontWeight:500}}>{o.name}</span></div></td>
            <td>พนักงานเจ้าหน้าที่</td>
            <td className="mono">081-xxx-{1000+i*111}</td>
            <td className="mono small">{o.name.split(" ")[0]}@nbthealth.go.th</td>
            <td><span className="status-badge s05"><Icon name="check" size={12} stroke={2}/>Active</span></td>
            <td className="actions-cell">
              <button className="btn btn-ghost btn-sm"><Icon name="edit" size={14}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const SectionsList = () => (
  <div className="table-wrap">
    <table className="data">
      <thead><tr><th>มาตรา</th><th>พรบ.</th><th>ครั้งที่ 1</th><th>ครั้งที่ 2</th><th>ครั้งที่ 3</th><th></th></tr></thead>
      <tbody>
        {window.CMS.MASTER.sections.map(s => (
          <tr key={s.id} style={{cursor:"default"}}>
            <td style={{maxWidth: 300}}>{s.text}</td>
            <td><span className="chip">{window.CMS.lawLabel(s.law)}</span></td>
            <td className="num">{window.CMS.fmtMoney(s.fines[0])}</td>
            <td className="num">{window.CMS.fmtMoney(s.fines[1])}</td>
            <td className="num">{window.CMS.fmtMoney(s.fines[2])}</td>
            <td className="actions-cell">
              <button className="btn btn-ghost btn-sm"><Icon name="edit" size={14}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const UserList = () => (
  <div className="table-wrap">
    <table className="data">
      <thead><tr><th>ชื่อ</th><th>Username</th><th>บทบาท</th><th>เข้าระบบล่าสุด</th><th></th></tr></thead>
      <tbody>
        {window.CMS.MASTER.roles.map((r, i) => (
          <tr key={r.id} style={{cursor:"default"}}>
            <td><div className="row"><Avatar name={r.name} size="sm"/><span style={{fontWeight:500}}>{r.name}</span></div></td>
            <td className="mono small">{r.id}@nbthealth.go.th</td>
            <td><span className="chip primary">{r.role}</span></td>
            <td className="muted small">วันนี้ 09:0{i+1}</td>
            <td className="actions-cell">
              <button className="btn btn-ghost btn-sm"><Icon name="edit" size={14}/></button>
              <button className="btn btn-ghost btn-sm"><Icon name="shield" size={14}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const AuditLog = () => {
  const logs = [
    { who: "นางณัฐสิรี เปี้ยปลูก", what: "สร้างเคส", target: "ECP-2569-00131", when: "วันนี้ 16:00" },
    { who: "อรุณ สุขสวัสดิ์",       what: "มอบหมายเคส",  target: "ECP-2569-00130", when: "เมื่อวาน 09:30" },
    { who: "ปวีณา จันทกานต์",      what: "แก้ไข master data", target: "เพิ่มประเภทปัญหา", when: "2 วันก่อน" },
    { who: "นางณัฐสิรี เปี้ยปลูก", what: "บันทึกมติ",   target: "ECP-2569-00125", when: "3 วันก่อน" },
    { who: "นพ.สมชาย วงศ์ไพศาล",  what: "Login", target: "—", when: "3 วันก่อน" },
  ];
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>เป้าหมาย</th></tr></thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i} style={{cursor:"default"}}>
              <td className="muted small">{l.when}</td>
              <td><div className="row"><Avatar name={l.who} size="sm"/><span>{l.who}</span></div></td>
              <td><span className="chip">{l.what}</span></td>
              <td className="mono">{l.target}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ========================= PUBLIC TRACK =========================
const PublicTrackScreen = () => {
  const { state, actions } = useApp();
  const [q, setQ] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [searched, setSearched] = React.useState(false);

  function search() {
    const c = state.cases.find(x => x.etracking.toLowerCase() === q.trim().toLowerCase());
    setResult(c || null);
    setSearched(true);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      <header style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <Logo />
        <div style={{ flex: 1 }}/>
        <button className="btn btn-ghost btn-sm" onClick={()=> actions.logout()}>
          <Icon name="user" size={14}/> เข้าสู่ระบบ
        </button>
      </header>

      <div style={{ flex: 1, padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 600, width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>ติดตามสถานะเรื่องร้องเรียน</h1>
            <p className="muted" style={{ fontSize: 15 }}>กรอกเลข E-tracking ที่ได้รับเพื่อตรวจสอบสถานะปัจจุบัน</p>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="field">
              <label>เลข E-tracking</label>
              <div className="row">
                <input className="input mono" style={{ flex: 1, height: 48, fontSize: 16 }}
                  placeholder="เช่น ECP-2569-00123" value={q}
                  onChange={(e)=> setQ(e.target.value)}
                  onKeyDown={(e)=> e.key === "Enter" && search()}/>
                <button className="btn btn-primary btn-lg" onClick={search}>
                  <Icon name="search" size={16}/> ค้นหา
                </button>
              </div>
              <span className="hint">ตัวอย่าง: ECP-2569-00123, ECP-2569-00125</span>
            </div>
          </div>

          {searched && result && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-body">
                <div className="row between" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="small muted">E-tracking</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{result.etracking}</div>
                  </div>
                  <StatusBadge code={result.status} size="lg"/>
                </div>
                <div className="hr"/>
                <div className="kv">
                  <div className="k">วันที่ลงรับ</div><div className="v">{window.CMS.fmtThaiDate(result.postDate)}</div>
                  <div className="k">หมวด พรบ.</div><div className="v"><div className="tag-list">{result.laws.map(l => <span key={l} className="chip primary">{window.CMS.lawLabel(l)}</span>)}</div></div>
                  <div className="k">ขั้นปัจจุบัน</div><div className="v">{window.CMS.STATUS[result.status].label}</div>
                  <div className="k">อัปเดตล่าสุด</div><div className="v">{window.CMS.fmtThaiDate(result.timeline[result.timeline.length-1].date)}</div>
                </div>
                <div className="hr"/>
                <div className="small muted" style={{ fontWeight: 600, marginBottom: 8, color: "var(--text)" }}>ความคืบหน้า</div>
                <SLATimelineHorizontal c={result}/>
                <div style={{ marginTop: 16, padding: 12, background: "var(--surface-2)", borderRadius: 8, fontSize: 12.5 }} className="muted">
                  <Icon name="shield" size={14}/> ระบบนี้แสดงเฉพาะสถานะเคส — ไม่แสดงข้อมูลส่วนบุคคล (PDPA)
                </div>
              </div>
            </div>
          )}
          {searched && !result && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="table-empty">
                <div className="empty-icon"><Icon name="search" size={24}/></div>
                <div style={{ fontWeight: 600 }}>ไม่พบเลข E-tracking ที่ค้นหา</div>
                <div className="small">กรุณาตรวจสอบรหัสและลองอีกครั้ง</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer style={{ padding: "20px 24px", textAlign: "center", borderTop: "1px solid var(--border)", background: "var(--surface)" }} className="muted small">
        © 2569 สำนักงานสาธารณสุขจังหวัดนนทบุรี · ช่วยเหลือ: 02-950-3112 · CMS v3.1
      </footer>
    </div>
  );
};

Object.assign(window, { ReportsScreen, CommitteeScreen, FinesScreen, AdminScreen, PublicTrackScreen });
