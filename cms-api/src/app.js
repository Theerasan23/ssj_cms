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

const app = express();

const origins = (process.env.CORS_ORIGIN || "http://localhost:3000").split(",").map((s) => s.trim());
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

// 404
app.use((req, res) => res.status(404).json({ error: "ไม่พบ endpoint นี้" }));

// error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
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
