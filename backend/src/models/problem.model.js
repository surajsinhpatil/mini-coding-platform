// models/problem.model.js
// -----------------------------------------------------------------------------
// The DATA-ACCESS layer for problems. This is the only file that knows the SQL
// for the `problems` and `test_cases` tables. Controllers call these functions
// and never write SQL themselves.
//
// Why a separate layer? Separation of concerns:
//   routes      -> which URL maps to which handler
//   controllers -> HTTP logic (read req, validate, choose status codes)
//   models      -> database logic (the SQL)
// If the schema changes, only this file changes. Controllers stay untouched.
// -----------------------------------------------------------------------------

import { query } from "../config/db.js";

// List all problems for the catalog page. We deliberately DON'T return the full
// description here — a list only needs the summary columns.
export async function findAll() {
  const { rows } = await query(
    `SELECT id, slug, title, difficulty
       FROM problems
   ORDER BY id ASC`
  );
  return rows;
}

// Fetch one problem by its URL slug. Returns undefined if not found.
export async function findBySlug(slug) {
  const { rows } = await query(
    `SELECT id, slug, title, difficulty, description, time_limit_ms, memory_limit_mb
       FROM problems
      WHERE slug = $1`,
    [slug]
  );
  return rows[0];
}

// Fetch one problem by numeric id (used when creating a submission). Includes
// the resource limits the judge needs (time + memory).
export async function findById(id) {
  const { rows } = await query(
    `SELECT id, slug, title, difficulty, time_limit_ms, memory_limit_mb
       FROM problems
      WHERE id = $1`,
    [id]
  );
  return rows[0];
}

// Only the SAMPLE test cases — safe to show users in the problem statement.
export async function findSampleTestCases(problemId) {
  const { rows } = await query(
    `SELECT ordinal, input, expected_output
       FROM test_cases
      WHERE problem_id = $1 AND is_sample = true
   ORDER BY ordinal ASC`,
    [problemId]
  );
  return rows;
}

// ALL test cases (sample + hidden), ordered. Used ONLY by the judge on the
// server — these are never sent to the browser.
export async function findAllTestCases(problemId) {
  const { rows } = await query(
    `SELECT ordinal, input, expected_output
       FROM test_cases
      WHERE problem_id = $1
   ORDER BY ordinal ASC`,
    [problemId]
  );
  return rows;
}
