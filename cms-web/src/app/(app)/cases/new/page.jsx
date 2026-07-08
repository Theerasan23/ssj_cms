"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { CaseForm, blankCaseForm } from "@/components/CaseForm";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function CaseCreatePage() {
  const { cms, actions, role } = useApp();
  const toast = useToasts();
  const router = useRouter();

  // ตาม flow ใหม่ เจ้าหน้าที่พัสดุเป็นผู้สร้างเคส (หัวหน้า/Admin ทำแทนได้)
  if (!["supply", "head", "admin"].includes(role.id)) {
    return (
      <main className="page"><div className="card"><div className="table-empty">
        <div className="empty-icon"><Icon name="lock" size={26} /></div>
        <div style={{ fontWeight: 600 }}>เฉพาะเจ้าหน้าที่พัสดุ (หรือหัวหน้า/Admin) เท่านั้นที่สร้างเคสใหม่ได้</div>
        <button className="btn btn-primary" onClick={() => router.push("/cases")}>กลับสู่รายการเคส</button>
      </div></div></main>
    );
  }

  async function createCase(payload, draft) {
    const created = await api.post("/cases", { ...payload, draft });
    // upload any attached files to the freshly created case
    const files = (payload.attachments || []).map((a) => a._file).filter(Boolean);
    if (files.length) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      try { await api.upload(`/cases/${created.id}/attachments`, fd); }
      catch (e) { toast.push({ kind: "warn", title: "บันทึกเคสแล้ว แต่แนบไฟล์ไม่สำเร็จ", msg: e.message }); }
    }
    return created;
  }

  // ส่งขออนุมัติทันที → กลับสู่ "เคสของฉัน"
  async function onSubmit(payload) {
    await createCase(payload, false);
    toast.push({ kind: "success", title: "บันทึกเคสสำเร็จ", msg: "ส่งให้หัวหน้ากลุ่มงานอนุมัติแล้ว (สถานะ 'รอมอบหมาย')" });
    actions.reloadNotifications?.();
    router.push("/cases?scope=mine");
  }

  // บันทึกร่าง → ไปหน้าเคสเพื่อแก้ไข/ส่งขออนุมัติภายหลัง
  async function onSaveDraft(payload) {
    const created = await createCase(payload, true);
    toast.push({ kind: "success", title: "บันทึกร่างแล้ว", msg: "แก้ไขหรือกดส่งขออนุมัติได้จากหน้าเคส — หัวหน้าจะยังไม่เห็นเคสนี้" });
    router.push(`/cases/${created.id}`);
  }

  return (
    <CaseForm
      initial={blankCaseForm(cms.TODAY)}
      submitLabel="บันทึกและส่งให้หัวหน้าอนุมัติ"
      secondary={{ label: "บันทึกร่าง", icon: "edit", onSubmit: onSaveDraft }}
      headerTitle="สร้างเคสร้องเรียน"
      headerSub="บันทึกเรื่องร้องเรียนใหม่เข้าระบบ · กรอกเลขอ้างอิงจากเอกสารต้นทาง"
      onSubmit={onSubmit}
      onCancel={() => router.push("/cases")}
    />
  );
}
