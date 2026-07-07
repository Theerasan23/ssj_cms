/* =========================================================
   CMS — App Shell: Sidebar / TopNav / Header / Role switcher
   Exposes window.AppShell and window.useApp (context hook)
   ========================================================= */

const AppContext = React.createContext(null);
const useApp = () => React.useContext(AppContext);

// ---------- Default tweaks (persisted by host) ----------
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "navStyle": "sidebar",
  "detailLayout": "2col",
  "fontFamily": "Sarabun",
  "density": "comfortable"
}/*EDITMODE-END*/;

// ---------- Top-level App provider + router ----------
const AppRoot = () => {
  const [state, setState] = React.useState(() => window.CMS.loadState());
  const [route, setRoute] = React.useState(() => {
    return state.loggedIn ? { name: "dashboard" } : { name: "login" };
  });
  const [tweaks, setTweaks] = window.useTweaks(TWEAK_DEFAULTS);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Persist state
  React.useEffect(() => { window.CMS.saveState(state); }, [state]);

  // Apply font family
  React.useEffect(() => {
    document.documentElement.style.setProperty(
      "--font-base",
      `"${tweaks.fontFamily}", "Sarabun", "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif`
    );
  }, [tweaks.fontFamily]);

  // ---- Actions ----
  const actions = React.useMemo(() => ({
    login(roleId) {
      setState(s => ({ ...s, loggedIn: true, currentRole: roleId }));
      setRoute({ name: "dashboard" });
    },
    logout() {
      setState(s => ({ ...s, loggedIn: false }));
      setRoute({ name: "login" });
    },
    switchRole(roleId) {
      setState(s => ({ ...s, currentRole: roleId }));
    },
    goto(route) {
      setMobileNavOpen(false);
      setRoute(route);
    },
    createCase(payload) {
      const id = "case-" + Math.random().toString(36).slice(2,8);
      const newCase = {
        id,
        ...payload,
        status: "01",
        assignees: [], assignedAt: null, assignedBy: null,
        investigation: { siteVisitDate: null, sitePlace: "", siteResult: "", meetingDate: null, meetingPlace: "", meetingSummary: "" },
        board: null,
        fines: [],
        createdBy: state.currentRole,
        createdAt: window.CMS.TODAY,
        timeline: [{
          date: window.CMS.TODAY, time: new Date().toTimeString().slice(0,5),
          title: "สร้างเคสในระบบ", user: roleName(state.currentRole), kind: "create", status: "in-time"
        }],
      };
      setState(s => ({ ...s, cases: [newCase, ...s.cases] }));
      return id;
    },
    updateCase(id, updater) {
      setState(s => ({ ...s, cases: s.cases.map(c => c.id === id ? (typeof updater === "function" ? updater(c) : { ...c, ...updater }) : c) }));
    },
    deleteCase(id) {
      setState(s => ({ ...s, cases: s.cases.filter(c => c.id !== id) }));
    },
    resetData() {
      window.CMS.resetState();
      setState(window.CMS.loadState());
    },
    markAllRead() {
      setState(s => ({ ...s, notifications: s.notifications.map(n => ({ ...n, unread: false })) }));
    },
  }), [state.currentRole]);

  function roleName(roleId) {
    const r = window.CMS.MASTER.roles.find(x => x.id === roleId);
    return r ? r.name : roleId;
  }

  const ctx = {
    state, setState, actions, route, setRoute: actions.goto,
    role: window.CMS.MASTER.roles.find(r => r.id === state.currentRole),
    tweaks, setTweaks,
    mobileNavOpen, setMobileNavOpen,
  };

  // Apply density
  const densityVar = tweaks.density === "compact" ? "12px" : "14px";

  return (
    <AppContext.Provider value={ctx}>
      <ToastProvider>
        <div className="app-root" style={{ "--row-pad": densityVar }}>
          {route.name === "login" ? <LoginScreen /> : (route.name === "public-track" ? <PublicTrackScreen /> : <AppLayout />)}
        </div>
        <TweaksUI />
      </ToastProvider>
    </AppContext.Provider>
  );
};

