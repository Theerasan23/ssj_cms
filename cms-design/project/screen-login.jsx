/* =========================================================
   CMS — S01 Login Screen
   ========================================================= */

const LoginScreen = () => {
  const { actions } = useApp();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  function submit(e) {
    e && e.preventDefault();
    setError(null);
    if (username.trim().length < 3) { setError("Username ต้องมีอย่างน้อย 3 ตัวอักษร"); return; }
    if (password.length < 8)         { setError("Password ต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    setLoading(true);
    setTimeout(() => { actions.login("officer"); }, 600);
  }

  function quickLogin(roleId) {
    setUsername(roleId === "officer" ? "natsiri.p" : roleId === "head" ? "arun.s" : roleId === "admin" ? "paweena.j" : "drsomchai.w");
    setPassword("password123");
    setLoading(true);
    setTimeout(() => actions.login(roleId), 500);
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
          <div className="art-headline">ระบบจัดการ<br/>เรื่องร้องเรียน</div>
          <div className="art-sub">
            รับ บันทึก ติดตาม และปิดเคสเรื่องร้องเรียนเกี่ยวกับผลิตภัณฑ์สุขภาพอย่างเป็นระบบ
            ครอบคลุมตั้งแต่การสร้างเคส มอบหมาย ตรวจสอบข้อเท็จจริง เข้าคณะกรรมการ
            จนถึงการปิดเคส
          </div>
          <div className="art-stats">
            <div className="stat"><div className="v">1,284</div><div className="l">เคสในระบบ</div></div>
            <div className="stat"><div className="v">96%</div><div className="l">เคส on-time</div></div>
            <div className="stat"><div className="v">8</div><div className="l">สถานะติดตาม</div></div>
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
              <Icon className="toast-icon" name="alert-circle" size={20}/>
              <div className="toast-body">
                <div className="toast-title">เข้าสู่ระบบไม่สำเร็จ</div>
                <div className="toast-msg">{error}</div>
              </div>
            </div>
          )}

          <div className="field">
            <label>Username</label>
            <input className="input" placeholder="เช่น natsiri.p"
              value={username} onChange={(e)=> setUsername(e.target.value)} autoComplete="username"/>
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" className="input" placeholder="••••••••"
              value={password} onChange={(e)=> setPassword(e.target.value)} autoComplete="current-password"/>
          </div>
          <div className="row between" style={{ marginTop: -4 }}>
            <label className="checkbox"><input type="checkbox" defaultChecked/>จดจำการเข้าระบบ</label>
            <a href="#" className="small" style={{ color: "var(--primary-600)" }}>ลืมรหัสผ่าน?</a>
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            {!loading && <Icon name="arrow-right" size={16}/>}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:12, color:"var(--text-muted)", fontSize:12 }}>
            <div style={{flex:1, height:1, background:"var(--border)"}}/>
            หรือ login แบบ demo
            <div style={{flex:1, height:1, background:"var(--border)"}}/>
          </div>

          <div className="quick-roles">
            {window.CMS.MASTER.roles.map(r => (
              <button type="button" key={r.id} className="qr" onClick={()=> quickLogin(r.id)}>
                <div className="qr-role">{r.role}</div>
                <div className="qr-name">{r.name}</div>
              </button>
            ))}
          </div>

          <div className="small muted" style={{ textAlign:"center", marginTop: 8 }}>
            สำนักงานสาธารณสุขจังหวัดนนทบุรี · v3.1
          </div>
        </form>
      </div>
    </div>
  );
};

Object.assign(window, { LoginScreen });
