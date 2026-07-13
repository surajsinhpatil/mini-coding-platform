// services/execution/dockerExecutor.js
// -----------------------------------------------------------------------------
// THE SECURE EXECUTION ENGINE. Same job and same `judge()` signature as
// cppExecutor.js, but every compile/run happens INSIDE a throwaway Docker
// container instead of directly on the host. That is the whole point of this
// layer: untrusted user code should never touch the host.
//
// What each container run is locked down with:
//   --rm                 delete the container the instant it exits
//   --network none       NO network at all (can't exfiltrate data or call home)
//   --memory / --memory-swap   hard memory cap (also blocks swap escape)
//   --cpus               CPU cap (can't hog every core)
//   --pids-limit         cap on processes/threads (stops fork bombs)
//   --read-only + tmpfs  read-only root FS; only a small writable /tmp
//   --user 65534:65534   run as "nobody", never root inside the container
//   in-container `timeout`   kills code that runs past the time limit
//
// Because the interface matches cppExecutor.js, execution/index.js can swap
// between them with an env var — that's the "pluggable executor" design.
// -----------------------------------------------------------------------------

import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { VERDICT } from "./verdicts.js";

// Which image to compile/run in. The official `gcc` image already has g++.
// (You can build the slimmer image in backend/sandbox/Dockerfile and point here.)
const IMAGE = process.env.JUDGE_DOCKER_IMAGE || "gcc:13";
const COMPILE_TIMEOUT_MS = 20_000; // compiling can be slower than running

/**
 * Build the `docker run ...` argv for the COMPILE step.
 * Kept as a pure function so it can be unit-tested without Docker installed.
 * The source dir is mounted read-write ONLY here so g++ can emit the binary.
 */
export function buildCompileArgs({ workDir, image = IMAGE }) {
  return [
    "run", "--rm",
    "--network", "none",
    "--memory", "512m", "--memory-swap", "512m",
    "--pids-limit", "128",
    "-v", `${workDir}:/sandbox`,
    "-w", "/sandbox",
    image,
    "g++", "-O2", "-std=c++17", "main.cpp", "-o", "main",
  ];
}

/**
 * Build the `docker run ...` argv for RUNNING one test.
 * The dir is mounted READ-ONLY, and a writable tmpfs is provided at /tmp only.
 * `timeout` inside the container guarantees the process can't outlive its limit.
 */
export function buildRunArgs({ workDir, timeLimitMs, memoryLimitMb = 256, image = IMAGE }) {
  const seconds = (timeLimitMs / 1000).toFixed(2); // GNU timeout accepts fractions
  return [
    "run", "--rm", "-i",                    // -i: keep stdin open to feed input
    "--network", "none",
    "--memory", `${memoryLimitMb}m`, "--memory-swap", `${memoryLimitMb}m`,
    "--cpus", "1",
    "--pids-limit", "64",
    "--read-only",                          // root filesystem is read-only
    "--tmpfs", "/tmp:size=16m",             // small writable scratch only
    "--user", "65534:65534",                // "nobody": never root in-container
    "-v", `${workDir}:/sandbox:ro`,         // code mounted read-only
    "-w", "/sandbox",
    image,
    // TERM at the limit, hard KILL 1s later; exits 124 on timeout.
    "timeout", "-k", "1s", "-s", "TERM", `${seconds}s`, "./main",
  ];
}

/**
 * Judge one submission inside Docker. Identical contract to cppExecutor.judge().
 */
export async function judge({ sourceCode, testCases, timeLimitMs = 2000, memoryLimitMb = 256 }) {
  await assertDockerAvailable();

  const workDir = await mkdtemp(join(tmpdir(), "mcp-djudge-"));
  const sourcePath = join(workDir, "main.cpp");

  try {
    // ---- 1. Write source ----------------------------------------------------
    await writeFile(sourcePath, sourceCode, "utf8");

    // ---- 2. Compile inside a container -------------------------------------
    const compile = await runProcess("docker", buildCompileArgs({ workDir }), {
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

    // ---- 3. Run every test in its own locked-down container ----------------
    let maxRuntimeMs = 0;

    for (const test of testCases) {
      const run = await runProcess(
        "docker",
        buildRunArgs({ workDir, timeLimitMs, memoryLimitMb }),
        {
          input: test.input,
          // host-side backstop kill, generous vs the in-container timeout
          timeoutMs: timeLimitMs + 5000,
        }
      );

      maxRuntimeMs = Math.max(maxRuntimeMs, run.durationMs);

      // 3a. In-container `timeout` reports 124 when the code ran too long.
      //     137 (128+SIGKILL) can also mean OOM-kill; treat as a failed run.
      if (run.code === 124 || run.timedOut) {
        return { verdict: VERDICT.TIME_LIMIT_EXCEEDED, runtimeMs: maxRuntimeMs, failedTest: test.ordinal, detail: null };
      }

      // 3b. Crashed (segfault, OOM kill, non-zero exit).
      if (run.code !== 0) {
        const detail = run.code === 137 ? "Killed (out of memory or forced stop)" : run.stderr;
        return { verdict: VERDICT.RUNTIME_ERROR, runtimeMs: maxRuntimeMs, failedTest: test.ordinal, detail: truncate(detail) };
      }

      // 3c. Wrong output.
      if (normalize(run.stdout) !== normalize(test.expected_output)) {
        return { verdict: VERDICT.WRONG_ANSWER, runtimeMs: maxRuntimeMs, failedTest: test.ordinal, detail: null };
      }
    }

    // ---- 4. All tests passed ------------------------------------------------
    return { verdict: VERDICT.ACCEPTED, runtimeMs: maxRuntimeMs, failedTest: null, detail: null };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Fail fast with a clear message if the Docker daemon isn't reachable.
async function assertDockerAvailable() {
  const check = await runProcess("docker", ["version", "--format", "{{.Server.Version}}"], { timeoutMs: 5000 });
  if (check.code !== 0) {
    throw new Error(
      "Docker is not available. Start Docker Desktop, or set EXECUTION_MODE=host to run without the sandbox."
    );
  }
}

// Spawn a child process, optionally feed stdin, capture output, enforce a
// host-side wall-clock timeout. (Identical shape to the one in cppExecutor.js.)
function runProcess(command, args, { input = "", timeoutMs = 2000 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));

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

function normalize(text) {
  return String(text)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

function truncate(text, max = 2000) {
  const s = String(text);
  return s.length > max ? s.slice(0, max) + "\n…(truncated)" : s;
}
