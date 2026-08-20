// นิยาม "นับเคสยังไง" ที่ใช้ร่วมกันทั้งหน้าหลักและหน้ารายงาน · KPI
// เดิมแต่ละหน้าคำนวณเอง ตัวเลขจึงไม่ตรงกัน (หน้าหลักนับร่าง+เคสยกเลิกด้วย ส่วนหน้ารายงาน
// นับเฉพาะเคสที่สร้างในช่วงที่เลือก) — ทุกหน้าต้องเรียกจากไฟล์นี้เท่านั้น

// เคสที่ถูกยกเลิกไม่ใช่ปริมาณงาน จึงไม่ถูกนับรวมใน KPI (แสดงแยกเป็นหมายเหตุ)
export const CANCELLED = "08";

// ขั้นตอน SLA เรียงตาม workflow · `short` คือป้ายบนการ์ด (ชื่อเต็มจาก /master ยาวเกินไป)
// `status` = สถานะเคสที่ตรงกับขั้นนั้น ใช้เป็นตัวกรองตอนกดการ์ดไปหน้า /cases
export const SLA_STAGES = [
  { stage: "assign", short: "รอมอบหมาย", status: "01" },
  { stage: "invest", short: "ตรวจสอบ", status: "02" },
  { stage: "board", short: "กรรมการ", status: "03" },
  { stage: "fine", short: "ค่าปรับ", status: "04" },
];

// ขั้น SLA ที่เคสกำลังอยู่ ตัดสินจากสถานะ (ตรงกับ sla.js caseSla)
export const STAGE_BY_STATUS = { "01": "assign", "02": "invest", "03": "board", "04": "fine" };

// ฐานการนับของทุกตัวเลขบน KPI: เอาร่าง (ยังไม่ส่งเข้าระบบ) และเคสที่ยกเลิกออก
// คืนจำนวนที่ตัดออกมาด้วย เพื่อให้หน้าจอบอกผู้ใช้ได้ว่าเลขนี้ไม่รวมอะไรบ้าง
export function reportScope(cases) {
  const submitted = cases.filter((c) => !c.isDraft);
  return {
    scoped: submitted.filter((c) => c.status !== CANCELLED),
    draftCount: cases.length - submitted.length,
    cancelledCount: submitted.filter((c) => c.status === CANCELLED).length,
  };
}

// งานค้างแยกตามขั้นที่เคสอยู่ตอนนี้ — nearSoonest = วันที่เหลือของเคสที่ด่วนที่สุดในขั้นนั้น
export function stageBreakdown(activeCases, cms) {
  return SLA_STAGES.map((s) => {
    const at = activeCases.filter((c) => STAGE_BY_STATUS[c.status] === s.stage);
    const slas = at.map((c) => cms.caseSla(c));
    const near = slas.filter((x) => x.kind === "near");
    return {
      ...s,
      label: cms.MASTER.slaConfig?.find((x) => x.stage === s.stage)?.label || s.short,
      days: cms.MASTER.slaDays?.[s.stage],
      count: at.length,
      near: near.length,
      nearSoonest: near.length ? Math.min(...near.map((x) => x.daysLeft ?? 0)) : null,
      overdue: slas.filter((x) => x.kind === "overdue").length,
    };
  });
}

// เคสที่ต้องเร่ง เรียงจากด่วนที่สุด — near = เหลือ ≤ 3 วัน (เกณฑ์เดียวกับ sla.js)
// overdue แยกออกมาเพราะเลยกำหนดแล้ว (daysLeft ติดลบ) ไม่ใช่ "ใกล้จะเกิน" อีกต่อไป
export function deadlineWatch(cases, cms) {
  const rows = cases
    .filter((c) => !c.closed)
    .map((c) => ({ c, sla: cms.caseSla(c) }))
    .filter((r) => r.sla.kind === "near" || r.sla.kind === "overdue")
    // daysLeft ไม่มีค่าเมื่อขั้นนั้นถูกตัดสินจากวันที่บันทึกไว้แล้ว (เกินเวลาแบบไม่มีนับถอยหลัง)
    .map((r) => ({ ...r, daysLeft: r.sla.daysLeft ?? null, stage: STAGE_BY_STATUS[r.c.status] || null }))
    .sort((a, b) => (a.daysLeft ?? -9999) - (b.daysLeft ?? -9999));
  return {
    near: rows.filter((r) => r.sla.kind === "near"),
    overdue: rows.filter((r) => r.sla.kind === "overdue"),
  };
}

