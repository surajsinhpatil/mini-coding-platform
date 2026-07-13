# Mini Coding Platform

A LeetCode-style coding platform: browse problems, write code in the browser,
submit it, have it run against hidden test cases, and get a verdict
(Accepted / Wrong Answer / Time Limit Exceeded / Error).

This project is built **layer by layer** so every part is understood, not copy-pasted.

## Tech stack

| Layer            | Technology              | Why |
|------------------|-------------------------|-----|
| Frontend         | React                   | Most-asked UI library; component model |
| Backend / API    | Node.js + Express       | Lightweight, huge ecosystem, easy to reason about |
| Database         | PostgreSQL              | Relational, ACID, perfect for users/problems/submissions |
| Code execution   | Child process (later: Docker) | Run untrusted user code safely |

## High-level architecture

```
Browser (React)
    |  HTTP (JSON)
    v
Express API  ----->  PostgreSQL   (problems, test cases, submissions, users)
    |
    v
Execution engine  ----->  runs user code, compares output to expected
```

A submission travels: **React form -> POST /api/submissions -> save to DB ->
execution engine runs code against test cases -> verdict saved -> React shows result.**

## Repository layout

```
Mini Coding Platform/
├── README.md           <- you are here
├── docs/               <- study notes, one per layer (your A-to-Z knowledge base)
│   ├── 01-foundation.md
│   ├── 02-database.md
│   ├── 03-api.md
│   ├── 04-execution.md
│   ├── 05-frontend.md
│   ├── 06-docker.md
│   └── 07-polish.md
├── backend/            <- Node/Express API + execution engine
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js         <- starts the HTTP server (+ DB connectivity check)
│       ├── app.js            <- builds the Express app (routes, middleware)
│       ├── config/
│       │   └── db.js         <- PostgreSQL connection pool
│       ├── db/
│       │   ├── schema.sql    <- tables: users, problems, test_cases, submissions
│       │   └── seed.sql      <- sample problems + hidden test cases
│       ├── models/           <- data-access layer (all the SQL)
│       │   ├── problem.model.js
│       │   └── submission.model.js
│       ├── controllers/      <- HTTP logic (validate, shape JSON)
│       │   ├── problem.controller.js
│       │   └── submission.controller.js
│       ├── routes/           <- URL → controller mapping
│       │   ├── health.js
│       │   ├── problem.routes.js
│       │   └── submission.routes.js
│       ├── middleware/       <- asyncHandler, errorHandler, notFound
│       ├── sandbox/
│       │   └── Dockerfile    <- optional slim g++ image for the sandbox
│       └── services/
│           └── execution/    <- pluggable judge:
│               ├── index.js         <- selector (host vs docker via EXECUTION_MODE)
│               ├── cppExecutor.js   <- host mode (fast, dev)
│               ├── dockerExecutor.js<- docker mode (locked-down container)
│               └── verdicts.js
└── frontend/           <- React app (Vite)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx          <- mounts React into index.html
        ├── App.jsx           <- header + routes
        ├── api/client.js     <- the one place that calls the backend
        ├── pages/
        │   ├── ProblemList.jsx    <- catalog
        │   └── ProblemDetail.jsx  <- statement + editor + submit + verdict
        ├── components/
        │   └── VerdictBadge.jsx
        └── styles.css
```

## Prerequisites (install on your machine)

- **Node.js** v18+ and npm  ->  https://nodejs.org  (check: `node -v`, `npm -v`)
- **PostgreSQL** v14+       ->  https://www.postgresql.org/download
- **A C++ compiler** (`g++`) ->  on macOS: `xcode-select --install`
- **Docker Desktop** (optional, for the secure sandbox) -> https://docker.com

## Run the whole stack (runbook)

Three processes: the database, the API, and the frontend.

```bash
# 0. One-time: create the database
createdb mini_coding_platform

# 1. Backend (terminal 1)
cd backend
npm install
cp .env.example .env         # defaults work for a local Postgres
npm run db:reset             # build tables + load the 6 sample problems
npm run dev                  # API on http://localhost:4000

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                  # app on http://localhost:5173
```

Open http://localhost:5173, pick a problem, write C++, and hit **Submit**.

**Smoke tests**

```bash
curl http://localhost:4000/api/health                   # {"status":"ok", ...}
curl http://localhost:4000/api/problems                 # the 6 problems
curl http://localhost:4000/api/problems/two-sum         # one problem + samples
```

**Turn on the secure sandbox** (optional): install Docker, `docker pull gcc:13`,
set `EXECUTION_MODE=docker` in `backend/.env`, restart the API. Submissions now
compile and run inside locked-down containers — same endpoints, same verdicts.

## Deploying (free)

To put this online for free (GitHub + Neon Postgres + Render API + Vercel
frontend), follow **[DEPLOY.md](DEPLOY.md)** — a click-by-click guide. Note: on
Render's free tier the judge runs in `host` mode (the Docker sandbox needs a host
that allows nested Docker).

## Study notes (interview prep)

Each layer has a self-contained note in `docs/` with the mental model, a
file-by-file breakdown, the concepts to master, and likely interview questions:

`01-foundation` · `02-database` · `03-api` · `04-execution` · `05-frontend`
· `06-docker` · `07-polish` (architecture recap, resume bullets, demo script).

## Build progress

- [x] Layer 1 — Project foundation & architecture
- [x] Layer 2 — Database (PostgreSQL)
- [x] Layer 3 — Backend API (Express routes)
- [x] Layer 4 — Code execution engine (subprocess)
- [x] Layer 5 — Frontend (React)
- [x] Layer 6 — Docker sandbox upgrade
- [x] Layer 7 — Polish, docs & resume bullets
