# Layer 3 — Backend API (Express) (study notes)

Goal of this layer: expose the database through a clean REST API, organized in
layers so each file has one job. This is where "modular Express architecture"
from the resume bullet becomes real.

---

## 1. The layered architecture

A request flows top-to-bottom, and each layer only talks to the one below it:

```
HTTP request
   │
   ▼
routes/         maps  URL + method  →  a controller function
   │            (problem.routes.js, submission.routes.js)
   ▼
controllers/    HTTP logic: read req, validate, pick status codes, shape JSON
   │            (no SQL here)
   ▼
models/         database logic: the actual SQL for one table group
   │            (no HTTP here)
   ▼
config/db.js    the pg connection pool  →  PostgreSQL
```

Why bother? **Separation of concerns.** If the URL changes, only a route file
changes. If the JSON shape changes, only a controller changes. If the schema
changes, only a model changes. Each file is small, testable, and has a single
reason to change.

Cross-cutting helpers live in **middleware/**: `asyncHandler` (catch errors from
async handlers), `errorHandler` (one place that formats every error response),
and `notFound` (clean JSON 404).

---

## 2. The endpoints

| Method & path                             | What it does                                  |
|-------------------------------------------|-----------------------------------------------|
| `GET  /api/health`                        | liveness check (Layer 1)                      |
| `GET  /api/problems`                      | list all problems (summary columns)           |
| `GET  /api/problems/:slug`                | one problem + **sample** tests only           |
| `GET  /api/problems/:id/submissions`      | submission history for a problem              |
| `POST /api/submissions`                   | submit code → judge it → return the verdict   |
| `GET  /api/submissions/:id`               | fetch one submission                          |

**REST conventions:** the URL names a *resource* (`/problems`, `/submissions`);
the HTTP *method* names the action — `GET` reads, `POST` creates. Status codes
carry meaning: `200` OK, `201` Created, `400` bad request, `404` not found,
`500` server error.

**Security detail worth saying out loud:** `GET /api/problems/:slug` returns only
`is_sample = true` test cases. Hidden tests never leave the server — otherwise a
user could read the answers. The judge loads *all* tests server-side only.

---

## 3. How a submission request is handled

`POST /api/submissions` with `{ problemId, language:"cpp", sourceCode }`:

1. **Validate** the body (non-empty code, supported language) → `400` if bad.
2. **Check** the problem exists → `404` if not.
3. **Insert** a submission row as `Pending` (persist before doing work, so a
   crash never loses the attempt).
4. **Load** the problem's hidden + sample test cases.
5. **Judge** by calling the execution engine (Layer 4) → a verdict object.
6. **Save** the verdict onto the row and return the finished submission (`201`).

Right now step 5 runs *inside* the request (synchronous judging). The `Pending`
row + separate `saveResult` step is deliberately the same shape you'd keep if you
later move judging to a background worker/queue — the API wouldn't have to change.

---

## 4. Concepts you must be able to explain

**Controller vs model vs route** — route = mapping, controller = HTTP logic,
model = SQL. The phrase to use is *separation of concerns*.

**Middleware chain & order** — middleware run in the order they're `app.use`'d.
`cors()` and `express.json()` run first; the 404 and error handlers are registered
**last** so they only catch what nothing else handled.

**Error handling in Express** — a middleware with four args `(err, req, res,
next)` is the error handler. Async handlers don't auto-forward rejections in
Express 4, so `asyncHandler` wraps them and does `.catch(next)`. Controllers just
`throw new ApiError(404, "...")` and the handler formats it.

**RETURNING \*** — a Postgres feature: `INSERT ... RETURNING *` gives back the
inserted row (with its new id) in the same round-trip, so we don't need a second
SELECT.

**Status codes** — know `200/201/400/404/500` and when each applies.

**Statelessness** — each request carries everything it needs; the server keeps no
per-client session in memory. This is what lets you run many API instances behind
a load balancer.

---

## 5. Likely interview questions for this layer

- *Describe your API's structure. What lives in a route vs a controller vs a model?*
- *Why separate them? What changes if the database schema changes?*
- *How does Express handle errors, and how do you catch errors from async code?*
- *Why register the 404 and error handlers last?*
- *How do you prevent hidden test cases from leaking to the client?*
- *Walk me through what happens on POST /api/submissions.*
- *Why insert a "Pending" submission before running the judge?*
- *What HTTP status codes do you return, and when?*
- *What makes an API RESTful?*

---

## 6. How to run it

```bash
cd backend
npm install
npm run db:reset        # tables + sample data (needs PostgreSQL running)
npm run dev             # start the API on http://localhost:4000

# try it:
curl http://localhost:4000/api/problems
curl http://localhost:4000/api/problems/sum-of-two-numbers
```

---

Next layer: **the execution engine** — compile the submitted C++ with g++, run it
against every hidden test case with a time limit, and turn the results into a
verdict (Accepted / Wrong Answer / TLE / Runtime Error / Compilation Error).
