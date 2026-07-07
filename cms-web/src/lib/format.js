// Display helpers — ported from cms-design/project/data.js
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// YYYY-MM-DD (AD) → "DD/MM/YYYY (BE)"
export function fmtThaiDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${+y + 543}`;
}

export function fmtThaiDateShort(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${+d} ${THAI_MONTHS[+m - 1]} ${(+y + 543).toString().slice(-2)}`;
}

export function fmtMoney(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("th-TH") + " บาท";
}
