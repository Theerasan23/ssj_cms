// Display helpers — ported from cms-design/project/data.js
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

// พ.ศ. = ค.ศ. + 543. Dates are stored/transported as ISO (ค.ศ.) everywhere;
// พ.ศ. exists only at the edges — what the user reads and types.
export const BE_OFFSET = 543;

// Below this a year can't plausibly be พ.ศ., so it's a typo rather than a date
// to shift by 543 (2026 would otherwise become 1483).
const MIN_BE_YEAR = 2400;

// YYYY-MM-DD (AD) → "DD/MM/YYYY (BE)"
export function fmtThaiDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${+y + BE_OFFSET}`;
}

// "2026-08-13" (ค.ศ.) → "13/08/2569" (พ.ศ.) — "" for anything that isn't a full ISO date.
export function isoToThai(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${+m[1] + BE_OFFSET}` : "";
}

// "13/08/2569" (พ.ศ.) → "2026-08-13" (ค.ศ.).
// Returns "" when the text is still incomplete or isn't a real calendar date.
export function thaiToIso(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text || "");
  if (!m) return "";
  const day = +m[1], month = +m[2], be = +m[3];
  if (be < MIN_BE_YEAR) return "";
  const y = be - BE_OFFSET;
  // Date rolls 31/02 over into March, so round-trip it to reject impossible days.
  const dt = new Date(Date.UTC(y, month - 1, day));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return "";
  return `${String(y).padStart(4, "0")}-${m[2]}-${m[1]}`;
}

export function fmtThaiDateShort(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${+d} ${THAI_MONTHS[+m - 1]} ${(+y + 543).toString().slice(-2)}`;
}

// DATETIME → "3 นาทีที่แล้ว" / "เมื่อวาน 14:05" / "13/08/2569 09:12"
// Computed at render time; notifications used to store a frozen "เมื่อสักครู่" label that
// never aged, so everything in the bell looked like it had just happened.
export function fmtSince(value) {
  if (!value) return "";
  // MySQL DATETIME comes back as "YYYY-MM-DD HH:MM:SS" (local time, no zone) — normalise
  // so Safari doesn't parse it as Invalid Date and it isn't misread as UTC.
  const dt = new Date(typeof value === "string" ? value.replace(" ", "T").slice(0, 19) : value);
  if (Number.isNaN(dt.getTime())) return "";
  const mins = Math.floor((Date.now() - dt.getTime()) / 60000);
  if (mins < 1) return "เมื่อสักครู่";
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
  const hhmm = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  if (hrs < 48) return `เมื่อวาน ${hhmm}`;
  const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  return `${fmtThaiDate(iso)} ${hhmm}`;
}

export function fmtMoney(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("th-TH") + " บาท";
}
