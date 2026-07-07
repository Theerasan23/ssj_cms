"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Icon } from "@/components/Icon";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function LoginPage() {
  const { loggedIn, booting } = useApp();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!booting && loggedIn) router.replace("/dashboard");
  }, [booting, loggedIn, router]);

  // live numbers from the DB (public aggregate endpoint — no auth needed)
  useEffect(() => {
    let alive = true;
    api.get("/public/stats").then((s) => { if (alive) setStats(s); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  async function submit(e) {
    e && e.preventDefault();
    setError(null);
    if (!username.trim()) { setError("กรุณากรอก Username"); return; }
    if (!password) { setError("กรุณากรอก Password"); return; }
    setLoading(true);
    const res = await signIn("credentials", { username: username.trim(), password, redirect: false });
    if (res?.error || !res?.ok) {
      setError("Username หรือ Password ไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="login-shell">
      <div className="login-art">
        <div className="art-content">
          <div className="art-brand">
            <div className="mark">คบส</div>
            <div className="text">
              <div className="name">กลุ่มงานคุ้มครองผู้บริโภค</div>
              <div className="sub">สำนักงานสาธารณสุขจังหวัดนนทบุรี</div>
            </div>
          </div>
          <div className="art-headline">ระบบจัดการ<br />เรื่องร้องเรียน</div>
          <div className="art-sub">
            รับ บันทึก ติดตาม และปิดเคสเรื่องร้องเรียนเกี่ยวกับผลิตภัณฑ์สุขภาพอย่างเป็นระบบ
            ครอบคลุมตั้งแต่การสร้างเคส มอบหมาย ตรวจสอบข้อเท็จจริง เข้าคณะกรรมการ จนถึงการปิดเคส
          </div>
          <div className="art-stats">
            <div className="stat"><div className="v">{stats ? stats.totalCases.toLocaleString("th-TH") : "—"}</div><div className="l">เคสในระบบ</div></div>
            <div className="stat"><div className="v">{stats ? `${stats.onTimePercent}%` : "—"}</div><div className="l">เคส on-time</div></div>
            <div className="stat"><div className="v">{stats ? stats.statusCount : "—"}</div><div className="l">สถานะติดตาม</div></div>
          </div>
        </div>
        <div className="art-foot">© 2569 สำนักงานสาธารณสุขจังหวัดนนทบุรี · CMS v3.1</div>
      </div>

      <div className="login-form-side">
        <form className="login-card" onSubmit={submit}>
          <div>
            <h2>เข้าสู่ระบบ</h2>
            <div className="login-sub">กรอก Username และ Password ของหน่วยงาน</div>
          </div>

          {error && (
            <div className="toast error" style={{ minWidth: 0, margin: 0 }}>
              <Icon className="toast-icon" name="alert-circle" size={20} />
              <div className="toast-body">
                <div className="toast-title">เข้าสู่ระบบไม่สำเร็จ</div>
                <div className="toast-msg">{error}</div>
              </div>
            </div>
          )}

          <div className="field">
            <label>Username</label>
            <input className="input" placeholder="เช่น natsiri.p" value={username}
              onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" className="input" placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="row between" style={{ marginTop: -4 }}>
            <label className="checkbox"><input type="checkbox" defaultChecked />จดจำการเข้าระบบ</label>
            <a href="#" className="small" style={{ color: "var(--primary-600)" }} onClick={(e) => e.preventDefault()}>ลืมรหัสผ่าน?</a>
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            {!loading && <Icon name="arrow-right" size={16} />}
          </button>

          <div className="small muted" style={{ textAlign: "center", marginTop: 8 }}>
            สำนักงานสาธารณสุขจังหวัดนนทบุรี · v3.1
          </div>
        </form>
      </div>
    </div>
  );
}
