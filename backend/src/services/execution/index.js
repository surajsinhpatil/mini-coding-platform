// services/execution/index.js
// -----------------------------------------------------------------------------
// The execution engine's PUBLIC entry point. The rest of the app imports
// `judge` from here and doesn't care *how* code runs.
//
// Two interchangeable engines implement the same judge() contract:
//   - host   : cppExecutor.js   – runs code directly on the machine (fast, dev)
//   - docker : dockerExecutor.js – runs code in a locked-down container (secure)
//
// EXECUTION_MODE in .env picks one. This is the Strategy pattern: swap the
// implementation behind a stable interface without touching the callers.
// -----------------------------------------------------------------------------

import { judge as hostJudge } from "./cppExecutor.js";
import { judge as dockerJudge } from "./dockerExecutor.js";

const MODE = (process.env.EXECUTION_MODE || "host").toLowerCase();

const engines = {
  host: hostJudge,
  docker: dockerJudge,
};

const selected = engines[MODE];
if (!selected) {
  throw new Error(`Unknown EXECUTION_MODE "${MODE}" (use "host" or "docker")`);
}

console.log(`Execution engine: ${MODE}`);

// Re-export the chosen engine under the same name the controller already uses.
export const judge = selected;
