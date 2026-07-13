# Layer 6 — Docker Sandbox (study notes)

Goal of this layer: run untrusted user code **safely**. Until now the judge
compiled and ran code directly on the host — fine for local dev, dangerous for
anything public. This layer runs every submission inside a disposable Docker
container that can't touch the host, the network, or unlimited resources.

---

## 1. The threat: why the host executor is not safe

When you run a stranger's C++ on your own machine as a normal process, that code
can:

- **read/write your filesystem** (steal or delete files),
- **open network connections** (exfiltrate data, attack others, "phone home"),
- **exhaust resources** — a fork bomb (`while(1) fork();`), a giant allocation,
  or an infinite loop pinning every CPU.

The host executor only stops the *time* problem (a SIGKILL timer). Everything
else is wide open. A coding platform runs untrusted code by definition, so this
is the central security problem of the whole project.

---

## 2. The fix: one throwaway container per run

Instead of running `./main` on the host, we run it inside `docker run`. A
container is an isolated process with its own filesystem view and its own limits,
enforced by the Linux kernel (namespaces + cgroups). We lock every run down:

| Flag                          | What it defends against                          |
|-------------------------------|--------------------------------------------------|
| `--rm`                        | leftovers — container is deleted the moment it exits |
| `--network none`              | data exfiltration / phoning home — no network at all |
| `--memory 256m --memory-swap 256m` | memory bombs — hard cap, no swap escape      |
| `--cpus 1`                    | CPU hogging — capped to one core                 |
| `--pids-limit 64`             | fork bombs — can't spawn unlimited processes     |
| `--read-only` + `--tmpfs /tmp:size=16m` | tampering — root FS read-only; only a tiny writable /tmp |
| `--user 65534:65534` (nobody) | privilege — never runs as root inside the container |
| `-v <dir>:/sandbox:ro`        | the user's code is mounted **read-only**         |
| in-container `timeout`        | infinite loops — kernel-level kill past the limit |

The user's code is **mounted in, never baked into the image**. The image is just
"a box containing a C++ compiler."

---

## 3. How it runs (compile once, run each test)

```
mkdtemp → write main.cpp
   │
   ▼
docker run (rw mount) g++ …        ← COMPILE inside a container
   │  fail → Compilation Error
   ▼
for each test:
   docker run (ro mount, all caps) timeout … ./main   ← RUN, feed input on stdin
   │   exit 124 → Time Limit Exceeded
   │   exit 137 → Runtime Error (OOM / killed)
   │   exit ≠0  → Runtime Error
   │   output ≠ expected → Wrong Answer
   ▼
all pass → Accepted
```

Only the **compile** step mounts the directory read-write (g++ must write the
binary); every **run** step mounts it read-only. Timeouts are enforced *inside*
the container with GNU `timeout` (`exit 124` on timeout), which is more reliable
than killing the host-side `docker` process — plus a generous host-side backstop
timer in case the Docker CLI itself hangs.

---

## 4. The design win: a pluggable executor (Strategy pattern)

`dockerExecutor.js` exposes the **exact same** `judge({ sourceCode, testCases,
timeLimitMs, memoryLimitMb })` function as `cppExecutor.js`. A tiny selector,
`execution/index.js`, picks one based on `EXECUTION_MODE`:

```
EXECUTION_MODE=host    → cppExecutor   (fast, for local dev)
EXECUTION_MODE=docker  → dockerExecutor (secure, for anything shared)
```

The controller imports `judge` from `execution/index.js` and never knows which
engine it got. Swapping implementations behind a stable interface is the
**Strategy pattern** — a clean thing to name in an interview. It's also why
Layer 4's notes said "only the run calls change": the verdict logic is identical
in both engines.

---

## 5. Concepts you must be able to explain

**Container vs virtual machine** — a VM virtualizes hardware and runs a whole
guest OS (heavy, slow to boot). A container shares the host kernel and isolates
processes with **namespaces** (separate views of filesystem, network, PIDs) and
**cgroups** (resource limits). Much lighter — milliseconds to start.

**Namespaces & cgroups** — the two kernel features Docker is built on. Namespaces
= isolation (what a process can *see*); cgroups = limits (how much it can *use*).
`--memory`/`--cpus`/`--pids-limit` are cgroups; `--network none` is a namespace.

**Why `--network none` and non-root** — defense in depth: even if code escapes
one control, others still contain it. No network stops exfiltration; running as
`nobody` means a container breakout lands as an unprivileged user.

**Image vs container** — an image is the read-only template (our g++ box); a
container is a running instance of it. `--rm` throws the instance away after use.

**Bind mount** — `-v host:container` maps a host directory into the container.
We mount source read-only so code can't modify it mid-judge.

**Trade-off** — security costs latency: each `docker run` adds container-startup
overhead (tens–hundreds of ms). Fine for a learning platform; a production judge
would pool warm containers or use a lighter sandbox (gVisor, Firecracker,
isolate) to cut that cost.

---

## 6. Likely interview questions for this layer

- *Your platform runs untrusted code — how do you keep it from harming the server?*
- *What exactly can malicious code do if you run it directly, and which flag stops each?*
- *Difference between a container and a VM?*
- *What are namespaces and cgroups?*
- *How do you stop a fork bomb? An infinite loop? A memory bomb?*
- *Why mount the code read-only and run as a non-root user?*
- *How did you make host vs docker execution swappable?* (same interface + selector = Strategy)
- *What's the downside of a container per run, and how would you scale it?*
- *How do you detect TLE vs Runtime Error vs OOM from the container's exit code?*

---

## 7. How to run it

Install Docker Desktop, then pull the compiler image once:

```bash
docker pull gcc:13
# (optional slimmer image:)
docker build -t mcp-judge:cpp backend/sandbox
```

Turn the sandbox on in `backend/.env`:

```
EXECUTION_MODE=docker
JUDGE_DOCKER_IMAGE=gcc:13        # or mcp-judge:cpp
```

Restart the API (`npm run dev`) — the log prints `Execution engine: docker`.
Submissions now compile and run inside containers. Nothing else in the app
changes: same endpoints, same verdicts. Set `EXECUTION_MODE=host` to switch back.

**Sanity test the sandbox is real:** submit code that tries to open a network
socket or read a system file — with `docker` mode it fails/does nothing; with
`host` mode it might succeed. That contrast is the whole point of this layer.

---

Next layer: **Layer 7 — polish** — a top-level runbook, seed more problems, and
turn all of this into tight resume bullets and a demo script.
