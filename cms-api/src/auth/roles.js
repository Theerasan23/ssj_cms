// รองหัวหน้ากลุ่มงาน (deputy) carries exactly the same authority as หัวหน้ากลุ่มงาน (head).
// Keeping both ids in one place means a permission check can never accept one and forget
// the other — add a future equivalent role here and every route/service follows.
const HEAD_ROLES = ["head", "deputy"];

// Roles that oversee the whole workflow: approve, assign, cancel, extend SLA, unlock.
const SUPERVISOR_ROLES = [...HEAD_ROLES, "admin"];

const isSupervisor = (roleId) => SUPERVISOR_ROLES.includes(roleId);

module.exports = { HEAD_ROLES, SUPERVISOR_ROLES, isSupervisor };
