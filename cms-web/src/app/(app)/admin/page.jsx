"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Avatar, Modal, FormField } from "@/components/ui";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";
import { fmtThaiDate } from "@/lib/format";

// Field metadata for each editable lookup entity (matches the API).
// (พนักงานเจ้าหน้าที่ถูกย้ายไปอยู่ใน "ผู้ใช้และสิทธิ์" — มอบหมายงานให้บัญชีผู้ใช้โดยตรง)
const ENTITY_META = {
  channels:    { label: "ช่องทางการร้องเรียน", icon: "phone",   fields: [{ key: "name", label: "ชื่อ" }] },
  laws:        { label: "พรบ.",                icon: "shield",  fields: [{ key: "id", label: "รหัส (id)", pk: true }, { key: "label", label: "ชื่อ พรบ." }] },
  sources:     { label: "ที่มาของผู้ร้อง",      icon: "tag",     fields: [{ key: "name", label: "ชื่อ" }] },
  problems:    { label: "ประเภทปัญหา",         icon: "alert",   fields: [{ key: "name", label: "ชื่อ" }] },
  // เพิ่มมาตรา: เลือกพรบ. ก่อน แล้วจึงกรอกมาตรา · id เว้นว่างได้ (ระบบสร้างให้)
  sections:    { label: "มาตรา + ค่าปรับ",     icon: "gavel",   fields: [{ key: "law_id", label: "พรบ.", lawSelect: true }, { key: "text", label: "ข้อความมาตรา" }, { key: "fine1", label: "ค่าปรับครั้งที่ 1", num: true }, { key: "fine2", label: "ครั้งที่ 2", num: true }, { key: "fine3", label: "ครั้งที่ 3", num: true }, { key: "id", label: "รหัส (id)", pk: true, optional: true }] },
  committees:  { label: "คณะกรรมการ",          icon: "users",   fields: [{ key: "name", label: "ชื่อ" }] },
  resolutions: { label: "มติคณะกรรมการ",        icon: "gavel",   fields: [{ key: "name", label: "ชื่อ" }] },
  districts:   { label: "อำเภอ",               icon: "map-pin", fields: [{ key: "name", label: "ชื่อ" }] },
};

const NAV = [
  ...Object.keys(ENTITY_META).map((k) => ({ key: k, label: ENTITY_META[k].label, icon: ENTITY_META[k].icon })),
  { key: "sla", label: "การกำหนด SLA", icon: "clock" },
  { key: "users", label: "ผู้ใช้และสิทธิ์", icon: "user" },
  { key: "audit", label: "Audit Log", icon: "history" },
  { key: "import", label: "นำเข้า Excel", icon: "upload" },
];