// ---------- AppLayout: sidebar/topnav + header + routed page ----------
const AppLayout = () => {
  const { tweaks } = useApp();
  const useTop = tweaks.navStyle === "topnav";
  return (
    <div className={`app-shell ${useTop ? "" : "with-sidebar"}`}>
      {useTop ? <TopNav /> : <Sidebar />}
      <div className="main-area">
        {!useTop && <AppHeader />}
        <MainRoute />
        <MobileTabbar />
      </div>
    </div>
  );
};

// ---------- Sidebar nav ----------
const NAV_ITEMS = [
  { key: "dashboard", label: "หน้าหลัก",         icon: "home",    route: { name: "dashboard" }, roles: ["officer","head","admin","exec"] },
  { key: "cases",     label: "เคสร้องเรียน",      icon: "inbox",   route: { name: "case-list" },  roles: ["officer","head","admin","exec"] },
  { key: "committee", label: "คณะกรรมการ",       icon: "users",   route: { name: "committee" }, roles: ["officer","head","admin"] },
  { key: "fines",     label: "ค่าปรับ",            icon: "coin",    route: { name: "fines" },     roles: ["officer","head","admin"] },
  { key: "reports",   label: "รายงาน · KPI",       icon: "chart",   route: { name: "reports" },   roles: ["head","admin","exec"] },
  { key: "admin",     label: "ตั้งค่า (Admin)",     icon: "settings",route: { name: "admin" },     roles: ["admin"] },
];

