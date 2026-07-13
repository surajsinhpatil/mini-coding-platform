# Layer 1 — Foundation & Architecture (study notes)

Goal of this layer: a running backend server you can hit in the browser, and a
clear mental model of how the whole platform fits together.

---

## 1. The mental model (how a coding platform works)

When you click "Submit" on LeetCode, this happens:

1. The **browser** (our React app) sends your code + the problem id to the server.
2. The **API server** (Express) receives it, saves a "submission" record to the
   **database** with status `Pending`.
3. The **execution engine** runs your code against each hidden **test case**:
   it feeds the test input to your program, captures what your program prints,
   and compares it to the expected output.
4. The engine produces a **verdict**: Accepted, Wrong Answer, Time Limit
   Exceeded (your code was too slow), or Runtime/Compile Error.
5. The verdict is saved back to the database, and the browser shows it.

Everything we build is one of these four pieces: **frontend, API, database,
execution engine.** Keep that map in your head — every file belongs to one box.

---

## 2. What we built in Layer 1

A minimal but real **Express** backend that responds to one request:
`GET /api/health` -> `{ "status": "ok", ... }`.

A health check is deliberately the first thing you build: it proves the server
starts, listens on a port, and can return JSON — before any database or logic
exists to complicate debugging.

### File-by-file

- **`package.json`** — the project manifest. Lists dependencies (`express`,
  `cors`, `dotenv`) and `scripts` (shortcut commands like `npm run dev`).
  `"type": "module"` tells Node to use modern `import`/`export` syntax (ES
  Modules) instead of the older `require()` (CommonJS).

- **`src/server.js`** — the entry point. Its only job: load config, import the
  app, and call `app.listen(PORT)` to start accepting requests.

- **`src/app.js`** — builds the Express app: registers middleware and routes,
  then exports it. We separate this from `server.js` so the app can be imported
  in tests without actually opening a network port.

- **`src/routes/health.js`** — a *router* (a group of related routes) holding
  the `GET /` handler that returns the status JSON.

- **`.env` / `.env.example`** — configuration and secrets (port, database URL).
  `.env` is git-ignored; `.env.example` is the committed template so others know
  what variables to set. Never commit real secrets.

---

## 3. Concepts you must be able to explain

**Node.js** — a runtime that lets JavaScript run *outside the browser* (on a
server). It's single-threaded and event-driven, using an **event loop** to
handle many requests without blocking. That's why Node uses async patterns
(`async/await`, callbacks): while one request waits on the DB, Node serves
others instead of sitting idle.

**Express** — a thin web framework on top of Node. It gives you `app.get(...)`,
`app.post(...)`, routing, and middleware so you don't hand-write HTTP parsing.

**Middleware** — functions that run on every request, in order, *before* the
route handler. Examples here: `cors()` (allow the browser frontend to call us)
and `express.json()` (parse a JSON request body into `req.body`). Mental model:
a request passes through a pipeline of middleware, then reaches its route.

**Request / response** — every handler gets `(req, res)`. `req` is the incoming
request (URL, headers, body); `res` is how you reply (`res.json(...)`,
`res.status(404)`).

**REST API** — we expose URLs (endpoints) that return JSON. Convention:
`GET` reads, `POST` creates, `PUT/PATCH` updates, `DELETE` removes. Our health
route is a `GET`.

**Port** — a numbered "door" on a machine. Our server listens on `4000`, so the
browser reaches it at `http://localhost:4000`.

**CORS** (Cross-Origin Resource Sharing) — a browser security rule. The React
app (e.g. port 5173) and the API (port 4000) are different "origins", so the
browser blocks the call unless the server explicitly allows it via the `cors()`
middleware.

---

## 4. Likely interview questions for this layer

- *What is Node.js and how is it different from running JS in a browser?*
- *Node is single-threaded — how does it handle many concurrent requests?*
  (event loop + non-blocking I/O)
- *What is middleware in Express? Give an example and explain the order it runs.*
- *Why did you separate `app.js` from `server.js`?* (testability; build vs. run)
- *What is CORS and why did you need it?*
- *What does a health-check endpoint do and why is it useful in production?*
- *ES Modules vs CommonJS — what's the difference?* (`import` vs `require`)

---

## 5. How to run it

```bash
cd backend
npm install
cp .env.example .env
npm run dev
# visit http://localhost:4000/api/health
```

`npm run dev` uses Node's built-in `--watch` flag, which restarts the server
automatically when you edit a file.

---

Next layer: **the database** — design the tables (users, problems, test_cases,
submissions) and connect Node to PostgreSQL.
