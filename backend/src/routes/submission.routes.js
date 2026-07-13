// routes/submission.routes.js
// -----------------------------------------------------------------------------
// Routes for submissions: create one (which triggers judging) and fetch one.
// -----------------------------------------------------------------------------

import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { createSubmission, getSubmission } from "../controllers/submission.controller.js";

const router = Router();

// POST /api/submissions       -> submit code, run it, return the verdict
router.post("/", asyncHandler(createSubmission));

// GET  /api/submissions/:id   -> fetch one submission by id
router.get("/:id", asyncHandler(getSubmission));

export default router;
