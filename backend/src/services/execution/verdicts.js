// services/execution/verdicts.js
// -----------------------------------------------------------------------------
// The set of verdicts the judge can return. These strings MUST match the
// `submission_verdict` ENUM in schema.sql exactly, because they are written
// straight into the database. Keeping them in one named place stops typos.
// -----------------------------------------------------------------------------

export const VERDICT = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  RUNTIME_ERROR: "Runtime Error",
  COMPILATION_ERROR: "Compilation Error",
};
