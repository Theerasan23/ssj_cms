// Lazily loads SheetJS (xlsx) from the official CDN, shared by import + export.
const SHEETJS_SRC = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
let loading = null;

export function ensureSheetJS() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SHEETJS_SRC;
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error("โหลดไลบรารี Excel ไม่สำเร็จ"));
    document.body.appendChild(s);
  });
  return loading;
}
