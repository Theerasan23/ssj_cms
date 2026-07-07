require("dotenv").config();
const app = require("./src/app");
const pool = require("./src/db");

const PORT = Number(process.env.PORT) || 3021;

async function start() {
  try {
    // verify DB connectivity on boot
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`✓ connected to MySQL '${process.env.MYSQL_DATABASE}' @ ${process.env.MYSQL_HOST}:${process.env.MYSQL_PORT || 3306}`);
    // Load admin-configured SLA durations into memory
    try {
      const days = await require("./src/services/settings.service").loadSlaIntoMemory();
      console.log("✓ SLA config loaded:", days);
    } catch (e) {
      console.warn("! could not load SLA config (using defaults):", e.message);
    }
  } catch (e) {
    console.error("✗ cannot connect to MySQL:", e.message);
    process.exit(1);
  }
  app.listen(PORT, () => console.log(`✓ cms-api listening on http://localhost:${PORT}`));
}

start();
