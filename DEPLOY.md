# Deploying the Mini Coding Platform (free)

This deploys the project across four free services:

| Service | Hosts                | Free-tier notes                                        |
|---------|----------------------|--------------------------------------------------------|
| GitHub  | the code             | free                                                   |
| Neon    | PostgreSQL database  | 0.5 GB, scale-to-zero, doesn't expire                  |
| Render  | Node/Express backend | 750 hrs/mo; **sleeps after 15 min idle** (~1 min wake) |
| Vercel  | React frontend       | free; add your custom domain here                      |

**Read this first — the execution model.** Render's free tier can't run
Docker-inside-Docker, so the judge runs in **`host` mode**: submitted C++ compiles
and runs *inside your backend container* (which has `g++`, via `backend/Dockerfile`).
That container is isolated from other Render tenants, so it's fine for a
portfolio/demo — but it is **not** hardened against a hostile public audience. The
Layer 6 Docker sandbox (`dockerExecutor.js`) stays in the repo and switches on
(`EXECUTION_MODE=docker`) on any host that allows nested Docker (e.g. a VM you own).

Total time: ~20–30 minutes. Order matters — follow the steps top to bottom.

---

## Step 0 — Push to GitHub

If you haven't already (run on your Mac):

```bash
cd "/Users/surajpatil1201gmail.com/Claude/Projects/Mini Coding Platform"
rm -rf .git
git init -b main
git add .
git status                 # confirm: no .env, no node_modules
git commit -m "Deploy-ready: full-stack C++ judge"
gh repo create mini-coding-platform --public --source=. --remote=origin --push
# (or create the repo on github.com/new and `git remote add` + `git push -u origin main`)
```

---

## Step 1 — Database on Neon

1. Sign up at **neon.tech** (log in with GitHub).
2. Create a project (name it e.g. `mini-coding-platform`). Region: pick one near you.
3. On the project dashboard, copy the **connection string**. It looks like:
   `postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/DBNAME?sslmode=require`
4. **Seed it from your Mac** (this creates the tables + loads the 6 problems in
   Neon). In your backend folder:

   ```bash
   cd backend
   DATABASE_URL="<paste-your-neon-connection-string>" npm run db:reset
   ```

   You should see `✓ Ran src/db/schema.sql` and `✓ Ran src/db/seed.sql`.
   (Our db code auto-enables SSL for non-local URLs, so this just works.)

Keep the connection string handy for Step 2.

---

## Step 2 — Backend on Render

1. Sign up at **render.com** (log in with GitHub) and grant access to the repo.
2. **New → Blueprint**, select your repo. Render reads `render.yaml` and proposes
   the `mini-coding-platform-api` service (Docker, free plan).
   - *If you'd rather not use the blueprint:* **New → Web Service**, pick the repo,
     set **Runtime = Docker**, **Dockerfile path = `backend/Dockerfile`**,
     **Docker context = `backend`**, **Instance type = Free**.
3. Set the environment variables:
   - `DATABASE_URL` = your Neon connection string from Step 1
   - `EXECUTION_MODE` = `host`  (already set by the blueprint)
   - leave `CORS_ORIGIN` empty for now — you'll fill it in Step 4
4. Create the service and wait for the build/deploy to finish.
5. Copy the service URL, e.g. `https://mini-coding-platform-api.onrender.com`.
6. Test it: open `https://<your-render-url>/api/problems` — you should see the
   6 problems as JSON. (First hit after idle may take ~1 minute to wake.)

---

## Step 3 — Frontend on Vercel

1. Sign up at **vercel.com** (log in with GitHub) and import your repo.
2. Configure the project:
   - **Root Directory** = `frontend`
   - Framework preset should auto-detect **Vite** (build `npm run build`, output `dist`).
3. Add an environment variable:
   - `VITE_API_URL` = `https://<your-render-url>/api`
     (note the `/api` suffix — the client calls `${VITE_API_URL}/problems` etc.)
4. Deploy. Copy the resulting URL, e.g. `https://mini-coding-platform.vercel.app`.

`vercel.json` in `frontend/` already handles SPA routing, so deep links like
`/problems/two-sum` work on refresh.

---

## Step 4 — Connect the two (CORS handshake)

The backend must trust the frontend's origin.

1. In **Render → your service → Environment**, set:
   - `CORS_ORIGIN` = your Vercel URL (no trailing slash), e.g.
     `https://mini-coding-platform.vercel.app`
2. Save — Render redeploys automatically.

Now open your Vercel URL, pick a problem, submit C++, and you should get a verdict.

---

## Step 5 (optional) — Your custom domain

You own a domain, so point it at the frontend:

1. **Vercel → your project → Settings → Domains → Add** your domain (or a
   subdomain like `judge.yourdomain.com`). Vercel shows the DNS record to add at
   your registrar (usually a `CNAME`). Add it; Vercel issues HTTPS automatically.
2. Update `CORS_ORIGIN` on Render to your custom domain and let it redeploy.

(You *can* also put the API on `api.yourdomain.com` via Render's custom-domain
setting, but it's optional — the `onrender.com` URL works fine.)

---

## Troubleshooting

- **Frontend loads but "Could not load problems"** → `VITE_API_URL` is wrong or
  missing the `/api` suffix, or the Render service is asleep (wait ~1 min and
  retry). Check `https://<render-url>/api/problems` directly.
- **CORS error in the browser console** → `CORS_ORIGIN` on Render doesn't exactly
  match your frontend origin (scheme + host, no trailing slash). Fix and redeploy.
- **Backend logs show a DB/SSL error** → the `DATABASE_URL` is wrong, or set
  `PGSSL=true` on Render to force SSL.
- **First request is very slow** → expected on free tiers: Render sleeps after
  15 min idle and Neon scales to zero; the first call wakes them.
- **Changed env vars but nothing happened** → env changes require a redeploy
  (Render does this automatically on save; Vercel needs a new deployment).

---

## What you changed vs. running locally

Nothing about the app's logic — only configuration:
`DATABASE_URL` → Neon, `VITE_API_URL` → Render, `CORS_ORIGIN` → Vercel, and the
backend runs from `backend/Dockerfile` (which adds `g++`). Locally, none of these
are set, so `npm run dev` behaves exactly as before.