export default function AdminPage() {
  const { role } = useApp();
  const router = useRouter();
  const [section, setSection] = useState("channels");

  if (role.id !== "admin") {
    return (
      <main className="page"><div className="card"><div className="table-empty">
        <div className="empty-icon"><Icon name="lock" size={26} /></div>
        <div style={{ fontWeight: 600 }}>เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น</div>
        <button className="btn btn-primary" onClick={() => router.push("/dashboard")}>กลับหน้าหลัก</button>
      </div></div></main>
    );
  }

  return (
    <main className="page fade-in">
      <div className="page-header">
        <div><h1>ตั้งค่าระบบ</h1><div className="page-meta">Master Data · SLA · ผู้ใช้และสิทธิ์ · Audit Log · นำเข้าข้อมูล</div></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 20 }}>
        <div className="card" style={{ alignSelf: "start", position: "sticky", top: 84 }}>
          <div className="card-body" style={{ padding: 8 }}>
            {NAV.map((s) => (
              <button key={s.key} className={`nav-item ${section === s.key ? "active" : ""}`}
                onClick={() => (s.key === "import" ? router.push("/admin/import") : setSection(s.key))}>
                <Icon className="nav-icon" name={s.icon} />
                <span className="nav-label">{s.label}</span>
                {s.key === "import" && <Icon name="external" size={13} style={{ opacity: 0.6 }} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          {ENTITY_META[section] && <EntityManager key={section} entity={section} meta={ENTITY_META[section]} />}
          {section === "sla" && <SlaConfig />}
          {section === "users" && <UserManager />}
          {section === "audit" && <AuditLog />}
        </div>
      </div>
    </main>
  );
}

function EntityManager({ entity, meta }) {
  const { actions, cms } = useApp();
  const toast = useToasts();
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null); // { row, isNew }

  async function load() {
    try { setRows(await api.get(`/master/${entity}`)); } catch (e) { toast.push({ kind: "danger", title: "โหลดข้อมูลไม่สำเร็จ", msg: e.message }); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [entity]);

  async function save(form, isNew) {
    try {
      if (isNew) await api.post(`/master/${entity}`, form);
      else await api.patch(`/master/${entity}/${editing.row.id}`, form);
      setEditing(null);
      toast.push({ kind: "success", title: isNew ? "เพิ่มรายการสำเร็จ" : "บันทึกการแก้ไขสำเร็จ" });
      await load();
      actions.reloadMaster?.();
    } catch (e) {
      toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message });
    }
  }

  async function remove(row) {
    if (!window.confirm(`ลบ "${row.name || row.label || row.id}" ?`)) return;
    try {
      await api.del(`/master/${entity}/${row.id}`);
      toast.push({ kind: "success", title: "ลบรายการสำเร็จ" });
      await load();
      actions.reloadMaster?.();
    } catch (e) {
      toast.push({ kind: "danger", title: "ลบไม่สำเร็จ", msg: e.message });
    }
  }

  function blankForm() {
    const f = {};
    for (const fl of meta.fields) f[fl.key] = "";
    return f;
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>{meta.label}</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ row: blankForm(), isNew: true })}>
          <Icon name="plus" size={14} /> เพิ่มใหม่
        </button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr>{meta.fields.map((f) => <th key={f.key}>{f.label}</th>)}<th></th></tr></thead>
          <tbody>
            {rows && rows.map((r) => (
              <tr key={r.id} style={{ cursor: "default" }}>
                {meta.fields.map((f) => <td key={f.key} className={f.num ? "num" : ""} style={{ maxWidth: 320 }}>{f.num ? Number(r[f.key]).toLocaleString("th-TH") : f.lawSelect ? cms.lawLabel(r[f.key]) : r[f.key]}</td>)}
                <td className="actions-cell">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ row: { ...r }, isNew: false })}><Icon name="edit" size={14} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => remove(r)}><Icon name="trash" size={14} /></button>
                </td>
              </tr>
            ))}
            {rows && rows.length === 0 && <tr><td colSpan={meta.fields.length + 1}><div className="table-empty">ยังไม่มีข้อมูล</div></td></tr>}
            {!rows && <tr><td colSpan={meta.fields.length + 1}><div className="muted" style={{ padding: 20 }}>กำลังโหลด…</div></td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <EntityForm meta={meta} editing={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function EntityForm({ meta, editing, onClose, onSave }) {
  const { cms } = useApp();
  const [form, setForm] = useState(editing.row);
  return (
    <Modal open onClose={onClose} title={editing.isNew ? `เพิ่ม ${meta.label}` : `แก้ไข ${meta.label}`}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={() => onSave(form, editing.isNew)}><Icon name="check" size={14} /> บันทึก</button>
      </>}>
      <div className="stack">
        {meta.fields.map((f) => (
          <FormField key={f.key} label={f.label} req={f.lawSelect}>
            {f.lawSelect ? (
              // เลือกพรบ. ก่อน แล้วจึงกรอกมาตรา/ค่าปรับด้านล่าง
              <select className="select" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                <option value="">— เลือกพรบ. —</option>
                {cms.MASTER.laws.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            ) : (
              <input className={`input ${f.num ? "mono" : ""}`} type={f.num ? "number" : "text"}
                disabled={f.pk && !editing.isNew}
                placeholder={f.pk && f.optional && editing.isNew ? "เว้นว่าง = สร้างอัตโนมัติ" : undefined}
                value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
            {f.pk && !editing.isNew && <span className="hint">รหัสหลักแก้ไขไม่ได้</span>}
            {f.pk && f.optional && editing.isNew && <span className="hint">รหัสอ้างอิงทางเทคนิค — เว้นว่างให้ระบบสร้างอัตโนมัติได้</span>}
          </FormField>
        ))}
      </div>
    </Modal>
  );
}

function SlaConfig() {
  const { master, actions } = useApp();
  const toast = useToasts();
  const [days, setDays] = useState(() => ({ ...(master?.slaDays || { assign: 3, invest: 20, board: 60, fine: 60 }) }));
  const [saving, setSaving] = useState(false);
  const stages = master?.slaConfig || [
    { stage: "assign", label: "ขั้นมอบหมาย" }, { stage: "invest", label: "ขั้นตรวจสอบข้อเท็จจริง" },
    { stage: "board", label: "ขั้นเข้าคณะกรรมการ" }, { stage: "fine", label: "ขั้นชำระค่าปรับ" },
  ];
  const anchors = { assign: "นับจากวันลงรับ POST", invest: "นับจากวันมอบหมาย", board: "นับจากวันมอบหมาย", fine: "นับจากวันประชุมกรรมการ" };

  async function save() {
    setSaving(true);
    try {
      await api.put("/master/sla", days);
      toast.push({ kind: "success", title: "บันทึกการกำหนด SLA สำเร็จ", msg: "มีผลกับการคำนวณทันที" });
      await actions.reloadMaster?.();
    } catch (e) {
      toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message });
    }
    setSaving(false);
  }

  return (
    <div className="card">
      <div className="card-header"><div><h3>การกำหนด SLA</h3><div className="card-sub">จำนวนวันสูงสุดของแต่ละขั้นตอน · ใช้คำนวณสถานะ SLA และการล็อกเคส</div></div></div>
      <div className="card-body stack">
        {stages.map((s) => (
          <div key={s.stage} className="row between" style={{ padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 10 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{s.label}</div>
              <div className="small muted">{anchors[s.stage]}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input type="number" min="0" className="input mono" style={{ width: 90, textAlign: "right" }}
                value={days[s.stage] ?? ""} onChange={(e) => setDays((d) => ({ ...d, [s.stage]: e.target.value }))} />
              <span className="muted small">วัน</span>
            </div>
          </div>
        ))}
        <div className="row end">
          <button className="btn btn-primary" disabled={saving} onClick={save}><Icon name="save" size={14} /> บันทึกการกำหนด SLA</button>
        </div>
      </div>
    </div>
  );
}

function UserManager() {
  const { cms, actions, user } = useApp();
  const toast = useToasts();
  const [users, setUsers] = useState(null);
  const [editing, setEditing] = useState(null);
  const [created, setCreated] = useState(null);

  async function load() {
    try { setUsers(await api.get("/users")); } catch (e) { toast.push({ kind: "danger", title: "โหลดไม่สำเร็จ", msg: e.message }); }
  }
  useEffect(() => { load(); }, []);

  async function save(form, isNew) {
    try {
      if (isNew) { const r = await api.post("/users", form); setCreated({ username: r.username, password: r.password }); }
      else await api.patch(`/users/${editing.row.id}`, form);
      setEditing(null);
      if (!isNew) toast.push({ kind: "success", title: "บันทึกการแก้ไขสำเร็จ" });
      await load(); actions.reloadMaster?.();
    } catch (e) { toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message }); }
  }
  async function toggleActive(u) {
    try { await api.post(`/users/${u.id}/active`, { active: !u.active }); await load(); }
    catch (e) { toast.push({ kind: "danger", title: "ทำรายการไม่สำเร็จ", msg: e.message }); }
  }
  async function remove(u) {
    if (!window.confirm(`ลบผู้ใช้ "${u.name}" ?`)) return;
    try { await api.del(`/users/${u.id}`); toast.push({ kind: "success", title: "ลบผู้ใช้สำเร็จ" }); await load(); }
    catch (e) { toast.push({ kind: "danger", title: "ลบไม่สำเร็จ", msg: e.message }); }
  }

  const roles = cms.MASTER.roles || [];

  return (
    <div className="card">
      <div className="card-header">
        <div><h3>ผู้ใช้และสิทธิ์</h3><div className="card-sub">ทุกบทบาทเป็นบัญชีเข้าสู่ระบบ — สิทธิ์เป็นไปตามขั้นตอนของ flow ด้านล่าง</div></div>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ row: { name: "", roleId: "officer", email: "", phone: "" }, isNew: true })}><Icon name="plus" size={14} /> เพิ่มผู้ใช้</button>
      </div>
      {/* สิทธิ์ตาม flow: พัสดุสร้างเคส → หัวหน้าอนุมัติ+มอบหมาย → เจ้าหน้าที่ดำเนินการ → ค่าปรับเฉพาะขั้นชำระ */}
      <div className="card-body" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="stack-sm">
          {roles.map((r) => (
            <div key={r.id} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <span className="chip primary" style={{ flexShrink: 0, minWidth: 150, justifyContent: "center" }}>{r.role}</span>
              <span className="small muted" style={{ paddingTop: 2 }}>{r.desc || "—"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>ชื่อ</th><th>Username</th><th>บทบาท</th><th>สถานะ</th><th></th></tr></thead>
          <tbody>
            {users && users.map((u) => (
              <tr key={u.id} style={{ cursor: "default", opacity: u.active ? 1 : 0.55 }}>
                <td><div className="row"><Avatar name={u.name || u.username} size="sm" /><span style={{ fontWeight: 500 }}>{u.name || "—"}</span></div></td>
                <td className="mono small">{u.username}</td>
                <td><span className="chip primary">{u.roleLabel}</span></td>
                <td>{u.active ? <span className="status-badge s05"><Icon name="check" size={12} stroke={2} />ใช้งาน</span> : <span className="status-badge s08"><Icon name="ban" size={12} />ปิดใช้งาน</span>}</td>
                <td className="actions-cell">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ row: { ...u }, isNew: false })}><Icon name="edit" size={14} /></button>
                  <button className="btn btn-ghost btn-sm" title={u.active ? "ปิดใช้งาน" : "เปิดใช้งาน"} disabled={user?.userId === u.id} onClick={() => toggleActive(u)}><Icon name={u.active ? "lock" : "lock-open"} size={14} /></button>
                  <button className="btn btn-ghost btn-sm" disabled={user?.userId === u.id} onClick={() => remove(u)}><Icon name="trash" size={14} /></button>
                </td>
              </tr>
            ))}
            {!users && <tr><td colSpan="5"><div className="muted" style={{ padding: 20 }}>กำลังโหลด…</div></td></tr>}
          </tbody>
        </table>
      </div>
      {editing && <UserForm editing={editing} roles={roles} onClose={() => setEditing(null)} onSave={save} />}
      {created && (
        <Modal open onClose={() => setCreated(null)} title="เพิ่มผู้ใช้สำเร็จ"
          footer={<button className="btn btn-primary" onClick={() => setCreated(null)}>เข้าใจแล้ว</button>}>
          <div className="stack">
            <div style={{ padding: 14, background: "var(--success-100)", borderRadius: 8, color: "var(--success-700)", fontSize: 13 }}>โปรดแจ้งข้อมูลเข้าสู่ระบบให้เจ้าหน้าที่ — เจ้าหน้าที่เปลี่ยนรหัสผ่านเองได้ในหน้าข้อมูลส่วนตัว</div>
            <div className="kv">
              <div className="k">Username</div><div className="v mono">{created.username}</div>
              <div className="k">Password</div><div className="v mono">{created.password}</div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function UserForm({ editing, roles, onClose, onSave }) {
  const [form, setForm] = useState(editing.row);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const selectedRole = roles.find((r) => r.id === (form.roleId || "officer"));
  return (
    <Modal open onClose={onClose} title={editing.isNew ? "เพิ่มผู้ใช้" : "แก้ไขผู้ใช้"}
      footer={<>
        <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={() => onSave(form, editing.isNew)}><Icon name="check" size={14} /> บันทึก</button>
      </>}>
      <div className="stack">
        <FormField label="ชื่อ-นามสกุล" req><input className="input" value={form.name || ""} onChange={(e) => set("name", e.target.value)} /></FormField>
        <FormField label="บทบาท / สิทธิ์">
          <select className="select" value={form.roleId || "officer"} onChange={(e) => set("roleId", e.target.value)}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.role}</option>)}
          </select>
          {selectedRole?.desc && <span className="hint">{selectedRole.desc}</span>}
        </FormField>
        <div className="form-grid cols-2">
          <FormField label="อีเมล"><input className="input" value={form.email || ""} onChange={(e) => set("email", e.target.value)} /></FormField>
          <FormField label="โทร"><input className="input" value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></FormField>
        </div>
        {editing.isNew && <div className="small muted">ระบบจะตั้ง username เป็น <b>user##</b> และรหัสผ่านเริ่มต้น <b>123456</b> ให้อัตโนมัติ (หรือกำหนดเองด้านล่าง)</div>}
        <div className="form-grid cols-2">
          <FormField label="Username" hint={editing.isNew ? "เว้นว่าง = user## อัตโนมัติ" : "แก้ไม่ได้"}>
            <input className="input mono" value={form.username || ""} disabled={!editing.isNew} onChange={(e) => set("username", e.target.value)} placeholder="user##" />
          </FormField>
          <FormField label={editing.isNew ? "รหัสผ่าน" : "รีเซ็ตรหัสผ่าน"} hint={editing.isNew ? "เว้นว่าง = 123456" : "กรอกเพื่อเปลี่ยน"}>
            <input className="input" value={form.password || ""} onChange={(e) => set("password", e.target.value)} placeholder={editing.isNew ? "123456" : "กรอกเพื่อเปลี่ยน"} />
          </FormField>
        </div>
      </div>
    </Modal>
  );
}

function AuditLog() {
  const [logs, setLogs] = useState(null);
  useEffect(() => { api.get("/audit").then(setLogs).catch(() => setLogs([])); }, []);
  return (
    <div className="card">
      <div className="card-header"><div><h3>Audit Log</h3><div className="card-sub">บันทึกกิจกรรมจริงจาก timeline ของเคส (40 ล่าสุด)</div></div></div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>วันที่</th><th>ผู้ใช้</th><th>การกระทำ</th><th>เคส</th></tr></thead>
          <tbody>
            {logs && logs.map((l, i) => (
              <tr key={i} style={{ cursor: "default" }}>
                <td className="muted small">{fmtThaiDate(l.date)} {l.time}</td>
                <td><div className="row"><Avatar name={l.who} size="sm" /><span>{l.who}</span></div></td>
                <td>{l.what}</td>
                <td className="mono">{l.target}</td>
              </tr>
            ))}
            {logs && logs.length === 0 && <tr><td colSpan="4"><div className="table-empty">ยังไม่มีกิจกรรม</div></td></tr>}
            {!logs && <tr><td colSpan="4"><div className="muted" style={{ padding: 20 }}>กำลังโหลด…</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
