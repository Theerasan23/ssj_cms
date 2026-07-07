// Thin fetch wrapper around the cms-api. The JWT is held in memory and set
// from the NextAuth session (see AppContext).
const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3021/api";

let _token = null;
export function getToken() { return _token; }
export function setToken(token) { _token = token || null; }
export function clearToken() { _token = null; }

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `เกิดข้อผิดพลาด (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Multipart upload (FormData) — let the browser set the multipart boundary.
async function upload(path, formData) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body: formData });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const err = new Error((data && data.error) || `อัปโหลดไม่สำเร็จ (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// Fetch a protected file as a Blob (auth is a Bearer header, so we can't use a plain <a href>).
async function blob(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) {
    let msg = `เปิดไฟล์ไม่สำเร็จ (${res.status})`;
    try { const j = JSON.parse(await res.text()); if (j.error) msg = j.error; } catch { /* ignore */ }
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return res.blob();
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
  del: (path) => request("DELETE", path),
  upload,
  blob,
};
