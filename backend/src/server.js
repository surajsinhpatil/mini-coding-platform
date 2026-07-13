// server.js
// -----------------------------------------------------------------------------
// Entry point. Loads configuration, checks the database is reachable, imports
// the Express app, and starts listening for HTTP requests on a TCP port.
// -----------------------------------------------------------------------------

import "dotenv/config"; // loads variables from .env into process.env (side-effect import)
import app from "./app.js";
import { pool } from "./config/db.js";

// Read the port from the environment, with a sensible default.
const PORT = process.env.PORT || 4000;

// Quick startup check: prove we can reach PostgreSQL before serving traffic.
// We only warn (not crash) so you can still run the API while setting up the DB.
async function checkDatabase() {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connection: OK");
  } catch (err) {
    console.warn("PostgreSQL connection FAILED:", err.message);
    console.warn("The API will start, but DB-backed routes will error until the DB is up.");
  }
}

// Start the HTTP server. The callback runs once the server is ready.
await checkDatabase();
app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  console.log(`Health check:        http://localhost:${PORT}/api/health`);
});
