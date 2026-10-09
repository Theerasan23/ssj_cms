const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const masterRoutes = require("./routes/master.routes");
const caseRoutes = require("./routes/cases.routes");
const notificationRoutes = require("./routes/notifications.routes");
const publicRoutes = require("./routes/public.routes");
const auditRoutes = require("./routes/audit.routes");
const usersRoutes = require("./routes/users.routes");
const adminCasesRoutes = require("./routes/admin-cases.routes");

const app = express();

// Behind one reverse proxy in production → trust the first X-Forwarded-* hop so req.ip
// is the real client (login rate-limiter) and req.protocol reflects https.
app.set("trust proxy", 1);

// โดเมนจริงที่ระบบขึ้น production — อนุญาตไว้ในโค้ดเสมอ ไม่ต้องรอ .env
// (ไฟล์ .env ของเครื่อง server เป็นคนละไฟล์กับที่อยู่ใน git ถ้าลืมตั้ง CORS_ORIGIN บนเครื่องนั้น
//  เบราว์เซอร์จะโดน CORS block ทันทีทั้งที่โค้ดถูก — ใส่ไว้ตรงนี้กันพลาด)
const BUILT_IN_ORIGINS = ["https://drivethru-nontfda.moph.go.th"];

// CORS origin คือ scheme://host[:port] เท่านั้น "ไม่มี path"
// ถ้าตั้งค่ามาพร้อม path เช่น https://example.com/cms/ จะเทียบกับ header Origin ไม่ตรง
// แล้วโดน block เงียบ ๆ โดยไม่มี error บอก จึงตัดให้เหลือแค่ origin เสมอ
function toOrigin(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  try { return new URL(v).origin; } catch { return v.replace(/\/+$/, ""); }
}

const origins = [...new Set([
  ...(process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map(toOrigin),
  ...BUILT_IN_ORIGINS.map(toOrigin),
].filter(Boolean))];

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true, service: "cms-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin/cases", adminCasesRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: "ไม่พบ endpoint นี้" }));

// ชื่อคอลัมน์ → ชื่อฟิลด์ที่ผู้ใช้เห็นบนฟอร์ม ใช้ตอนข้อมูลยาวเกินความกว้างคอลัมน์
// (MySQL เปิด STRICT_TRANS_TABLES จึงโยน ER_DATA_TOO_LONG แทนที่จะตัดข้อความทิ้งเงียบ ๆ)
const COLUMN_LABELS = {
  etracking: "เลข E-tracking", letter_no: "เลขที่ลงรับ สสจ.", doc_no: "เลขที่หนังสือ", post_no: "เลขรับ POST",
  title: "ชื่อกรณีร้องเรียน", product: "ชื่อผลิตภัณฑ์", product_license: "เลขที่ใบอนุญาตผลิตภัณฑ์",
  problem_other: "ปัญหาอื่น ๆ (ระบุ)", bounty_amount: "สินบนนำจับ",
  bounty_first_name: "ชื่อผู้ประสงค์รับสินบนนำจับ", bounty_last_name: "นามสกุลผู้ประสงค์รับสินบนนำจับ", bounty_no: "เลขสินบนนำจับ",
  complainant_name: "ชื่อผู้ร้อง", complainant_phone: "เบอร์โทรผู้ร้อง", complainant_email: "อีเมลผู้ร้อง", complainant_address: "ที่อยู่ผู้ร้อง",
  respondent_licensee: "ชื่อผู้รับอนุญาต", respondent_business: "ชื่อสถานประกอบการ",
  respondent_address: "ที่อยู่ผู้ถูกร้อง", respondent_license_no: "เลขที่ใบอนุญาต",
  cancel_reason: "เหตุผลการยกเลิก", return_reason: "เหตุผลที่ส่งกลับ",
};

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // ข้อมูลยาวเกินคอลัมน์ — เดิมหลุดเป็น 500 พร้อมข้อความ MySQL ภาษาอังกฤษดิบ ๆ
  // ("Data too long for column 'complainant_address' at row 1") ผู้ใช้ไม่รู้ว่าช่องไหน
  if (err && err.code === "ER_DATA_TOO_LONG") {
    const col = (/column '(?:[^'.]+\.)?([^']+)'/.exec(err.message) || [])[1];
    const label = COLUMN_LABELS[col] || col || "บางช่อง";
    return res.status(400).json({ error: `ข้อความยาวเกินที่ระบบรับได้: ${label} — กรุณาย่อให้สั้นลง` });
  }
  // multer upload errors → 400 with a friendly Thai message
  if (err && err.name === "MulterError") {
    const msg = err.code === "LIMIT_FILE_SIZE" ? "ไฟล์ใหญ่เกิน 20 MB"
      : err.code === "LIMIT_FILE_COUNT" ? "อัปโหลดได้ครั้งละไม่เกิน 10 ไฟล์"
      : "อัปโหลดไฟล์ไม่สำเร็จ";
    return res.status(400).json({ error: msg });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "เกิดข้อผิดพลาดภายในระบบ" });
});

module.exports = app;