const Sidebar = () => {
  const { route, setRoute, state, mobileNavOpen, setMobileNavOpen, actions } = useApp();
  const items = NAV_ITEMS.filter(it => it.roles.includes(state.currentRole));
  return (
    <>
      {mobileNavOpen && <div onClick={()=> setMobileNavOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(15,30,50,.4)", zIndex: 85 }}/>}
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">งานหลัก</div>
          {items.map(it => (
            <button key={it.key} className={`nav-item ${route.name === it.route.name ? "active" : ""}`}
              onClick={() => setRoute(it.route)}>
              <Icon className="nav-icon" name={it.icon}/>
              <span className="nav-label">{it.label}</span>
              {it.key === "cases" && <span className="nav-badge">{state.cases.filter(c => !["05","06","07","08"].includes(c.status)).length}</span>}
            </button>
          ))}

          <div className="nav-section-label">บริการสาธารณะ</div>
          <button className="nav-item" onClick={() => setRoute({ name: "public-track" })}>
            <Icon className="nav-icon" name="search"/>
            <span className="nav-label">Public Tracking</span>
            <Icon name="external" size={14} style={{opacity:0.6}}/>
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" style={{ color: "var(--error-700)" }} onClick={()=> actions.logout()}>
            <Icon className="nav-icon" name="logout"/>
            <span className="nav-label">ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const TopNav = () => {
  const { route, setRoute, state } = useApp();
  const items = NAV_ITEMS.filter(it => it.roles.includes(state.currentRole));
  return (
    <div className="topnav">
      <Logo />
      <div className="topnav-links">
        {items.map(it => (
          <button key={it.key} className={`nav-item ${route.name === it.route.name ? "active" : ""}`} onClick={() => setRoute(it.route)}>
            <Icon className="nav-icon" name={it.icon}/>
            <span className="nav-label">{it.label}</span>
          </button>
        ))}
      </div>
      <HeaderControls compact />
    </div>
  );
};

// ---------- App Header ----------
function pageTitleFor(route) {
  switch (route.name) {
    case "dashboard": return { title: "ภาพรวมงานวันนี้", sub: "Dashboard · งานที่กำลังดำเนินการและเหลือเวลา" };
    case "case-list": return { title: "เคสร้องเรียน", sub: "บริหารและติดตามทุกเคสในระบบ" };
    case "case-new":  return { title: "สร้างเคสร้องเรียน", sub: "บันทึกเรื่องร้องเรียนใหม่เข้าระบบ" };
    case "case-detail": return { title: "รายละเอียดเคส", sub: "ดำเนินการตามขั้นตอน workflow" };
    case "committee": return { title: "คณะกรรมการ", sub: "เคสที่รอเข้าประชุมและประวัติมติ" };
    case "fines":     return { title: "ค่าปรับ", sub: "ติดตามรายการเปรียบเทียบปรับและการชำระ" };
    case "reports":   return { title: "รายงาน · KPI", sub: "Dashboard ภาพรวมและการ Export ข้อมูล" };
    case "admin":     return { title: "ตั้งค่าระบบ", sub: "Master data, ผู้ใช้, สิทธิ์" };
    default: return { title: "", sub: "" };
  }
}

const AppHeader = () => {
  const { route, mobileNavOpen, setMobileNavOpen } = useApp();
  const { title, sub } = pageTitleFor(route);
  return (
    <header className="app-header">
      <button className="icon-btn" style={{ display: "none" }} id="mobile-toggle" onClick={()=> setMobileNavOpen(v => !v)}>
        <Icon name="menu"/>
      </button>
      <style>{`@media (max-width: 768px) { #mobile-toggle { display: flex !important; } }`}</style>
      <div style={{ display:"flex", flexDirection:"column", lineHeight:1.2 }}>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="spacer"/>
      <HeaderControls/>
    </header>
  );
};

const HeaderControls = ({ compact }) => {
  const { state, role, actions, setRoute } = useApp();
  const [openBell, setOpenBell] = React.useState(false);
  const [openRole, setOpenRole] = React.useState(false);
  const bellRef = React.useRef(null);
  const roleRef = React.useRef(null);
  useClickOutside(bellRef, () => setOpenBell(false));
  useClickOutside(roleRef, () => setOpenRole(false));
  const unread = state.notifications.filter(n => n.unread).length;
  return (
    <div className="row" style={{ gap: 10 }}>
      {!compact && (
        <div className="quick-search">
          <Icon name="search" className="search-icon" size={16}/>
          <input placeholder="ค้นหา E-tracking, ชื่อเคส, ผู้ถูกร้อง..."
            onKeyDown={(e)=> { if (e.key === "Enter") setRoute({ name: "case-list", q: e.target.value }); }}/>
          <kbd>⌘ K</kbd>
        </div>
      )}
      <div ref={bellRef} style={{ position: "relative" }}>
        <button className="icon-btn" onClick={()=> setOpenBell(v => !v)}>
          <Icon name="bell" size={18}/>
          {unread > 0 && <span className="count">{unread}</span>}
        </button>
        {openBell && (
          <div className="dropdown notif-panel" style={{ padding: 0 }}>
            <div className="notif-head">
              <h3>แจ้งเตือน</h3>
              <button className="btn btn-ghost btn-sm" onClick={()=> { actions.markAllRead(); }}>
                ทำเครื่องหมายว่าอ่านแล้ว
              </button>
            </div>
            {state.notifications.map(n => (
              <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`} onClick={() => { setOpenBell(false); setRoute({ name:"case-detail", id: n.caseId }); }}>
                <div className="notif-ic" style={{
                  background: n.icon === "warn" ? "var(--warning-100)" : n.icon === "danger" ? "var(--error-100)" : n.icon === "success" ? "var(--success-100)" : "var(--primary-100)",
                  color: n.icon === "warn" ? "var(--warning-700)" : n.icon === "danger" ? "var(--error-700)" : n.icon === "success" ? "var(--success-700)" : "var(--primary-700)"
                }}>
                  <Icon name={n.icon === "warn" ? "alert" : n.icon === "danger" ? "alert-circle" : n.icon === "success" ? "check-circle" : "info"} size={16}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-meta">{n.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div ref={roleRef} style={{ position: "relative" }}>
        <div className="role-switcher" onClick={()=> setOpenRole(v => !v)}>
          <div className="role-avatar">{role.initials}</div>
          <div className="role-meta">
            <div className="role-name">{role.name}</div>
            <div className="role-label">{role.role}</div>
          </div>
          <Icon name="chevron-down" size={14} style={{ color: "var(--text-muted)", marginLeft: 2 }}/>
        </div>
        {openRole && (
          <div className="dropdown" style={{ minWidth: 280 }}>
            <div className="dropdown-section">สลับบทบาท (demo)</div>
            {window.CMS.MASTER.roles.map(r => (
              <button key={r.id} className={`dropdown-item ${r.id === role.id ? "active" : ""}`}
                onClick={()=> { actions.switchRole(r.id); setOpenRole(false); }}>
                <div className="avatar sm">{r.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.role}</div>
                </div>
                {r.id === role.id && <Icon name="check" size={14}/>}
              </button>
            ))}
            <div className="dropdown-divider"/>
            <button className="dropdown-item" onClick={()=> { setOpenRole(false); actions.resetData(); }}>
              <Icon name="history" size={16}/>
              <span>รีเซ็ตข้อมูลตัวอย่าง</span>
            </button>
            <button className="dropdown-item" onClick={()=> { setOpenRole(false); actions.logout(); }}>
              <Icon name="logout" size={16}/>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Mobile bottom tabbar ----------
const MobileTabbar = () => {
  const { route, setRoute, state } = useApp();
  const items = NAV_ITEMS.filter(it => it.roles.includes(state.currentRole)).slice(0, 5);
  return (
    <nav className="mobile-tabbar">
      <div className="tabbar-inner">
        {items.map(it => (
          <button key={it.key} className={`tab-btn ${route.name === it.route.name ? "active" : ""}`} onClick={()=> setRoute(it.route)}>
            <Icon className="tb-ic" name={it.icon}/>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// ---------- Router → screen ----------
const MainRoute = () => {
  const { route } = useApp();
  switch (route.name) {
    case "dashboard":   return <DashboardScreen />;
    case "case-list":   return <CaseListScreen />;
    case "case-new":    return <CaseCreateScreen />;
    case "case-detail": return <CaseDetailScreen id={route.id}/>;
    case "committee":   return <CommitteeScreen />;
    case "fines":       return <FinesScreen />;
    case "reports":     return <ReportsScreen />;
    case "admin":       return <AdminScreen />;
    default: return <div className="page"><div className="muted">ไม่พบหน้า</div></div>;
  }
};

// ---------- Tweaks UI ----------
const TweaksUI = () => {
  const { tweaks, setTweaks } = useApp();
  return (
    <window.TweaksPanel title="ปรับแต่งระบบ">
      <window.TweakSection label="Navigation">
        <window.TweakRadio label="รูปแบบเมนู" value={tweaks.navStyle}
          onChange={(v)=> setTweaks("navStyle", v)}
          options={[{label:"Sidebar", value:"sidebar"}, {label:"Top nav", value:"topnav"}]}/>
      </window.TweakSection>
      <window.TweakSection label="Case Detail">
        <window.TweakRadio label="Layout" value={tweaks.detailLayout}
          onChange={(v)=> setTweaks("detailLayout", v)}
          options={[
            {label:"2-Column", value:"2col"},
            {label:"Tabs", value:"tabs"},
            {label:"Timeline", value:"timeline"}
          ]}/>
      </window.TweakSection>
      <window.TweakSection label="Typography">
        <window.TweakSelect label="Font Family" value={tweaks.fontFamily}
          onChange={(v)=> setTweaks("fontFamily", v)}
          options={[
            {label: "Sarabun (default)", value: "Sarabun"},
            {label: "IBM Plex Sans Thai", value: "IBM Plex Sans Thai"},
            {label: "Noto Sans Thai", value: "Noto Sans Thai"},
          ]}/>
      </window.TweakSection>
      <window.TweakSection label="Density">
        <window.TweakRadio label="ความหนาแน่น" value={tweaks.density}
          onChange={(v)=> setTweaks("density", v)}
          options={[{label:"Comfortable", value:"comfortable"}, {label:"Compact", value:"compact"}]}/>
      </window.TweakSection>
    </window.TweaksPanel>
  );
};

Object.assign(window, { AppRoot, useApp, AppContext, NAV_ITEMS, pageTitleFor });
