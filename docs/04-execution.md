# Layer 4 — Code Execution Engine (study notes)

Goal of this layer: take a user's C++ source and a problem's hidden test cases,
run the code safely-ish, and turn the results into a verdict. This is the piece
that makes it a *judge* rather than just a CRUD app.

---

## 1. The pipeline

```
sourceCode ─▶ write main.cpp ─▶ compile with g++
                                   │
                    fail ──────────┤────────── success
                     │             │
              Compilation Error    ▼
                            for each test case (in order):
                              run ./main, feed input on stdin,
                              capture stdout, enforce a time limit
                                   │
     ┌───────────────┬────────────┼───────────────┬──────────────┐
   timed out     crashed        wrong output    ...             all passed
     │               │              │                              │
Time Limit Exceeded  Runtime Error  Wrong Answer               Accepted
```

**First failure wins.** Tests run in order; the first one that fails decides the
verdict and we record which test (`failedTest`) it was. Only if *every* test
passes do we return `Accepted`.

The engine returns a small object the controller saves to the DB:
`{ verdict, runtimeMs, failedTest, detail }`.

---

## 2. How each verdict is decided

- **Compilation Error** — `g++ -O2 -std=c++17 main.cpp -o main` exits non-zero.
  The compiler's stderr becomes `detail` so the user sees what's wrong.
- **Time Limit Exceeded** — we start a timer per run; if it fires we
  `kill("SIGKILL")` the process. SIGKILL can't be caught or ignored, so even an
  infinite loop is guaranteed to stop. (The problem's `time_limit_ms` sets it.)
- **Runtime Error** — the program exited with a non-zero code or was killed by a
  signal (e.g. `SIGSEGV` from a segfault, or a division by zero).
- **Wrong Answer** — it ran fine but its stdout didn't match the expected output
  after normalization.
- **Accepted** — all tests matched.

**Output normalization** matters: real programs add a trailing newline or stray
spaces. Before comparing, both the program's output and the expected output are
put through the same `normalize()` (unify line endings, strip trailing spaces,
drop trailing blank lines). This avoids false "Wrong Answer" on cosmetic diffs
while still catching genuinely wrong output.

---

## 3. How the code actually runs it (Node internals)

We use Node's **`child_process.spawn`**. `spawn` launches a separate OS process
and gives us streams:

- **stdin** — we `write()` the test case's input then `end()` it, so the C++
  program reads its input and then sees end-of-file.
- **stdout** — we accumulate everything the program prints; that's its answer.
- **stderr** — captured for error detail.
- **close** event — fires with the exit `code` and `signal` when the process ends.

Why `spawn` and not `exec`? `exec` runs a command through a shell and buffers all
output into one string — convenient but a shell injection risk and awkward for
streaming stdin. `spawn` runs the binary directly (no shell), streams I/O, and is
the right tool for feeding input and enforcing timeouts.

A throwaway temp directory (`mkdtemp`) holds `main.cpp` and the compiled binary,
and a `finally` block always deletes it — no leftover files, even on error.

---

## 4. Security: why this is not done yet

This runs **untrusted code as a normal process on the host machine**. For a local
learning project that's acceptable, but you must be able to say clearly why it is
**not safe for the public internet**:

- the code can read/write the filesystem,
- it can open network connections,
- it can try to exhaust CPU/memory (a "fork bomb" or huge allocation).

We already mitigate runaway *time* with a hard SIGKILL timeout, but not the rest.
**The next phase is Docker sandboxing:** run each submission inside a fresh,
disposable container with `--network none`, a memory limit (`--memory`), a CPU
cap, a read-only filesystem, and a non-root user. The container is destroyed
after the run. The code is structured so only the `runProcess` calls need to be
swapped to `docker run ...` — the verdict logic stays identical. (This is
Layer 6.)

---

## 5. Concepts you must be able to explain

**Process vs thread** — a process is an isolated program with its own memory;
running user code in a *separate process* means a crash or `exit()` can't take
down our API.

**stdin / stdout / stderr** — the three standard streams. Our judge writes the
test input to stdin and reads the answer from stdout; errors go to stderr.

**`spawn` vs `exec`** — `spawn` = direct binary, streamed I/O, no shell (safer);
`exec` = via a shell, buffered (injection risk). We use `spawn`.

**Signals & SIGKILL** — the OS can signal a process. `SIGKILL` forcibly stops it
and cannot be caught — that's why we use it for the timeout.

**Why compile once, run many** — compile the binary a single time, then reuse it
across all test cases. Compiling per test would be needlessly slow.

**Idempotent cleanup** — the `finally` + `rm(..., { force: true })` guarantees
the temp dir is removed regardless of outcome.

---

## 6. Likely interview questions for this layer

- *How do you actually run the user's code? Walk me through the pipeline.*
- *How do you feed input to the program and read its answer?* (stdin/stdout)
- *How do you stop an infinite loop?* (timer → SIGKILL, which can't be caught)
- *Difference between `spawn` and `exec`? Why did you pick one?*
- *How do you distinguish Wrong Answer from Runtime Error from TLE?*
- *Why normalize output before comparing?*
- *Is this secure? What could malicious code do, and how would Docker fix it?*
- *Why run code in a separate process instead of inside the Node server?*
- *What happens to the temp files if the run throws halfway?*

---

## 7. How to run it (standalone smoke test)

You don't need the database to test the engine — call `judge()` directly:

```js
import { judge } from "./src/services/execution/cppExecutor.js";

const result = await judge({
  sourceCode: `#include <iostream>
int main(){ long long a,b; std::cin>>a>>b; std::cout<<a+b; }`,
  testCases: [{ ordinal: 1, input: "3 5", expected_output: "8" }],
  timeLimitMs: 2000,
});
console.log(result); // { verdict: 'Accepted', runtimeMs: <n>, failedTest: null, detail: null }
```

Requires `g++` (on macOS: `xcode-select --install` installs the Command Line
Tools, which include it).

---

Next layer: **the frontend (React)** — a problem list, a problem page with a code
editor, and a Submit button that POSTs to `/api/submissions` and shows the verdict.
