// รองหัวหน้ากลุ่มงาน (deputy) carries exactly the same authority as หัวหน้ากลุ่มงาน (head).
// Mirrors cms-api/src/auth/roles.js — the API enforces these rules, this copy only decides
// what the UI offers. Keep the two lists in sync.
export const HEAD_ROLES = ["head", "deputy"];

// Roles that oversee the whole workflow: approve, assign, cancel, extend SLA.
export const SUPERVISOR_ROLES = [...HEAD_ROLES, "admin"];

export const isHeadLevel = (roleId) => HEAD_ROLES.includes(roleId);
export const isSupervisor = (roleId) => SUPERVISOR_ROLES.includes(roleId);

// บทบาทที่เข้าหน้าค่าปรับได้ — กด "เพิ่มมาตรา" จากหน้านั้นได้ด้วย (เพิ่มอย่างเดียว · แก้ไข/ลบยังเป็นของ admin)
export const FINE_PAGE_ROLES = ["officer", "fine", ...SUPERVISOR_ROLES];

// ทุกบทบาทเปิดดูเคสได้ทั้งหมด — ที่จำกัดคือการแก้ไข/ดำเนินการ
// เขียนได้: ผู้ที่ได้รับมอบหมาย + หัวหน้า/รองหัวหน้า/แอดมิน
// ข้อยกเว้น: ผู้สร้างเคส (ธุรการ) เฉพาะสถานะ 01 (ร่าง/รออนุมัติ/ถูกส่งกลับ) · เจ้าหน้าที่ค่าปรับ เฉพาะสถานะ 04
// ตรงกับ cms-api/src/auth/roles.js canWriteCase ซึ่งเป็นตัวบังคับจริง — ที่นี่ใช้ซ่อน/ปิดปุ่มเท่านั้น
export const canWriteCase = (c, role) => {
  if (!c || !role) return false;
  if (isSupervisor(role.id)) return true;
  if (role.userId == null) return false;
  if (c.assignees.includes(role.userId)) return true;
  if (c.createdByUserId === role.userId && c.status === "01") return true;
  if (role.id === "fine" && c.status === "04") return true;
  return false;
};
