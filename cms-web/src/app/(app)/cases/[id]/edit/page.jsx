"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { CaseForm, caseToForm } from "@/components/CaseForm";
import { useApp, useToasts } from "@/context/AppContext";
import { api } from "@/lib/api";

export default function CaseEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const { actions } = useApp();
  const toast = useToasts();
  const [caseObj, setCaseObj] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get(`/cases/${id}`)
      .then((c) => { if (alive) setCaseObj(c); })
      .catch(() => { if (alive) setCaseObj(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  async function onSubmit(payload) {
    await api.patch(`/cases/${id}`, payload);
    const files = (payload.attachments || []).map((a) => a._file).filter(Boolean);
    if (files.length) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      try { await api.upload(`/cases/${id}/attachments`, fd); }
      catch (e) { toast.push({ kind: "warn", title: "บันทึกแล้ว แต่แนบไฟล์ไม่สำเร็จ", msg: e.message }); }
    }
    toast.push({ kind: "success", title: "บันทึกการแก้ไขสำเร็จ", msg: caseObj?.returned ? "ส่งขออนุมัติอีกครั้งแล้ว" : "อัปเดตข้อมูลเคสแล้ว" });
    actions.reloadNotifications?.();
    router.push(`/cases/${id}`);
  }

  if (loading) return <main className="page"><div className="muted">กำลังโหลด…</div></main>;
  if (!caseObj) {
    return (
      <main className="page"><div className="card"><div className="table-empty">
        <div className="empty-icon"><Icon name="alert" size={26} /></div>
        <div style={{ fontWeight: 600 }}>ไม่พบเคสที่ต้องการแก้ไข</div>
        <button className="btn btn-primary" onClick={() => router.push("/cases")}>กลับสู่รายการเคส</button>
      </div></div></main>
    );
  }
  if (caseObj.status !== "01") {
    return (
      <main className="page"><div className="card"><div className="table-empty">
        <div className="empty-icon"><Icon name="lock" size={26} /></div>
        <div style={{ fontWeight: 600 }}>แก้ไขไม่ได้</div>
        <div className="small">แก้ไขได้เฉพาะเคสที่ยังอยู่ในสถานะ "รอมอบหมาย" เท่านั้น</div>
        <button className="btn btn-primary" onClick={() => router.push(`/cases/${id}`)}>กลับสู่รายละเอียดเคส</button>
      </div></div></main>
    );
  }

  const banner = caseObj.returned ? (
    <div className="lock-banner" style={{
      background: "linear-gradient(135deg, color-mix(in oklab, var(--warning-100) 85%, var(--surface)) 0%, color-mix(in oklab, var(--warning-100) 30%, var(--surface)) 100%)",
      borderColor: "color-mix(in oklab, var(--warning-700) 22%, transparent)", color: "var(--warning-700)",
    }}>
      <div className="lock-ic" style={{ background: "var(--warning-700)" }}><Icon name="alert" size={20} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="lock-title">เคสนี้ถูกหัวหน้าส่งกลับให้แก้ไข</div>
        <div className="lock-body">{caseObj.returnReason || "กรุณาตรวจสอบและแก้ไขข้อมูลให้ครบถ้วน แล้วบันทึกเพื่อส่งขออนุมัติอีกครั้ง"}</div>
      </div>
    </div>
  ) : null;

  return (
    <CaseForm
      initial={caseToForm(caseObj)}
      submitLabel={caseObj.returned ? "บันทึกและส่งขออนุมัติอีกครั้ง" : "บันทึกการแก้ไข"}
      headerTitle="แก้ไขเคสร้องเรียน"
      headerSub={`${caseObj.etracking} · แก้ไขได้ขณะรอมอบหมายเท่านั้น`}
      banner={banner}
      onSubmit={onSubmit}
      onCancel={() => router.push(`/cases/${id}`)}
    />
  );
}
