// middleware/errorHandler.js
// -----------------------------------------------------------------------------
// The centralized error handler. In Express, a middleware with FOUR arguments
// (err, req, res, next) is special: Express treats it as an error handler and
// only calls it when something upstream passed an error to next(err) (which
// asyncHandler does for us).
//
// Centralizing errors here means individual controllers don't each format their
// own error responses — they just throw, and this one place decides the shape.
// -----------------------------------------------------------------------------

// A small helper so controllers can throw errors carrying an HTTP status code.
//   throw new ApiError(404, "Problem not found")
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line no-unused-vars  (Express needs the 4th `next` arg to
// recognize this as an error handler, even though we don't call it.)
export function errorHandler(err, req, res, next) {
  // Use the status attached to the error, or 500 (Internal Server Error) if none.
  const status = err.status || 500;

  // Log the full error server-side for debugging (never sent to the client).
  if (status >= 500) {
    console.error("Unhandled error:", err);
  }

  res.status(status).json({
    error: err.message || "Internal Server Error",
  });
}
