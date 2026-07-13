// scripts/run-sql.js
// -----------------------------------------------------------------------------
// Runs a .sql file against the database using the SAME connection the app uses.
//
// Why this exists: the old npm scripts called `psql "$DATABASE_URL" -f ...`, but
// $DATABASE_URL lives in .env and is only loaded by dotenv INSIDE Node — a raw
// shell never sees it, so psql fell back to defaults and failed. Running the SQL
// through our own pg pool fixes that and removes the need for psql entirely.
//
// Usage:  node scripts/run-sql.js src/db/schema.sql
// -----------------------------------------------------------------------------

import "dotenv/config"; // load DATABASE_URL from .env
import { readFile } from "node:fs/promises";
import { pool } from "../src/config/db.js";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-sql.js <path-to-.sql>");
  process.exit(1);
}

try {
  const sql = await readFile(file, "utf8");
  // node-postgres runs multiple ;-separated statements in one simple query.
  await pool.query(sql);
  console.log(`✓ Ran ${file}`);
} catch (err) {
  console.error(`✗ Failed running ${file}:\n  ${err.message}`);
  if (/does not exist/.test(err.message)) {
    console.error(
      "\nHint: create the database first with:  createdb mini_coding_platform\n" +
        "and check DATABASE_URL in backend/.env matches your PostgreSQL setup."
    );
  }
  process.exit(1);
} finally {
  await pool.end();
}
