// middleware/notFound.js
// -----------------------------------------------------------------------------
// The last middleware in the chain. If a request reached here, no route matched,
// so we send a clean JSON 404 instead of Express's default HTML page.
// -----------------------------------------------------------------------------

export function notFound(req, res) {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
}
