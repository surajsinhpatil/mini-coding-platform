// controllers/problem.controller.js
// -----------------------------------------------------------------------------
// The HTTP layer for problems. A controller's job: read the request, call the
// model, and shape the JSON response (and status code). It contains NO SQL and
// NO database details — that's the model's job.
// -----------------------------------------------------------------------------

import * as Problem from "../models/problem.model.js";
import { ApiError } from "../middleware/errorHandler.js";

// GET /api/problems  -> the catalog list
export async function listProblems(req, res) {
  const problems = await Problem.findAll();
  res.json(problems);
}

// GET /api/problems/:slug  -> one problem + its SAMPLE test cases only
export async function getProblem(req, res) {
  const { slug } = req.params;

  const problem = await Problem.findBySlug(slug);
  if (!problem) {
    // Throwing an ApiError lets the central errorHandler format the 404.
    throw new ApiError(404, `Problem "${slug}" not found`);
  }

  // Attach sample tests (safe to expose). Hidden tests are NEVER sent out.
  const samples = await Problem.findSampleTestCases(problem.id);

  res.json({ ...problem, samples });
}
