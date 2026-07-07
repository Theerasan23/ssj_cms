"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { FormField, ChipPicker, FileUpload } from "@/components/ui";
import { useApp, useToasts } from "@/context/AppContext";

export function blankCaseForm(todayIso) {
  return {
    etracking: "", letterNo: "", letterDate: todayIso, postNo: "", postDate: todayIso,
    complainant: { name: "", phone: "", email: "", address: "", channel: "", anonymous: false },
    respondent: { licensee: "", business: "", address: "", district: "", licenseNo: "" },
    title: "", laws: [], source: "", product: "", productLicense: "", problems: [],
    bountyAmount: "", description: "", attachments: [],
  };
}

// Maps an API case object into form values (for editing).
export function caseToForm(c) {
  return {
    etracking: c.etracking, letterNo: c.letterNo || "", letterDate: c.letterDate || "", postNo: c.postNo || "", postDate: c.postDate || "",
    complainant: { name: c.complainant.name || "", phone: c.complainant.phone || "", email: c.complainant.email || "", address: c.complainant.address || "", channel: c.complainant.channel || "", anonymous: !!c.complainant.anonymous },
    respondent: { licensee: c.respondent.licensee || "", business: c.respondent.business || "", address: c.respondent.address || "", district: c.respondent.district || "", licenseNo: c.respondent.licenseNo || "" },
    title: c.title || "", laws: c.laws || [], source: c.source || "", product: c.product || "", productLicense: c.productLicense || "", problems: c.problems || [],
    // attachments are managed on the case detail page (view/download/delete); the form's
    // upload zone is only for adding NEW files, so start it empty when editing.
    bountyAmount: c.bountyAmount != null ? String(c.bountyAmount) : "", description: c.description || "", attachments: [],
  };
}

