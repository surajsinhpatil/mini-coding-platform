// controllers/submission.controller.js
// -----------------------------------------------------------------------------
// The HTTP layer for submissions — the heart of the platform. It ties together
// the database (models) and the execution engine (service):
//
//   1. Validate the request body.
//   2. Confirm the problem exists.
//   3. Save a 'Pending' submission (so nothing is ever lost).
//   4. Load the problem's hidden test cases.
//   5. Run the code through the execution engine -> a verdict.
//   6. Save the verdict back and return the finished submission.
//
// For now judging is SYNCHRONOUS (we run it inside the request and respond when
// done). That's simplest to reason about. The 'Pending' row + saveResult split
// is exactly what you'd keep if you later move judging to a background queue.
// -----------------------------------------------------------------------------

import * as Submission from "../models/submission.model.js";
import * as Problem from "../models/problem.model.js";
// Import from the execution engine's entry point, NOT a specific executor, so
// the host/docker choice is made by EXECUTION_MODE, not hard-coded here.
import { judge } from "../services/execution/index.js";
import { ApiError } from "../middleware/errorHandler.js";

// POST /api/submissions
// body: { problemId: number, language: "cpp", sourceCode: string }
export async function createSubmission(req, res) {
  const { problemId, language = "cpp", sourceCode } = req.body || {};

  // ---- 1. Validate input --------------------------------------------------
  if (!problemId || typeof sourceCode !== "string" || sourceCode.trim() === "") {
    throw new ApiError(400, "problemId and non-empty sourceCode are required");
  }
  if (language !== "cpp") {
    throw new ApiError(400, `Unsupported language "${language}" (only "cpp" for now)`);
  }

  // ---- 2. Make sure the problem exists ------------------------------------
  const problem = await Problem.findById(problemId);
  if (!problem) {
    throw new ApiError(404, `Problem id ${problemId} not found`);
  }

  // ---- 3. Persist a Pending submission before doing any work --------------
  const submission = await Submission.create({ problemId, language, sourceCode });

  // ---- 4. Load the hidden + sample test cases to judge against ------------
  const testCases = await Problem.findAllTestCases(problemId);

  // ---- 5. Run the execution engine ----------------------------------------
  const result = await judge({
    sourceCode,
    testCases,
    timeLimitMs: problem.time_limit_ms,
    memoryLimitMb: problem.memory_limit_mb,
  });

  // ---- 6. Save the verdict and return the finished submission -------------
  const finished = await Submission.saveResult(submission.id, {
    verdict: result.verdict,
    runtimeMs: result.runtimeMs,
    failedTest: result.failedTest,
    detail: result.detail,
  });

  res.status(201).json(finished);
}

// GET /api/submissions/:id  -> poll a single submission
export async function getSubmission(req, res) {
  const submission = await Submission.findById(req.params.id);
  if (!submission) {
    throw new ApiError(404, `Submission ${req.params.id} not found`);
  }
  res.json(submission);
}

// GET /api/problems/:problemId/submissions  -> history for a problem
export async function listForProblem(req, res) {
  const rows = await Submission.findByProblem(req.params.problemId);
  res.json(rows);
}