// % เคส on-time — เดิมหารด้วยเคสทั้งหมด เคสที่ยัง "ตัดสินไม่ได้" (kind pending: ไม่มีวันลงรับ POST
// หรือยังไม่เคยถูกมอบหมาย จึงไม่มีจุดตั้งต้นนับ SLA) เลยถูกนับเป็นไม่ on-time ไปด้วย
// ทำให้ตัวเลขต่ำกว่าความจริง (ข้อมูลจริง: 26/48 = 54% ทั้งที่ควรเป็น 26/43 = 60%)
export function onTimeRate(cases, cms) {
  let onTime = 0, overdue = 0, unmeasurable = 0;
  for (const c of cases) {
    const s = cms.caseSla(c);
    if (c.closed || s.kind === "in-time" || s.kind === "far") onTime++;
    else if (s.kind === "overdue") overdue++;
    else unmeasurable++; // pending — ยังไม่มีจุดอ้างอิง SLA
  }
  const measurable = onTime + overdue;
  return { onTime, overdue, unmeasurable, measurable, pct: measurable ? Math.round((onTime / measurable) * 100) : null };
}

// ประเภทปัญหา — เคสหนึ่งเลือกได้หลายข้อ ผลรวมจึงมากกว่าจำนวนเคสได้
// "อื่น ๆ" ที่ผู้ใช้พิมพ์เองถูกยุบรวมเป็นรายการเดียว (ข้อความอิสระ นับแยกไม่มีความหมาย)
export function problemBreakdown(cases) {
  const map = new Map();
  for (const c of cases) {
    for (const name of c.problems || []) {
      const key = String(name).trim();
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "th"));
}

// ผลการดำเนินงานของเจ้าหน้าที่หนึ่งคน — "เคสในมือ" = เคสที่ได้รับมอบหมายและยังไม่ปิด
// byLaw: เคสหนึ่งอาจมีหลายพรบ. จึงถูกนับในทุกพรบ.ที่เกี่ยวข้อง (ผลรวมมากกว่าเคสในมือได้)
export function officerPerformance(officer, cases, cms) {
  const mine = cases.filter((c) => c.assignees.includes(officer.id));
  const active = mine.filter((c) => !c.closed);
  const countAt = (code) => active.filter((c) => c.status === code).length;

  const byLaw = cms.MASTER.laws
    .map((l) => ({ id: l.id, label: l.label, cases: active.filter((c) => (c.laws || []).includes(l.id)) }))
    .filter((l) => l.cases.length > 0)
    .sort((a, b) => b.cases.length - a.cases.length);
  const noLaw = active.filter((c) => !(c.laws || []).length);
  if (noLaw.length) byLaw.push({ id: "_none", label: "ไม่ระบุ พรบ.", cases: noLaw });

  return {
    officer,
    inHand: active.length,
    total: mine.length,
    closed: mine.length - active.length,
    byLaw,
    stages: {
      assign: countAt("01"),
      invest: countAt("02"),
      board: countAt("03"),
      fine: countAt("04"),
      // 06 ส่งต่อ / 07 ดำเนินคดี / 09 เสนอนายแพทย์ยุติ — ยังไม่ปิด แต่ไม่มีกำหนด SLA แล้ว
      followup: active.filter((c) => ["06", "07", "09"].includes(c.status)).length,
    },
    overdue: active.filter((c) => cms.caseSla(c).kind === "overdue").length,
    near: active.filter((c) => cms.caseSla(c).kind === "near").length,
    locked: active.filter((c) => cms.isCaseLocked(c)).length,
  };
}
