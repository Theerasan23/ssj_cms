#!/bin/sh
set -e

# By default we NEVER touch the database schema/data — the API just starts and connects
# to your existing DB. Auto-seed is opt-in (AUTO_SEED=true) and only runs against an
# empty/missing `cases` table, so it can't wipe a populated database.
if [ "$AUTO_SEED" = "true" ]; then
  echo "cms-api: AUTO_SEED enabled — checking database state..."
  if node -e "
const m = require('mysql2/promise');
(async () => {
  try {
    const c = await m.createConnection({
      host: process.env.MYSQL_HOST, port: +(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE,
    });
    const [r] = await c.query('SELECT COUNT(*) AS n FROM cases');
    await c.end();
    process.exit(r[0].n > 0 ? 0 : 10);   // 0 = already has data, 10 = empty
  } catch (e) { process.exit(0); }        // connect/query error → do NOT seed (fail safe)
})();
"; then
    echo "cms-api: database already has data (or unreachable) — skipping seed."
  else
    echo "cms-api: empty database — applying schema + seed..."
    npm run db:reset
  fi
fi

exec node index.js
