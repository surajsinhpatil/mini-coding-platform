# Layer 7 — Polish, Resume & Interview Prep (study notes)

This is the capstone note: the whole system on one page, how to talk about it,
resume bullets you can defend, a 2-minute demo script, and a consolidated
question bank. Read this last — it ties Layers 1–6 together.

---

## 1. The whole architecture on one page

```
                         ┌──────────────────────────────┐
                         │  React SPA (Vite)  :5173      │   Layer 5
                         │  ProblemList / ProblemDetail  │
                         │  api/client.js  ── fetch ──┐  │
                         └────────────────────────────┼──┘
                                                       │ HTTP + JSON (CORS)
                                                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │  Express API  :4000                                       │  Layers 1&3
        │  routes → controllers → models → db                      │
        │  middleware: cors, json, asyncHandler, errorHandler      │
        └───────────────┬───────────────────────┬──────────────────┘
                        │                        │
                        ▼                        ▼
        ┌───────────────────────────┐   ┌────────────────────────────┐
        │  PostgreSQL               │   │  Execution engine          │  Layers 4&6
        │  users / problems /       │   │  index.js selects:         │
        │  test_cases / submissions │   │   host  → cppExecutor      │
        │        (Layer 2)          │   │   docker→ dockerExecutor   │
        └───────────────────────────┘   │  g++ compile → run tests   │
                                         │  → verdict                 │
                                         └────────────────────────────┘
```

**The four boxes:** presentation (React), API (Express), persistence (Postgres),
execution (the judge). Every file belongs to exactly one box — that separation is
the backbone of the whole design.

---

## 2. The end-to-end submission trace (know this cold)

The single most important thing to be able to narrate:

1. In the browser, you edit C++ in a controlled `<textarea>` and click **Submit**.
2. `api/client.js` sends `POST /api/submissions { problemId, language, sourceCode }`.
3. Express routes it to `submission.controller.js`, which **validates** the body
   and confirms the problem exists.
4. It inserts a **`Pending`** submission row (persist before doing work).
5. It loads the problem's **hidden + sample** test cases from Postgres.
6. It calls `judge(...)` from `execution/index.js`, which runs the selected
   engine:
   - compile the code with `g++`;
   - for each test: feed `input` on **stdin**, capture **stdout**, enforce a
     **time limit**;
   - first failure decides the verdict (**CE / TLE / RE / WA**), else **Accepted**.
7. The verdict + runtime + failing-test number are **saved** onto the row.
8. The API responds `201` with the finished submission; React stores it in state
   and the `VerdictBadge` renders.

That one click crosses all four boxes and back. If you can walk an interviewer
through those eight steps, you understand the project.

---

## 3. Data model recap (one sentence each)

- **users** — who submits (auth is a future layer; `user_id` is nullable now).
- **problems** — one row per challenge; `slug` is the stable URL id.
- **test_cases** — inputs to judge against; most **hidden** (`is_sample=false`).
- **submissions** — one row per attempt: code, verdict, runtime, failing test.

Relationships: a problem *has many* test cases and *has many* submissions
(foreign key on the many side, `ON DELETE CASCADE` to avoid orphans).

---

## 4. Design decisions you chose (and can defend)

- **stdin/stdout judging, not LeetCode's function-signature model** — far simpler
  to run arbitrary code safely; no per-problem driver harness.
- **Layered backend (routes/controllers/models)** — one reason to change per file.
- **`Pending` row then `saveResult`** — never lose a submission; ready for async
  judging later.
- **Hidden vs sample test cases** — only samples ever leave the server.
- **Pluggable executor (Strategy pattern)** — swap host↔docker with one env var.
- **Docker sandbox** — the security story: no network, capped memory/CPU/PIDs,
  read-only FS, non-root user, in-container timeout.

Being able to say *why* you did each of these is what separates "I followed a
tutorial" from "I designed this."

---

## 5. Resume bullets (defensible versions)

> - Built a full-stack LeetCode-style judge (**React, Node/Express, PostgreSQL**)
>   where users browse problems, submit C++, and get automated verdicts
>   (Accepted / Wrong Answer / TLE / Runtime / Compilation Error).
> - Designed a **normalized PostgreSQL schema** (users, problems, hidden test
>   cases, submissions) with foreign keys, enums, and indexes.
> - Implemented a **modular Express REST API** with a clean routes → controllers →
>   models separation and centralized error-handling middleware.
> - Wrote a **code-execution engine** that compiles submissions with `g++` via
>   Node `child_process`, runs them against hidden tests under a time limit, and
>   derives verdicts from exit codes and output comparison.
> - Hardened execution with a **Docker sandbox** (no network; memory/CPU/PID
>   limits; read-only, non-root containers), swappable with the host engine via a
>   Strategy-pattern selector.

Every bullet maps to code you can open and explain — don't claim anything here you
can't walk through.

---

## 6. Two-minute demo script

1. "It's a mini competitive-judge. Here's the problem catalog — served by
   `GET /api/problems` from Postgres." *(show the list)*
2. "Open **Two Sum**. The statement and sample tests come from the DB; hidden
   tests never reach the browser." *(show the problem page)*
3. "I write C++ here and Submit. That POSTs to the API, which saves a Pending
   row, loads the hidden tests, and runs my code." *(submit a correct solution →
   green Accepted + runtime)*
4. "Now a wrong solution — see it fail on a specific hidden test." *(submit `a-b`
   → Wrong Answer, failed on test #N)*
5. "An infinite loop gets killed by the time limit." *(→ Time Limit Exceeded)*
6. "In production this runs in Docker: no network, capped memory, read-only,
   non-root — so untrusted code can't touch the host." *(show `docs/06-docker.md`
   or flip `EXECUTION_MODE=docker`)*

---

## 7. Consolidated interview question bank

Each layer's note has detailed answers; this is the index.

**Node/Express (01, 03):** event loop & non-blocking I/O · middleware order ·
`app.js` vs `server.js` · CORS · error handling for async code · REST + status
codes · statelessness.

**Database (02):** why normalized · one-to-many modeling · `ON DELETE CASCADE` ·
indexes and their trade-off · connection pooling · SQL injection & parameterized
queries · ACID.

**Execution (04):** the compile→run→compare pipeline · stdin/stdout · stopping an
infinite loop (SIGKILL/timeout) · `spawn` vs `exec` · distinguishing WA/RE/TLE ·
why a separate process.

**Frontend (05):** props vs state · `useState`/`useEffect` · controlled
components · keys in lists · SPA routing · the submit round-trip.

**Security/Docker (06):** what untrusted code can do · container vs VM ·
namespaces vs cgroups · fork bomb / memory bomb / network defenses · read-only +
non-root · Strategy-pattern executor · scaling the sandbox.

**System design (07):** the four-box architecture · the eight-step submission
trace · your design decisions and their trade-offs · what you'd build next.

---

## 8. What you'd build next (good "future work" answers)

- **Auth** (JWT + hashed passwords) so submissions belong to real users; the
  `users` table and nullable `user_id` are already in place.
- **Async judging** — push submissions to a queue and let workers judge them, so
  the API responds instantly and scales; the `Pending` → `saveResult` split
  already fits this.
- **More languages** — the `source_language` enum + per-language compile/run
  commands; the executor interface already isolates this.
- **A warm container pool / lighter sandbox** (gVisor, Firecracker, `isolate`) to
  cut per-run latency.
- **Rate limiting** and per-submission resource accounting.

---

That's the whole project, Layers 1–7. You built each box, you know why each
decision was made, and you can trace one Submit click across all of them. Good
luck in the interview.
