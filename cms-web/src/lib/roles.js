// รองหัวหน้ากลุ่มงาน (deputy) carries exactly the same authority as หัวหน้ากลุ่มงาน (head).
// Mirrors cms-api/src/auth/roles.js — the API enforces these rules, this copy only decides
// what the UI offers. Keep the two lists in sync.
export const HEAD_ROLES = ["head", "deputy"];

// Roles that oversee the whole workflow: approve, assign, cancel, extend SLA.
export const SUPERVISOR_ROLES = [...HEAD_ROLES, "admin"];

export const isHeadLevel = (roleId) => HEAD_ROLES.includes(roleId);
export const isSupervisor = (roleId) => SUPERVISOR_ROLES.includes(roleId);

// เจ้าหน้าที่ดำเนินการเห็นเฉพาะเคสของตัวเอง — API กรองให้แล้ว (auth/roles.js canSeeCase)
// ที่นี่ใช้แค่ตัดสินใจว่า UI ควรซ่อนตัวเลือกที่ไม่มีความหมายสำหรับบทบาทนี้
export const OWN_CASES_ONLY_ROLES = ["officer"];
export const seesOwnCasesOnly = (roleId) => OWN_CASES_ONLY_ROLES.includes(roleId);
