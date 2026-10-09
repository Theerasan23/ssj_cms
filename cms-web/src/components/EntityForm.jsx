"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Modal, FormField } from "@/components/ui";
import { useApp } from "@/context/AppContext";

// Field metadata for each editable lookup entity (matches the API).
// (พนักงานเจ้าหน้าที่ถูกย้ายไปอยู่ใน "ผู้ใช้และสิทธิ์" — มอบหมายงานให้บัญชีผู้ใช้โดยตรง)
export const ENTITY_META = {
  channels:    { label: "ช่องทางการร้องเรียน", icon: "phone",   fields: [{ key: "name", label: "ชื่อ" }] },
  laws:        { label: "พรบ.",                icon: "shield",  fields: [{ key: "id", label: "รหัส (id)", pk: true }, { key: "label", label: "ชื่อ พรบ." }] },
  sources:     { label: "ที่มาของผู้ร้อง",      icon: "tag",     fields: [{ key: "name", label: "ชื่อ" }] },
  problems:    { label: "ประเภทปัญหา",         icon: "alert",   fields: [{ key: "name", label: "ชื่อ" }] },
  // เพิ่มมาตรา: เลือกพรบ. ก่อน แล้วจึงกรอกมาตรา · id เว้นว่างได้ (ระบบสร้างให้)
  // ใช้ทั้งในหน้า Admin และปุ่ม "เพิ่มมาตรา" ในหน้าค่าปรับ · ค่าปรับครั้งที่ 1/2/3 ไม่บังคับ (เว้นว่าง = 0)
  sections:    { label: "มาตรา + ค่าปรับ",     icon: "gavel",   fields: [{ key: "law_id", label: "พรบ.", lawSelect: true }, { key: "text", label: "ข้อความมาตรา" }, { key: "fine1", label: "ค่าปรับครั้งที่ 1", num: true, optional: true }, { key: "fine2", label: "ครั้งที่ 2", num: true, optional: true }, { key: "fine3", label: "ครั้งที่ 3", num: true, optional: true }, { key: "id", label: "รหัส (id)", pk: true, optional: true }] },
  committees:  { label: "คณะกรรมการ",          icon: "users",   fields: [{ key: "name", label: "ชื่อ" }] },
  resolutions: { label: "มติคณะกรรมการ",        icon: "gavel",   fields: [{ key: "name", label: "ชื่อ" }] },
  districts:   { label: "อำเภอ",               icon: "map-pin", fields: [{ key: "name", label: "ชื่อ" }] },
};

export function blankEntityForm(meta) {
  const f = {};
  for (const fl of meta.fields) f[fl.key] = "";
  return f;
}

export function EntityForm({ meta, editing, onClose, onSave }) {
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
                placeholder={f.pk && f.optional && editing.isNew ? "เว้นว่าง = สร้างอัตโนมัติ" : f.num && f.optional ? "ไม่บังคับ" : undefined}
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
