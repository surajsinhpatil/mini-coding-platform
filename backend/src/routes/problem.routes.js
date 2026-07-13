// routes/problem.routes.js
// -----------------------------------------------------------------------------
// Routes for problems. A router just MAPS a URL + HTTP method to a controller
// function. All handlers are wrapped in asyncHandler so thrown errors flow to
// the central errorHandler.
// -----------------------------------------------------------------------------

import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { listProblems, getProblem } from "../controllers/problem.controller.js";
import { listForProblem } from "../controllers/submission.controller.js";

const router = Router();

// GET /api/problems           -> catalog list
router.get("/", asyncHandler(listProblems));

// GET /api/problems/:slug     -> one problem + sample tests
router.get("/:slug", asyncHandler(getProblem));

// GET /api/problems/:problemId/submissions -> that problem's submission history
router.get("/:problemId/submissions", asyncHandler(listForProblem));

export default router;
