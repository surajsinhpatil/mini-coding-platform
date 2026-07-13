// middleware/asyncHandler.js
// -----------------------------------------------------------------------------
// A tiny helper that removes repetitive try/catch from every async controller.
//
// Express (v4) does NOT automatically catch errors thrown inside an `async`
// route handler — a rejected promise would hang the request. Wrapping a handler
// in asyncHandler() catches any thrown/rejected error and forwards it to
// Express's error pipeline via next(err), where our errorHandler deals with it.
//
// Usage:  router.get("/", asyncHandler(async (req, res) => { ... }))
// -----------------------------------------------------------------------------

export function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
