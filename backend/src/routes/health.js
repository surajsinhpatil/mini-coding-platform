// routes/health.js
// -----------------------------------------------------------------------------
// A "router" is a mini Express app: a group of related routes you can mount
// under a path prefix (here, /api/health from app.js).
//
// A health-check endpoint is a tiny route that just confirms the server is
// alive. It's the standard first thing to build and the standard thing load
// balancers / monitoring tools ping to ask "are you up?".
// -----------------------------------------------------------------------------

import { Router } from "express";

const router = Router();

// GET /api/health
// (req = incoming request, res = the response we send back)
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "mini-coding-platform-backend",
    time: new Date().toISOString(),
  });
});

export default router;
