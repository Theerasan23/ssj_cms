"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Avatar, FormField } from "@/components/ui";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { user, role, actions } = useApp();
  const toast = useToasts();
  const router = useRouter();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm({ ...form, [k]: v });

  async function saveInfo() {
    if (!form.name.trim()) { toast.push({ kind: "warn", title: "กรุณากรอกชื่อ" }); return; }
    setSaving(true);
    try {
      await api.patch("/users/me", { name: form.name, email: form.email, phone: form.phone });
      await actions.refreshUser?.();
      toast.push({ kind: "success", title: "บันทึกข้อมูลส่วนตัวสำเร็จ" });
    } catch (e) { toast.push({ kind: "danger", title: "บันทึกไม่สำเร็จ", msg: e.message }); }
    setSaving(false);
  }

  async function savePassword() {
    if (pwd.next.length < 6) { toast.push({ kind: "warn", title: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }); return; }
    if (pwd.next !== pwd.confirm) { toast.push({ kind: "warn", title: "รหัสผ่านยืนยันไม่ตรงกัน" }); return; }
    setSaving(true);
    try {
      await api.patch("/users/me", { password: pwd.next });
      setPwd({ next: "", confirm: "" });
      toast.push({ kind: "success", title: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (e) { toast.push({ kind: "danger", title: "เปลี่ยนรหัสผ่านไม่สำเร็จ", msg: e.message }); }
    setSaving(false);
  }

  return (
    <main className="page page-narrow fade-in">
      <div className="page-header">
        <div><h1>ข้อมูลส่วนตัว</h1><div className="page-meta">แก้ไขข้อมูลและรหัสผ่านของบัญชีคุณ</div></div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={() => router.back()}><Icon name="arrow-left" size={16} /> กลับ</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body row" style={{ gap: 14 }}>
          <Avatar name={user?.name || ""} size="lg" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
            <div className="small muted">{role?.role} · <span className="mono">{user?.username}</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><h3>ข้อมูลทั่วไป</h3></div>
        <div className="card-body stack">
          <FormField label="ชื่อ-นามสกุล" req><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></FormField>
          <div className="form-grid cols-2">
            <FormField label="อีเมล"><input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></FormField>
            <FormField label="เบอร์โทร"><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></FormField>
          </div>
          <div className="row end"><button className="btn btn-primary" disabled={saving} onClick={saveInfo}><Icon name="save" size={14} /> บันทึกข้อมูล</button></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>เปลี่ยนรหัสผ่าน</h3></div>
        <div className="card-body stack">
          <div className="form-grid cols-2">
            <FormField label="รหัสผ่านใหม่" hint="อย่างน้อย 6 ตัวอักษร"><input type="password" className="input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></FormField>
            <FormField label="ยืนยันรหัสผ่านใหม่"><input type="password" className="input" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></FormField>
          </div>
          <div className="row end"><button className="btn btn-primary" disabled={saving || !pwd.next} onClick={savePassword}><Icon name="lock" size={14} /> เปลี่ยนรหัสผ่าน</button></div>
        </div>
      </div>
    </main>
  );
}
