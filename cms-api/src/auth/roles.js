// รองหัวหน้ากลุ่มงาน (deputy) carries exactly the same authority as หัวหน้ากลุ่มงาน (head).
// Keeping both ids in one place means a permission check can never accept one and forget
// the other — add a future equivalent role here and every route/service follows.
const HEAD_ROLES = ["head", "deputy"];

// Roles that oversee the whole workflow: approve, assign, cancel, extend SLA, unlock.
const SUPERVISOR_ROLES = [...HEAD_ROLES, "admin"];

const isSupervisor = (roleId) => SUPERVISOR_ROLES.includes(roleId);

// เจ้าหน้าที่ดำเนินการ (officer) เห็นเฉพาะเคสของตัวเอง — เคสที่ได้รับมอบหมาย หรือที่ตัวเองสร้าง
// ทุกบทบาทอื่นยังเห็นทั้งระบบตามเดิม
const OWN_CASES_ONLY_ROLES = ["officer"];
const seesOwnCasesOnly = (roleId) => OWN_CASES_ONLY_ROLES.includes(roleId);

// currentRole = { id, userId }. เรียกกับเคสที่ประกอบ relations แล้ว (มี assignees)
function canSeeCase(c, currentRole) {
  if (!currentRole || !seesOwnCasesOnly(currentRole.id)) return true;
  const uid = currentRole.userId;
  if (uid == null) return false;
  return c.createdByUserId === uid || (Array.isArray(c.assignees) && c.assignees.includes(uid));
}

module.exports = { HEAD_ROLES, SUPERVISOR_ROLES, isSupervisor, OWN_CASES_ONLY_ROLES, seesOwnCasesOnly, canSeeCase };
