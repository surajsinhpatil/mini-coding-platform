// config/db.js
// -----------------------------------------------------------------------------
// The single place that talks to PostgreSQL. Everything else in the app imports
// `query` from here instead of creating its own database connection.
//
// We use a CONNECTION POOL, not a single connection. Opening a new DB connection
// per request is slow. A pool keeps a small set of connections open and reuses
// them: each query borrows a connection, runs, and returns it to the pool.
// -----------------------------------------------------------------------------

import "dotenv/config";        // ensure DATABASE_URL is loaded before we read it
import pg from "pg";           // the standard PostgreSQL driver for Node

const { Pool } = pg;

// Hosted PostgreSQL (Neon, Render, etc.) requires an encrypted SSL connection;
// a local Postgres does not. We auto-detect: local (localhost/127.0.0.1) → no
// SSL, anything else → SSL. Override with PGSSL=true/false if needed.
// `rejectUnauthorized: false` accepts the provider's certificate without
// bundling their CA, which is the standard setup for these managed databases.
function sslConfig() {
  const url = process.env.DATABASE_URL || "";
  if (process.env.PGSSL === "false") return false;
  if (process.env.PGSSL === "true") return { rejectUnauthorized: false };
  return /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false };
}

// Create the pool from the DATABASE_URL in .env, e.g.
//   postgres://user:password@localhost:5432/mini_coding_platform   (local)
//   postgres://user:pass@ep-xxx.neon.tech/db?sslmode=require        (hosted)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig(),
});

// If a pooled connection errors out in the background, log it instead of letting
// it crash the whole process.
pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

/**
 * Run a parameterized SQL query.
 *
 * ALWAYS pass user values through `params`, never string-concatenate them into
 * the SQL text. The `$1, $2, ...` placeholders let the driver send values
 * separately from the query, which prevents SQL injection.
 *
 *   query("SELECT * FROM problems WHERE slug = $1", [slug])
 *
 * @param {string} text   SQL with $1, $2 ... placeholders
 * @param {Array}  params values for the placeholders
 * @returns {Promise<import('pg').QueryResult>}
 */
export function query(text, params) {
  return pool.query(text, params);
}

// Exposed so a startup check can verify the DB is reachable, and so tests can
// close the pool cleanly.
export { pool };
