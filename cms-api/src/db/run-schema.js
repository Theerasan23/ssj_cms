// Runs schema.sql against the configured database.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "cms",
    multipleStatements: true,
    charset: "utf8mb4",
  });
  console.log(`→ applying schema to database '${process.env.MYSQL_DATABASE}' ...`);
  await conn.query(sql);
  await conn.end();
  console.log("✓ schema applied");
}

main().catch((e) => {
  console.error("✗ schema failed:", e.message);
  process.exit(1);
});
