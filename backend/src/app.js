// app.js
// -----------------------------------------------------------------------------
// This file BUILDS the Express application: it wires up middleware and routes,
// then exports the app. It does NOT start listening for requests — that is done
// in server.js. Separating "build the app" from "start the server" is a common
// pattern: it makes the app easy to import in tests without opening a real port.
// -----------------------------------------------------------------------------

import express from "express";
import cors from "cors";

import healthRouter from "./routes/health.js";
import problemRouter from "./routes/problem.routes.js";
import submissionRouter from "./routes/submission.routes.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Create the Express application instance.
const app = express();

// ---- Global middleware -------------------------------------------------------
// Middleware are functions that run on EVERY request, in order, before it
// reaches a route handler.

// cors(): lets the React frontend (a different origin) call this API in the
// browser. In production set CORS_ORIGIN to your deployed frontend URL
// (e.g. https://your-app.vercel.app) to lock it down; if unset we allow all
// origins, which is convenient for local development.
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin } : {}));

// express.json(): parses incoming JSON request bodies into req.body.
// The submissions endpoint POSTs JSON, so we need this.
app.use(express.json({ limit: "1mb" })); // cap body size; source code isn't huge

// ---- Routes ------------------------------------------------------------------
// Each feature gets its own router, mounted under a path prefix. Adding a
// feature later = write a router + one app.use() line here.
app.use("/api/health", healthRouter);
app.use("/api/problems", problemRouter);
app.use("/api/submissions", submissionRouter);

// ---- Fallbacks (must be LAST) -----------------------------------------------
// notFound: no route matched -> clean JSON 404.
app.use(notFound);

// errorHandler: any error thrown/forwarded above ends up here (its 4-argument
// signature is what marks it as Express's error handler).
app.use(errorHandler);

export default app;
