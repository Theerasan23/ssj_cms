"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Logo, useClickOutside } from "@/components/ui";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

// roles: supply สร้างเคส · head อนุมัติ+มอบหมาย · officer ดำเนินการ · fine เฉพาะขั้นค่าปรับ
const NAV_ITEMS = [
  { key: "dashboard", label: "หน้าหลัก", icon: "home", href: "/dashboard", match: "/dashboard", roles: ["supply", "officer", "fine", "head", "admin", "exec"] },
  { key: "approvals", label: "รายการขออนุมัติ", icon: "approve", href: "/approvals", match: "/approvals", roles: ["head", "admin"] },
  { key: "cases", label: "เคสร้องเรียน", icon: "inbox", href: "/cases", match: "/cases", roles: ["supply", "officer", "fine", "head", "admin", "exec"] },
  { key: "committee", label: "คณะกรรมการ", icon: "users", href: "/committee", match: "/committee", roles: ["officer", "head", "admin"] },
  { key: "fines", label: "ค่าปรับ", icon: "coin", href: "/fines", match: "/fines", roles: ["officer", "fine", "head", "admin"] },
  { key: "reports", label: "รายงาน · KPI", icon: "chart", href: "/reports", match: "/reports", roles: ["head", "admin", "exec"] },
  { key: "admin", label: "ตั้งค่า (Admin)", icon: "settings", href: "/admin", match: "/admin", roles: ["admin"] },
];

function pageTitleFor(pathname) {
  if (pathname.startsWith("/dashboard")) return { title: "ภาพรวมงานวันนี้", sub: "Dashboard · งานที่กำลังดำเนินการและเหลือเวลา" };
  if (pathname === "/cases/new") return { title: "สร้างเคสร้องเรียน", sub: "บันทึกเรื่องร้องเรียนใหม่เข้าระบบ" };
  if (pathname.startsWith("/cases/")) return { title: "รายละเอียดเคส", sub: "ดำเนินการตามขั้นตอน workflow" };
  if (pathname.startsWith("/cases")) return { title: "เคสร้องเรียน", sub: "บริหารและติดตามทุกเคสในระบบ" };
  if (pathname.startsWith("/committee")) return { title: "คณะกรรมการ", sub: "เคสที่รอเข้าประชุมและประวัติมติ" };
  if (pathname.startsWith("/fines")) return { title: "ค่าปรับ", sub: "ติดตามรายการเปรียบเทียบปรับและการชำระ" };
  if (pathname.startsWith("/reports")) return { title: "รายงาน · KPI", sub: "Dashboard ภาพรวมและการ Export ข้อมูล" };
  if (pathname.startsWith("/admin")) return { title: "ตั้งค่าระบบ", sub: "Master data, ผู้ใช้, สิทธิ์" };
  return { title: "", sub: "" };
}

function isActive(pathname, item) {
  if (item.match === "/dashboard") return pathname.startsWith("/dashboard");
  if (item.match === "/cases") return pathname.startsWith("/cases");
  return pathname.startsWith(item.match);
}

export function Shell({ children }) {
  const { role } = useApp();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!role) return null;
  const items = NAV_ITEMS.filter((it) => it.roles.includes(role.id));

  return (
    <div className="app-root" style={{ "--row-pad": "14px" }}>
      <div className="app-shell with-sidebar">
        <Sidebar items={items} pathname={pathname} mobileNavOpen={mobileNavOpen} setMobileNavOpen={setMobileNavOpen} />
        <div className="main-area">
          <AppHeader setMobileNavOpen={setMobileNavOpen} />
          {children}
          <MobileTabbar items={items.slice(0, 5)} pathname={pathname} />
        </div>
      </div>
    </div>
  );
}

