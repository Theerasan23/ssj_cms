"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { api, setToken, clearToken } from "@/lib/api";
import { fmtThaiDate, fmtThaiDateShort, fmtMoney } from "@/lib/format";
import * as SLA from "@/lib/sla";
import { Icon } from "@/components/Icon";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
export const useToasts = () => {
  const ctx = useContext(AppContext);
  return { push: ctx.pushToast };
};

// Mirrors window.CMS from the prototype so ported screens can call cms.X directly.
function makeCms(master) {
  const M = master || {};
  return {
    MASTER: M,
    STATUS: M.statuses || {},
    lawLabel: (id) => M.laws?.find((l) => l.id === id)?.label ?? id,
    officerName: (id) => M.officers?.find((o) => o.id === id)?.name ?? id,
    sectionById: (id) => M.sections?.find((s) => s.id === id),
    fmtThaiDate, fmtThaiDateShort, fmtMoney,
    caseSla: SLA.caseSla,
    caseSlaSnapshot: SLA.caseSlaSnapshot,
    isCaseLocked: SLA.isCaseLocked,
    lockReason: SLA.lockReason,
    computeSlaStage: SLA.computeSlaStage,
    offsetDays: SLA.offsetDays,
    TODAY: SLA.TODAY(),
  };
}

let toastSeq = 0;

export function AppProvider({ children }) {
  const { data: session, status, update } = useSession();
  const [user, setUser] = useState(null);
  const [master, setMaster] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const booting = status === "loading";

  const pushToast = useCallback((t) => {
    const id = ++toastSeq;
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), t.timeout || 3800);
  }, []);

  const loadNotifications = useCallback(async () => {
    try { setNotifications(await api.get("/notifications")); } catch { /* ignore */ }
  }, []);

  const loadMaster = useCallback(async () => {
    try {
      const m = await api.get("/master");
      SLA.setSlaDays(m.slaDays);
      setMaster(m);
    } catch { /* ignore */ }
  }, []);

  // Sync the cms-api token + identity from the NextAuth session
  useEffect(() => {
    if (status === "authenticated" && session?.apiToken) {
      setToken(session.apiToken);
      setUser(session.cms || null);
    } else if (status === "unauthenticated") {
      clearToken();
      setUser(null);
      setMaster(null);
      setNotifications([]);
    }
  }, [status, session]);

  // Load master + notifications whenever we have a logged-in user
  useEffect(() => {
    if (user) { loadMaster(); loadNotifications(); }
  }, [user, loadMaster, loadNotifications]);

  const actions = useMemo(() => ({
    logout() { clearToken(); setUser(null); signOut({ callbackUrl: "/login" }); },
    async markAllRead() {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      try { await api.post("/notifications/read-all", {}); } catch { /* ignore */ }
    },
    reloadNotifications: loadNotifications,
    reloadMaster: loadMaster,
    async refreshUser() {
      try { const { user: u } = await api.get("/users/me"); setUser(u); await update?.({ cms: u }); } catch { /* ignore */ }
    },
  }), [loadNotifications, loadMaster, update]);

  const role = useMemo(() => (user ? {
    id: user.roleId, userId: user.userId, name: user.name, role: user.role, initials: user.initials, desc: user.desc,
  } : null), [user]);

  const cms = useMemo(() => makeCms(master), [master]);

  const value = {
    user, role, master, cms, notifications, booting,
    actions, pushToast,
    loggedIn: status === "authenticated",
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      <ToastZone toasts={toasts} />
    </AppContext.Provider>
  );
}

function ToastZone({ toasts }) {
  return (
    <div className="toast-zone">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind || ""}`}>
          <Icon className="toast-icon" name={t.kind === "success" ? "check-circle" : t.kind === "warn" ? "alert" : (t.kind === "error" || t.kind === "danger") ? "alert-circle" : "info"} size={20} />
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            {t.msg && <div className="toast-msg">{t.msg}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
