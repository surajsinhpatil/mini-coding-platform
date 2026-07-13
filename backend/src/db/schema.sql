-- schema.sql
-- =============================================================================
-- The database schema for the Mini Coding Platform.
--
-- "Schema" = the shape of the data: which tables exist, which columns they have,
-- their types, and how they relate to each other.
--
-- This file is NORMALIZED: each fact lives in exactly one place. A problem is
-- stored once in `problems`; its many test cases live in `test_cases` and point
-- back at the problem by id (a foreign key). We never copy the problem text into
-- every test case row. That avoids duplication and update anomalies.
--
-- Run it with:  psql "$DATABASE_URL" -f src/db/schema.sql
-- Running it again drops and recreates everything (safe for development).
-- =============================================================================

-- ---- Clean slate -------------------------------------------------------------
-- Drop in reverse dependency order (children before parents). CASCADE also
-- removes anything that depends on the object.
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS test_cases CASCADE;
DROP TABLE IF EXISTS problems   CASCADE;
DROP TABLE IF EXISTS users      CASCADE;

DROP TYPE IF EXISTS difficulty_level CASCADE;
DROP TYPE IF EXISTS submission_verdict CASCADE;
DROP TYPE IF EXISTS source_language CASCADE;

-- ---- Enumerated types --------------------------------------------------------
-- An ENUM restricts a column to a fixed set of allowed values. The database
-- itself rejects anything else, so bad data can never be inserted.

-- The difficulty shown on a problem.
CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

-- Which language a submission was written in. Only C++ for now; adding a value
-- later is a one-line ALTER TYPE.
CREATE TYPE source_language AS ENUM ('cpp');

-- The result of judging a submission. 'Pending' is the initial state before the
-- execution engine has finished.
CREATE TYPE submission_verdict AS ENUM (
  'Pending',
  'Accepted',
  'Wrong Answer',
  'Time Limit Exceeded',
  'Runtime Error',
  'Compilation Error'
);

-- ---- users -------------------------------------------------------------------
-- Who submits solutions. Authentication is not built yet, so password_hash is
-- nullable — the column exists so we can add login later without a migration.
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,          -- auto-incrementing integer id
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),                -- filled in when auth is added
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---- problems ----------------------------------------------------------------
-- One row per coding problem. `slug` is the URL-friendly id (e.g. "two-sum")
-- used in API paths, so links stay readable and stable even if the title changes.
--
-- Execution model note: our judge is stdin/stdout based (like Codeforces), not
-- LeetCode's function-signature model. So a problem's statement tells the user
-- what to READ from standard input and what to PRINT to standard output.
-- `time_limit_ms` / `memory_limit_mb` bound how long/large a run may be.
CREATE TABLE problems (
  id              SERIAL PRIMARY KEY,
  slug            VARCHAR(100) NOT NULL UNIQUE,
  title           VARCHAR(200) NOT NULL,
  description     TEXT         NOT NULL,      -- the full problem statement (markdown)
  difficulty      difficulty_level NOT NULL DEFAULT 'Easy',
  time_limit_ms   INTEGER      NOT NULL DEFAULT 2000,
  memory_limit_mb INTEGER      NOT NULL DEFAULT 256,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ---- test_cases --------------------------------------------------------------
-- The inputs a submission is judged against. Most are HIDDEN (is_sample = false)
-- so users can't hard-code answers; a few are samples shown in the statement.
--
-- `problem_id` is a FOREIGN KEY: it must reference a real problems.id. If a
-- problem is deleted, ON DELETE CASCADE removes its test cases automatically.
CREATE TABLE test_cases (
  id              SERIAL PRIMARY KEY,
  problem_id      INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  ordinal         INTEGER NOT NULL,           -- order/label of the test (1,2,3,...)
  input           TEXT    NOT NULL,           -- fed to the program's stdin
  expected_output TEXT    NOT NULL,           -- compared against the program's stdout
  is_sample       BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (problem_id, ordinal)                -- no two tests share a number per problem
);

-- Index: we always fetch test cases "for a given problem", so index that column
-- to avoid scanning the whole table.
CREATE INDEX idx_test_cases_problem_id ON test_cases (problem_id);

-- ---- submissions -------------------------------------------------------------
-- One row per attempt. Stores the exact code, the verdict, and how it did.
-- user_id is nullable because auth isn't built yet (anonymous submissions).
CREATE TABLE submissions (
  id               SERIAL PRIMARY KEY,
  problem_id       INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  language         source_language    NOT NULL DEFAULT 'cpp',
  source_code      TEXT               NOT NULL,
  verdict          submission_verdict NOT NULL DEFAULT 'Pending',
  runtime_ms       INTEGER,                   -- max run time across tests (null until judged)
  failed_test      INTEGER,                   -- ordinal of the first failing test, if any
  detail           TEXT,                      -- compiler/runtime error text, if any
  created_at       TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- Index: submission history is queried "for a given problem", newest first.
CREATE INDEX idx_submissions_problem_id ON submissions (problem_id, created_at DESC);
