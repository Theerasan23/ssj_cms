// การ์ด KPI กดเข้าไปดูรายการเคสตามตัวกรองของการ์ดนั้นได้ (หน้า /cases อ่านตัวกรองจาก query string)
// ใช้ role=button + Enter/Space เพราะ .kpi-card เป็น div ที่มีไอคอน/ข้อความซ้อนอยู่แล้ว
export const cardLink = (router, href, title = "ดูรายการเคสตามตัวกรองนี้") => ({
  role: "button",
  tabIndex: 0,
  title,
  onClick: () => router.push(href),
  onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); router.push(href); } },
});
