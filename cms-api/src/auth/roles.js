// รองหัวหน้ากลุ่มงาน (deputy) carries exactly the same authority as หัวหน้ากลุ่มงาน (head).
// Keeping both ids in one place means a permission check can never accept one and forget
// the other — add a future equivalent role here and every route/service follows.
const HEAD_ROLES = ["head", "deputy"];

// Roles that oversee the whole workflow: approve, assign, cancel, extend SLA, unlock.
const SUPERVISOR_ROLES = [...HEAD_ROLES, "admin"];

const isSupervisor = (roleId) => SUPERVISOR_ROLES.includes(roleId);

// ทุกบทบาท "เปิดดู" เคสได้ทั้งหมด — สิทธิ์ที่คุมคือการ "แก้ไข/ดำเนินการ" เท่านั้น
// เขียนได้: ผู้ที่ได้รับมอบหมาย + หัวหน้า/รองหัวหน้า/แอดมิน
// ข้อยกเว้นที่คงไว้ตาม flow เดิม:
//   - ผู้สร้างเคส (ธุรการ) เฉพาะก่อนถูกมอบหมาย คือสถานะ 01 (ร่าง / รออนุมัติ / ถูกส่งกลับให้แก้)
//   - เจ้าหน้าที่ค่าปรับ (fine) เฉพาะขั้นชำระค่าปรับ คือสถานะ 04
// user = { roleId, userId }. เรียกกับเคสที่ประกอบ relations แล้ว (มี assignees)
function canWriteCase(c, user) {
  if (!c || !user) return false;
  if (isSupervisor(user.roleId)) return true;
  if (user.userId == null) return false;
  if (Array.isArray(c.assignees) && c.assignees.includes(user.userId)) return true;
  if (c.createdByUserId === user.userId && c.status === "01") return true;
  if (user.roleId === "fine" && c.status === "04") return true;
  return false;
}

const WRITE_DENIED_MSG = "แก้ไขได้เฉพาะเจ้าหน้าที่ที่ได้รับมอบหมาย หัวหน้า/รองหัวหน้ากลุ่มงาน หรือแอดมิน (ผู้สร้างเคสแก้ได้ก่อนถูกมอบหมาย · เจ้าหน้าที่ค่าปรับแก้ได้เฉพาะขั้นชำระค่าปรับ)";

module.exports = { HEAD_ROLES, SUPERVISOR_ROLES, isSupervisor, canWriteCase, WRITE_DENIED_MSG };