function Sidebar({ items, pathname, mobileNavOpen, setMobileNavOpen }) {
  const router = useRouter();
  const { actions } = useApp();
  const [approvalBadge, setApprovalBadge] = useState(0);

  useEffect(() => {
    let alive = true;
    api.get("/cases?status=01&pageSize=1")
      .then((r) => { if (alive) setApprovalBadge(r.total); })
      .catch(() => {});
    return () => { alive = false; };
  }, [pathname]);

  const go = (href) => { setMobileNavOpen(false); router.push(href); };

  return (
    <>
      {mobileNavOpen && <div onClick={() => setMobileNavOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,30,50,.4)", zIndex: 85 }} />}
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="sidebar-brand"><Logo /></div>
        <div className="sidebar-search">
          <Icon name="search" size={16} className="ss-icon" />
          <input placeholder="ค้นหา E-tracking, ชื่อเคส…"
            onKeyDown={(e) => { if (e.key === "Enter") go(`/cases?q=${encodeURIComponent(e.target.value)}`); }} />
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">งานหลัก</div>
          {items.map((it) => (
            <button key={it.key} className={`nav-item ${isActive(pathname, it) ? "active" : ""}`} onClick={() => go(it.href)}>
              <Icon className="nav-icon" name={it.icon} />
              <span className="nav-label">{it.label}</span>
              {it.key === "approvals" && approvalBadge > 0 && <span className="nav-badge">{approvalBadge}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="nav-item" style={{ color: "var(--error-700)" }} onClick={() => actions.logout()}>
            <Icon className="nav-icon" name="logout" />
            <span className="nav-label">ออกจากระบบ</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function AppHeader({ setMobileNavOpen }) {
  const pathname = usePathname();
  const { title, sub } = pageTitleFor(pathname);
  return (
    <header className="app-header">
      <button className="icon-btn" id="mobile-toggle" onClick={() => setMobileNavOpen((v) => !v)}>
        <Icon name="menu" />
      </button>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2, minWidth: 0 }}>
        <div className="page-title">{title}</div>
        <div className="page-sub">{sub}</div>
      </div>
      <div className="spacer" />
      <HeaderControls />
    </header>
  );
}

function HeaderControls() {
  const router = useRouter();
  const { role, notifications, actions } = useApp();
  const [openBell, setOpenBell] = useState(false);
  const [openRole, setOpenRole] = useState(false);
  const bellRef = useRef(null);
  const roleRef = useRef(null);
  useClickOutside(bellRef, () => setOpenBell(false));
  useClickOutside(roleRef, () => setOpenRole(false));
  const unread = notifications.filter((n) => n.unread).length;

  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="quick-search">
        <Icon name="search" className="search-icon" size={16} />
        <input placeholder="ค้นหา E-tracking, ชื่อเคส, ผู้ถูกร้อง..."
          onKeyDown={(e) => { if (e.key === "Enter") { router.push(`/cases?q=${encodeURIComponent(e.target.value)}`); e.target.blur(); } }} />
        <kbd>⌘ K</kbd>
      </div>
      <div ref={bellRef} style={{ position: "relative" }}>
        <button className="icon-btn" onClick={() => setOpenBell((v) => !v)}>
          <Icon name="bell" size={18} />
          {unread > 0 && <span className="count">{unread}</span>}
        </button>
        {openBell && (
          <div className="dropdown notif-panel" style={{ padding: 0 }}>
            <div className="notif-head">
              <h3>แจ้งเตือน</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => actions.markAllRead()}>ทำเครื่องหมายว่าอ่านแล้ว</button>
            </div>
            {notifications.map((n) => (
              <div key={n.id} className={`notif-item ${n.unread ? "unread" : ""}`} onClick={() => { setOpenBell(false); if (n.caseId) router.push(`/cases/${n.caseId}`); }}>
                <div className="notif-ic" style={{
                  background: n.icon === "warn" ? "var(--warning-100)" : n.icon === "danger" ? "var(--error-100)" : n.icon === "success" ? "var(--success-100)" : "var(--primary-100)",
                  color: n.icon === "warn" ? "var(--warning-700)" : n.icon === "danger" ? "var(--error-700)" : n.icon === "success" ? "var(--success-700)" : "var(--primary-700)",
                }}>
                  <Icon name={n.icon === "warn" ? "alert" : n.icon === "danger" ? "alert-circle" : n.icon === "success" ? "check-circle" : "info"} size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-meta">{n.time}</div>
                </div>
              </div>
            ))}
            {notifications.length === 0 && <div className="muted small" style={{ padding: 16 }}>ไม่มีการแจ้งเตือน</div>}
          </div>
        )}
      </div>
      <div ref={roleRef} style={{ position: "relative" }}>
        <div className="role-switcher" onClick={() => setOpenRole((v) => !v)}>
          <div className="role-avatar">{role.initials}</div>
          <div className="role-meta">
            <div className="role-name">{role.name}</div>
            <div className="role-label">{role.role}</div>
          </div>
          <Icon name="chevron-down" size={14} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
        </div>
        {openRole && (
          <div className="dropdown" style={{ minWidth: 280 }}>
            <button className="dropdown-item" onClick={() => { setOpenRole(false); router.push("/profile"); }}>
              <Icon name="user" size={16} />
              <span>ข้อมูลส่วนตัว</span>
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item" onClick={() => { setOpenRole(false); actions.logout(); }}>
              <Icon name="logout" size={16} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileTabbar({ items, pathname }) {
  const router = useRouter();
  return (
    <nav className="mobile-tabbar">
      <div className="tabbar-inner">
        {items.map((it) => (
          <button key={it.key} className={`tab-btn ${isActive(pathname, it) ? "active" : ""}`} onClick={() => router.push(it.href)}>
            <Icon className="tb-ic" name={it.icon} />
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
