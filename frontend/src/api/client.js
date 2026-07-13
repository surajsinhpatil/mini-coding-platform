// api/client.js
// -----------------------------------------------------------------------------
// The ONE place the frontend talks to the backend. Every component imports these
// functions instead of calling fetch() directly, so if the API URL or error
// handling changes, it changes here only.
//
// Uses the browser's built-in `fetch`. Each call returns parsed JSON or throws
// an Error with the server's message so the UI can show it.
// -----------------------------------------------------------------------------

// Vite exposes env vars prefixed with VITE_. Fall back to localhost in dev.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// Small wrapper around fetch that adds JSON handling + error surfacing.
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // Try to parse JSON even on errors (our API returns { error } on failure).
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  // GET /api/problems  -> [{ id, slug, title, difficulty }, ...]
  listProblems: () => request("/problems"),

  // GET /api/problems/:slug  -> { ...problem, samples: [...] }
  getProblem: (slug) => request(`/problems/${slug}`),

  // POST /api/submissions  -> the judged submission with a verdict
  submit: ({ problemId, sourceCode, language = "cpp" }) =>
    request("/submissions", {
      method: "POST",
      body: JSON.stringify({ problemId, sourceCode, language }),
    }),
};