export function CaseForm({ initial, submitLabel, headerTitle, headerSub, banner, onSubmit, onCancel }) {
  const { cms } = useApp();
  const toast = useToasts();
  const todayIso = cms.TODAY;
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [saving, setSaving] = useState(false);

  function update(path, value) {
    setForm((prev) => {
      const next = { ...prev };
      if (path.includes(".")) {
        const [a, b] = path.split(".");
        next[a] = { ...next[a], [b]: value };
      } else next[path] = value;
      return next;
    });
  }

  function validate() {
    const e = {}, w = {};
    if (!form.etracking) e.etracking = "กรุณากรอก E-tracking";
    if (!form.letterNo) e.letterNo = "กรุณากรอกเลขรับหนังสือ";
    if (!form.letterDate) e.letterDate = "กรุณาเลือกวันที่หนังสือ";
    if (!form.postNo) e.postNo = "กรุณากรอกเลขรับ POST";
    if (!form.postDate) e.postDate = "กรุณาเลือกวันลงรับ POST (สำคัญสำหรับ SLA)";
    if (form.letterDate && form.postDate && form.letterDate > form.postDate) w.letterDate = "วันที่หนังสือมาหลังวันที่ POST — ตรวจสอบให้แน่ใจ";
    if (form.letterDate && form.letterDate > todayIso) e.letterDate = "วันที่ไม่สามารถเป็นอนาคต";
    if (form.postDate && form.postDate > todayIso) e.postDate = "วันที่ไม่สามารถเป็นอนาคต";
    if (!form.complainant.channel) e.channel = "กรุณาเลือกช่องทางการร้องเรียน";
    if (!form.respondent.licensee && !form.respondent.business) e.respondent = "กรอกอย่างน้อย 1 ใน: ชื่อผู้รับอนุญาต / ชื่อสถานประกอบการ";
    if (!form.title || form.title.length < 5) e.title = "ชื่อกรณีต้องมี 5–200 ตัวอักษร";
    if (form.title.length > 200) e.title = "ชื่อกรณีต้องไม่เกิน 200 ตัวอักษร";
    if (form.laws.length === 0) e.laws = "เลือกพรบ. อย่างน้อย 1 หมวด";
    if (!form.source) e.source = "เลือกที่มาของผู้ร้อง";
    if (form.problems.length === 0) e.problems = "เลือกประเภทปัญหาอย่างน้อย 1 ข้อ";
    setErrors(e);
    setWarnings(w);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) {
      toast.push({ kind: "error", title: "กรอกข้อมูลไม่ครบ", msg: "กรุณาตรวจสอบฟิลด์ที่มีเครื่องหมาย *" });
      setTimeout(() => {
        const el = document.querySelector(".input.error, .select.error, .field-error");
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 50);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        etracking: form.etracking, letterNo: form.letterNo, letterDate: form.letterDate,
        postNo: form.postNo, postDate: form.postDate, title: form.title,
        laws: form.laws, problems: form.problems, source: form.source,
        complainant: { ...form.complainant }, respondent: { ...form.respondent },
        product: form.product, productLicense: form.productLicense,
        bountyAmount: form.bountyAmount ? Number(form.bountyAmount) : null,
        description: form.description, attachments: form.attachments,
      });
    } catch (err) {
      setSaving(false);
      if (err.status === 409) setErrors((e) => ({ ...e, etracking: "เลขนี้มีในระบบแล้ว" }));
      toast.push({ kind: "error", title: "บันทึกไม่สำเร็จ", msg: err.message });
    }
  }

  return (
    <main className="page page-narrow fade-in">
      <div className="page-header">
        <div>
          <h1>{headerTitle}</h1>
          <div className="page-meta">{headerSub}</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-outline" onClick={onCancel}><Icon name="x" size={16} /> ยกเลิก</button>
        </div>
      </div>

      {banner}

      <div className="stack">
        <div className="form-section highlight">
          <div className="section-head">
            <div className="section-num">1</div>
            <div><div className="section-title">เลขอ้างอิง</div><div className="section-sub">⚠️ ระบบไม่ generate เลขเหล่านี้ — กรุณากรอกจากเอกสาร/ระบบต้นทาง</div></div>
          </div>
          <div className="section-body">
            <div className="form-grid cols-2">
              <FormField label="E-tracking Number" req error={errors.etracking}>
                <input className={`input mono ${errors.etracking ? "error" : ""}`} placeholder="เช่น ECP-2569-00123" value={form.etracking} onChange={(e) => update("etracking", e.target.value)} />
              </FormField>
              <div></div>
              <FormField label="เลขรับหนังสือ" req error={errors.letterNo}>
                <input className={`input mono ${errors.letterNo ? "error" : ""}`} placeholder="เช่น นบ 0032.2/345" value={form.letterNo} onChange={(e) => update("letterNo", e.target.value)} />
              </FormField>
              <FormField label="วันที่ของหนังสือ" req error={errors.letterDate} warning={warnings.letterDate}>
                <input type="date" className={`input ${errors.letterDate ? "error" : ""}`} value={form.letterDate} onChange={(e) => update("letterDate", e.target.value)} />
              </FormField>
              <FormField label="เลขรับ POST" req error={errors.postNo}>
                <input className={`input mono ${errors.postNo ? "error" : ""}`} placeholder="เช่น POST-2569-0421" value={form.postNo} onChange={(e) => update("postNo", e.target.value)} />
              </FormField>
              <FormField label="วันที่ลงรับ POST" req error={errors.postDate}>
                <input type="date" className={`input ${errors.postDate ? "error" : ""}`} value={form.postDate} onChange={(e) => update("postDate", e.target.value)} />
                <span className="hint">เป็นจุดเริ่มต้นการนับ SLA</span>
              </FormField>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-head"><div className="section-num">2</div><div><div className="section-title">ข้อมูลผู้ร้องเรียน</div><div className="section-sub">ข้อมูลส่วนบุคคล — ระวัง PDPA</div></div></div>
          <div className="section-body">
            <div className="row" style={{ marginBottom: 12 }}>
              <label className="checkbox">
                <input type="checkbox" checked={form.complainant.anonymous} onChange={(e) => update("complainant.anonymous", e.target.checked)} />
                ไม่ระบุตัวตน (นิรนาม)
              </label>
            </div>
            <div className="form-grid cols-2">
              <FormField label="ชื่อ-นามสกุล">
                <input className="input" disabled={form.complainant.anonymous} placeholder="เช่น นายสมหมาย ใจดี"
                  value={form.complainant.anonymous ? "ไม่ระบุ/นิรนาม" : form.complainant.name} onChange={(e) => update("complainant.name", e.target.value)} />
              </FormField>
              <FormField label="ช่องทางการร้องเรียน" req error={errors.channel}>
                <select className={`select ${errors.channel ? "error" : ""}`} value={form.complainant.channel} onChange={(e) => update("complainant.channel", e.target.value)}>
                  <option value="">-- เลือก --</option>
                  {cms.MASTER.channels.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </FormField>
              <FormField label="เบอร์โทร">
                <input className="input" placeholder="081-234-5678" value={form.complainant.phone} onChange={(e) => update("complainant.phone", e.target.value)} />
              </FormField>
              <FormField label="Email">
                <input type="email" className="input" placeholder="example@gmail.com" value={form.complainant.email} onChange={(e) => update("complainant.email", e.target.value)} />
              </FormField>
              <FormField label="ที่อยู่ติดต่อ" full>
                <textarea className="textarea" rows={2} placeholder="บ้านเลขที่ หมู่ ตำบล อำเภอ จังหวัด รหัสไปรษณีย์" value={form.complainant.address} onChange={(e) => update("complainant.address", e.target.value)} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-head"><div className="section-num">3</div><div><div className="section-title">ข้อมูลผู้ถูกร้อง</div><div className="section-sub">กรอกอย่างน้อย 1 ใน 2: ชื่อผู้รับอนุญาต / ชื่อสถานประกอบการ</div></div></div>
          <div className="section-body">
            <div className="form-grid cols-2">
              <FormField label="ชื่อผู้รับอนุญาต" error={errors.respondent && !form.respondent.licensee && !form.respondent.business ? errors.respondent : null}>
                <input className={`input ${errors.respondent ? "error" : ""}`} placeholder="เช่น นายอนุชา สังข์ทอง" value={form.respondent.licensee} onChange={(e) => update("respondent.licensee", e.target.value)} />
              </FormField>
              <FormField label="ชื่อสถานประกอบการ">
                <input className={`input ${errors.respondent ? "error" : ""}`} placeholder="เช่น ร้านยาดีใจเภสัช" value={form.respondent.business} onChange={(e) => update("respondent.business", e.target.value)} />
              </FormField>
              <FormField label="ที่อยู่" full>
                <textarea className="textarea" rows={2} placeholder="ที่อยู่ของสถานประกอบการ" value={form.respondent.address} onChange={(e) => update("respondent.address", e.target.value)} />
              </FormField>
              <FormField label="อำเภอ">
                <select className="select" value={form.respondent.district} onChange={(e) => update("respondent.district", e.target.value)}>
                  <option value="">-- เลือกอำเภอ --</option>
                  {cms.MASTER.districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </FormField>
              <FormField label="เลขที่ใบอนุญาต">
                <input className="input mono" placeholder="เช่น ขย.1-นบ-0123" value={form.respondent.licenseNo} onChange={(e) => update("respondent.licenseNo", e.target.value)} />
              </FormField>
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-head"><div className="section-num">4</div><div><div className="section-title">รายละเอียดเรื่องร้องเรียน</div><div className="section-sub">หัวข้อหลักของเคส · พรบ. · ประเภทปัญหา</div></div></div>
          <div className="section-body stack">
            <FormField label="ชื่อกรณีร้องเรียน" req error={errors.title} hint={`${form.title.length}/200 ตัวอักษร · 5–200`}>
              <input className={`input ${errors.title ? "error" : ""}`} placeholder="เช่น ร้านขายยาแผนปัจจุบันไม่มีเภสัชกรประจำ" value={form.title} onChange={(e) => update("title", e.target.value.slice(0, 200))} />
            </FormField>
            <FormField label="พรบ. ที่เกี่ยวข้อง" req error={errors.laws}>
              <ChipPicker options={cms.MASTER.laws.map((l) => ({ id: l.id, label: l.label }))} value={form.laws} onChange={(v) => update("laws", v)} />
            </FormField>
            <FormField label="ที่มา (ผู้ร้องพบสินค้าฯ ได้อย่างไร)" req error={errors.source}>
              <select className={`select ${errors.source ? "error" : ""}`} value={form.source} onChange={(e) => update("source", e.target.value)}>
                <option value="">-- เลือกที่มา --</option>
                {cms.MASTER.sources.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <div className="form-grid cols-2">
              <FormField label="ผลิตภัณฑ์/บริการที่เกิดปัญหา">
                <input className="input" placeholder="เช่น ยาแผนปัจจุบัน" value={form.product} onChange={(e) => update("product", e.target.value)} />
              </FormField>
              <FormField label="เลข อย./ทะเบียน/เลขที่จดแจ้ง">
                <input className="input mono" placeholder="ถ้าไม่มี ใส่ —" value={form.productLicense} onChange={(e) => update("productLicense", e.target.value)} />
              </FormField>
            </div>
            <FormField label="ประเภทปัญหา" req error={errors.problems}>
              <ChipPicker options={cms.MASTER.problems.map((p) => ({ id: p, label: p }))} value={form.problems} onChange={(v) => update("problems", v)} />
            </FormField>
            <div className="form-grid cols-2">
              <FormField label="สินบนรางวัล (บาท)">
                <input type="number" className="input mono" placeholder="0.00" value={form.bountyAmount} onChange={(e) => update("bountyAmount", e.target.value)} />
              </FormField>
            </div>
            <FormField label="รายละเอียดเพิ่มเติม" hint="อธิบายข้อเท็จจริงและสิ่งที่ผู้ร้องเรียนต้องการ">
              <textarea className="textarea" rows={4} placeholder="รายละเอียดของเรื่องร้องเรียน..." value={form.description} onChange={(e) => update("description", e.target.value)} />
            </FormField>
          </div>
        </div>

        <div className="form-section">
          <div className="section-head"><div className="section-num">5</div><div><div className="section-title">หลักฐานและผู้รับผิดชอบ</div><div className="section-sub">อัปโหลดเอกสาร · ผู้รับผิดชอบจะกำหนดในขั้นมอบหมาย</div></div></div>
          <div className="section-body stack">
            <FormField label="อัปโหลดหลักฐาน" hint="PDF / JPG / PNG · ≤ 20 MB ต่อไฟล์ · รวม ≤ 100 MB">
              <FileUpload files={form.attachments} onChange={(v) => update("attachments", v)} />
            </FormField>
            <div className="card-divider" />
            <div style={{ background: "var(--primary-50)", borderRadius: 10, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <Icon name="info" size={20} style={{ color: "var(--primary-700)", marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>ผู้รับผิดชอบ</div>
                <div className="small muted">หัวหน้ากลุ่มงานจะมอบหมายเจ้าหน้าที่ผู้รับผิดชอบหลังจากที่คุณบันทึกเคส สถานะเริ่มต้นจะเป็น "รอมอบหมาย" (SLA 3 วันจากวันที่ลงรับ POST)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "sticky", bottom: 0, marginTop: 24, padding: "16px 0", background: "linear-gradient(0deg, var(--bg) 70%, transparent)", zIndex: 5 }}>
        <div className="row end" style={{ gap: 10 }}>
          <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>
          <button className="btn btn-primary btn-lg" disabled={saving} onClick={submit}><Icon name="check" size={16} /> {submitLabel}</button>
        </div>
      </div>
    </main>
  );
}
