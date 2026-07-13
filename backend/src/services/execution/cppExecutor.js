// services/execution/cppExecutor.js
// -----------------------------------------------------------------------------
// THE EXECUTION ENGINE. Given a user's C++ source and a problem's test cases,
// it compiles the code and runs it against each test, then returns a verdict.
//
// Pipeline:
//   compile with g++  ──▶  for each test: run, feed input on stdin, capture
//   stdout, enforce a time limit  ──▶  compare output to expected  ──▶  verdict.
//
// Verdicts (first failure wins, tests run in order):
//   Compilation Error  – g++ failed to build the program
//   Runtime Error      – the program crashed (non-zero exit / signal)
//   Time Limit Exceeded– the program ran longer than the problem's limit
//   Wrong Answer       – it finished but printed the wrong output
//   Accepted           – every test matched
//
// SANDBOXING NOTE (important for interviews): this runs untrusted code as a
// plain child process on the host. That is fine for a local/learning build but
// is NOT secure for the public internet — malicious code could touch the
// filesystem or network. The planned next phase is Docker isolation (a throwaway
// container per run with no network and a memory cap). This file is written so
// only the `runProcess` calls need to change to run inside a container.
// -----------------------------------------------------------------------------

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { VERDICT } from "./verdicts.js";

// How long compilation itself may take (separate from a program's run limit).
const COMPILE_TIMEOUT_MS = 10_000;

/**
 * Judge one submission.
 *
 * @param {object}  args
 * @param {string}  args.sourceCode   the user's C++ program
 * @param {Array<{ordinal:number, input:string, expected_output:string}>} args.testCases
 * @param {number}  args.timeLimitMs  per-test wall-clock limit
 * @param {number}  [args.memoryLimitMb]  accepted for interface parity with the
 *                  Docker engine, but NOT enforced in host mode — capping memory
 *                  reliably needs OS-level isolation (that's what Layer 6 adds).
 * @returns {Promise<{verdict:string, runtimeMs:number|null, failedTest:number|null, detail:string|null}>}
 */
// eslint-disable-next-line no-unused-vars
export async function judge({ sourceCode, testCases, timeLimitMs = 2000, memoryLimitMb = 256 }) {
  // A private, throwaway working directory for this one submission.
  const workDir = await mkdtemp(join(tmpdir(), "mcp-judge-"));
  const sourcePath = join(workDir, "main.cpp");
  const binaryPath = join(workDir, "main");

  try {
    // ---- 1. Write the source to disk --------------------------------------
    await writeFile(sourcePath, sourceCode, "utf8");

    // ---- 2. Compile with g++ ----------------------------------------------
    // -O2 optimizes; -std=c++17 sets the language standard. Compiler messages
    // go to stderr, which we surface to the user on failure.
    const compile = await runProcess("g++", ["-O2", "-std=c++17", sourcePath, "-o", binaryPath], {
      timeoutMs: COMPILE_TIMEOUT_MS,
    });

    if (compile.timedOut || compile.code !== 0) {
      return {
        verdict: VERDICT.COMPILATION_ERROR,
        runtimeMs: null,
        failedTest: null,
        detail: truncate(compile.stderr || "Compilation timed out"),
      };
    }

    // ---- 3. Run every test case, in order ---------------------------------
    let maxRuntimeMs = 0;

    for (const test of testCases) {
      const run = await runProcess(binaryPath, [], {
        input: test.input,
        timeoutMs: timeLimitMs,
      });

      maxRuntimeMs = Math.max(maxRuntimeMs, run.durationMs);

      // 3a. Too slow?
      if (run.timedOut) {
        return {
          verdict: VERDICT.TIME_LIMIT_EXCEEDED,
          runtimeMs: maxRuntimeMs,
          failedTest: test.ordinal,
          detail: null,
        };
      }

      // 3b. Crashed? (non-zero exit code, or killed by a signal like SIGSEGV)
      if (run.code !== 0 || run.signal) {
        return {
          verdict: VERDICT.RUNTIME_ERROR,
          runtimeMs: maxRuntimeMs,
          failedTest: test.ordinal,
          detail: truncate(run.stderr || `Exited with signal ${run.signal}`),
        };
      }

      // 3c. Wrong output?
      if (normalize(run.stdout) !== normalize(test.expected_output)) {
        return {
          verdict: VERDICT.WRONG_ANSWER,
          runtimeMs: maxRuntimeMs,
          failedTest: test.ordinal,
          detail: null,
        };
      }
    }

    // ---- 4. Everything passed ---------------------------------------------
    return {
      verdict: VERDICT.ACCEPTED,
      runtimeMs: maxRuntimeMs,
      failedTest: null,
      detail: null,
    };
  } finally {
    // Always delete the temp directory, success or failure.
    await rm(workDir, { recursive: true, force: true });
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Spawn a child process, optionally feed it stdin, capture stdout/stderr, and
 * enforce a wall-clock timeout by killing it.
 *
 * Returns { stdout, stderr, code, signal, timedOut, durationMs }.
 */
function runProcess(command, args, { input = "", timeoutMs = 2000 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    // Kill the process if it runs too long. SIGKILL can't be caught/ignored,
    // so a runaway infinite loop is guaranteed to stop.
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    // Feed the test input to the program's standard input, then close it so
    // the program sees end-of-file and stops reading.
    child.stdin.on("error", () => {}); // ignore EPIPE if the program exits early
    child.stdin.write(input);
    child.stdin.end();

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: stderr || err.message, code: -1, signal: null, timedOut, durationMs: Date.now() - start });
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code, signal, timedOut, durationMs: Date.now() - start });
    });
  });
}

/**
 * Normalize program output before comparison so trivial whitespace differences
 * don't cause false "Wrong Answer". We:
 *   - convert Windows line endings to \n,
 *   - strip trailing spaces on each line,
 *   - drop trailing blank lines / final newline.
 * Both actual and expected go through this, so the comparison is fair.
 */
function normalize(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

// Keep error text short so a huge compiler dump doesn't bloat the DB/response.
function truncate(text, max = 2000) {
  const s = String(text);
  return s.length > max ? s.slice(0, max) + "\n…(truncated)" : s;
}
