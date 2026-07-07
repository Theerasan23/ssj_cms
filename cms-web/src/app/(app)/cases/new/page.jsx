"use client";

import { useRouter } from "next/navigation";
import { CaseForm, blankCaseForm } from "@/components/CaseForm";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function CaseCreatePage() {
  const { cms, actions } = useApp();
  const toast = useToasts();
  const router = useRouter();

  async function onSubmit(payload) {
    const created = await api.post("/cases", payload);
    // upload any attached files to the freshly created case
    const files = (payload.attachments || []).map((a) => a._file).filter(Boolean);
    if (files.length) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      try { await api.upload(`/cases/${created.id}/attachments`, fd); }
      catch (e) { toast.push({ kind: "warn", title: "บันทึกเคสแล้ว แต่แนบไฟล์ไม่สำเร็จ", msg: e.message }); }
    }
    toast.push({ kind: "success", title: "บันทึกเคสสำเร็จ", msg: "ส่งให้หัวหน้ากลุ่มงานอนุมัติแล้ว (สถานะ 'รอมอบหมาย')" });
    actions.reloadNotifications?.();
    router.push(`/cases/${created.id}`);
  }

  return (
    <CaseForm
      initial={blankCaseForm(cms.TODAY)}
      submitLabel="บันทึกและส่งให้หัวหน้าอนุมัติ"
      headerTitle="สร้างเคสร้องเรียน"
      headerSub="บันทึกเรื่องร้องเรียนใหม่เข้าระบบ · กรอกเลขอ้างอิงจากเอกสารต้นทาง"
      onSubmit={onSubmit}
      onCancel={() => router.push("/cases")}
    />
  );
}
