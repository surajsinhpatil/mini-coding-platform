// models/submission.model.js
// -----------------------------------------------------------------------------
// The DATA-ACCESS layer for submissions. All SQL touching the `submissions`
// table lives here.
//
// A submission has a two-step lifecycle in the database:
//   1. create(...)       -> insert a row with verdict 'Pending'
//   2. saveResult(...)   -> after judging, update it with the final verdict
// Storing the 'Pending' row first means we never lose a submission even if the
// judge crashes mid-run, and it's the foundation for async judging later.
// -----------------------------------------------------------------------------

import { query } from "../config/db.js";

// Insert a new submission in the 'Pending' state and return the created row.
// RETURNING * gives us the row back (including its new id) in one round-trip.
export async function create({ problemId, userId = null, language = "cpp", sourceCode }) {
  const { rows } = await query(
    `INSERT INTO submissions (problem_id, user_id, language, source_code, verdict)
     VALUES ($1, $2, $3, $4, 'Pending')
     RETURNING *`,
    [problemId, userId, language, sourceCode]
  );
  return rows[0];
}

// Write the judge's result back onto an existing submission.
export async function saveResult(id, { verdict, runtimeMs = null, failedTest = null, detail = null }) {
  const { rows } = await query(
    `UPDATE submissions
        SET verdict = $2, runtime_ms = $3, failed_test = $4, detail = $5
      WHERE id = $1
      RETURNING *`,
    [id, verdict, runtimeMs, failedTest, detail]
  );
  return rows[0];
}

// Fetch a single submission by id (to poll its result).
export async function findById(id) {
  const { rows } = await query(`SELECT * FROM submissions WHERE id = $1`, [id]);
  return rows[0];
}

// Submission history for a problem, newest first. We omit source_code from the
// list to keep the payload small.
export async function findByProblem(problemId) {
  const { rows } = await query(
    `SELECT id, problem_id, language, verdict, runtime_ms, failed_test, created_at
       FROM submissions
      WHERE problem_id = $1
   ORDER BY created_at DESC
      LIMIT 50`,
    [problemId]
  );
  return rows;
}
