# Layer 2 — Database (PostgreSQL) (study notes)

Goal of this layer: design the tables that hold everything the platform knows —
users, problems, hidden test cases, and submissions — and connect Node to
PostgreSQL through a connection pool.

---

## 1. The data model (four tables)

```
users            problems              test_cases              submissions
-----            --------              ----------              -----------
id  ◄──────┐     id  ◄──────┬───────►  id                      id
username   │     slug       │          problem_id ──► problems  problem_id ──► problems
email      │     title      │          ordinal                 user_id ──► users
password   │     difficulty │          input                   language ('cpp')
           │     description │          expected_output        source_code
           └─────────────────          is_sample               verdict
                 user_id of a submission                        runtime_ms
                 (nullable, auth later)                         failed_test / detail
```

- **users** — who submits. Auth isn't built yet, so `password_hash` is nullable
  and submissions can be anonymous (`user_id` null). The column exists now so we
  can add login later without a schema migration.
- **problems** — one row per challenge. `slug` ("two-sum") is the stable,
  URL-friendly id used in API paths.
- **test_cases** — the inputs a solution is judged on. Most are **hidden**
  (`is_sample = false`) so users can't hard-code answers; a couple are samples
  shown in the statement.
- **submissions** — one row per attempt: the exact code, the verdict, runtime,
  and which test failed.

---

## 2. Why this design (the words to say in an interview)

**Normalized** — every fact lives in exactly one place. The problem statement is
stored once in `problems`; a problem's many test cases live in `test_cases` and
*point back* at the problem with a foreign key. We never copy the statement into
each test row. This is the standard cure for **data duplication** and **update
anomalies** (change the text once, not in 50 places).

**One-to-many relationships** — one problem has many test cases; one problem has
many submissions. We model "many" by putting the foreign key (`problem_id`) on
the *many* side.

**Foreign keys + referential integrity** — `test_cases.problem_id REFERENCES
problems(id)` means the database refuses a test case that points at a problem
that doesn't exist. `ON DELETE CASCADE` means deleting a problem automatically
deletes its test cases and submissions, so we never leave orphan rows.

**ENUM types** — `difficulty`, `language`, and `verdict` are constrained to a
fixed set of values *by the database itself*, so an invalid verdict literally
cannot be stored. Adding a new value later is a one-line `ALTER TYPE`.

**Indexes** — we always read test cases and submissions "for a given problem",
so we index `problem_id`. An index is a lookup structure (a B-tree) that turns a
full-table scan into a fast seek. The trade-off: indexes speed up reads but
slightly slow down writes and use disk — so you index the columns you filter/join
on, not every column.

**stdin/stdout execution model** — a design decision worth defending. LeetCode
gives you a function signature (`vector<int> twoSum(...)`) and hides the I/O
harness. We instead judge full programs that read standard input and print
standard output (the Codeforces model). It's dramatically simpler to run
arbitrary C++ safely — no per-language driver code to inject — which is why
`test_cases` stores raw `input` and `expected_output` text.

---

## 3. Concepts you must be able to explain

**PostgreSQL** — a relational, ACID-compliant database. Data lives in tables of
rows and columns with enforced types and relationships.

**ACID** — the guarantees a transaction gives: **A**tomic (all-or-nothing),
**C**onsistent (constraints always hold), **I**solated (concurrent transactions
don't corrupt each other), **D**urable (once committed, it survives a crash).

**Primary key** — the column that uniquely identifies a row (`id`, a
`SERIAL` auto-incrementing integer). **Foreign key** — a column that references
another table's primary key, enforcing valid links.

**SERIAL** — shorthand for an auto-incrementing integer; the DB assigns the next
id on insert.

**Connection pool** — opening a DB connection per request is expensive. A pool
keeps a handful of connections open and hands them out: a query borrows one,
runs, and returns it. `config/db.js` creates one `pg.Pool` for the whole app.

**Parameterized queries / SQL injection** — never build SQL by string-concatenating
user input. We use `$1, $2` placeholders and pass values separately
(`query("… WHERE slug = $1", [slug])`) so input can never be interpreted as SQL.

---

## 4. Likely interview questions for this layer

- *Walk me through your schema. Why these four tables?*
- *What does "normalized" mean, and what problem does it solve?*
- *How do you model a one-to-many relationship?* (foreign key on the many side)
- *What does `ON DELETE CASCADE` do and why did you use it?*
- *Why hidden test cases, and how do you store "hidden vs sample"?*
- *What is an index and when would you add one? What's the downside?*
- *What is a connection pool and why not just connect per request?*
- *What is SQL injection and how do parameterized queries prevent it?*
- *Why store the full `source_code` on every submission?* (audit/history/re-judge)

---

## 5. How to run it

Install PostgreSQL (once) and create the database:

```bash
# macOS with Homebrew:
brew install postgresql@16
brew services start postgresql@16
createdb mini_coding_platform
```

Point `.env` at it (already the default):

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mini_coding_platform
```

Then, from `backend/`:

```bash
npm install            # now also installs the `pg` driver
npm run db:reset       # runs schema.sql then seed.sql
```

`npm run db:reset` builds the tables and loads the three sample problems with
their hidden test cases.

---

Next layer: **the API** — Express routes that read problems from these tables and
accept submissions, with a clean routes → controllers → models separation.
