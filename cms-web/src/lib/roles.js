// รองหัวหน้ากลุ่มงาน (deputy) carries exactly the same authority as หัวหน้ากลุ่มงาน (head).
// Mirrors cms-api/src/auth/roles.js — the API enforces these rules, this copy only decides
// what the UI offers. Keep the two lists in sync.
export const HEAD_ROLES = ["head", "deputy"];

// Roles that oversee the whole workflow: approve, assign, cancel, extend SLA.
export const SUPERVISOR_ROLES = [...HEAD_ROLES, "admin"];

export const isHeadLevel = (roleId) => HEAD_ROLES.includes(roleId);
export const isSupervisor = (roleId) => SUPERVISOR_ROLES.includes(roleId);
