# Layer 5 — Frontend (React) (study notes)

Goal of this layer: a browser UI to browse problems, write C++ in an editor, hit
Submit, and see the verdict — all talking to the Express API from Layer 3.

---

## 1. What we built

A **Vite + React** single-page app (SPA) with two pages:

```
/                         ProblemList   – catalog of problems (GET /api/problems)
/problems/:slug           ProblemDetail – statement + editor + Submit + verdict
```

Supporting pieces:

- **`api/client.js`** — the one place that calls the backend (`fetch` wrapper).
- **`components/VerdictBadge.jsx`** — a reusable colored pill for the verdict.
- **`styles.css`** — hand-written CSS (no framework) so every rule is readable.

The whole app mounts into the single `<div id="root">` in `index.html` via
`main.jsx`.

---

## 2. How data flows through a React component

React's core idea: **UI is a function of state.** You keep data in *state*; when
state changes, React re-renders the component to match. You never touch the DOM
by hand.

The standard async-fetch pattern (used in both pages):

```
const [data, setData]       = useState(null);   // the fetched data
const [loading, setLoading] = useState(true);   // show a spinner?
const [error, setError]     = useState(null);   // show an error?

useEffect(() => {            // runs AFTER render; [] = run once on mount
  api.listProblems()
     .then(setData)          // success -> store data (triggers re-render)
     .catch(e => setError(e.message))
     .finally(() => setLoading(false));
}, []);
```

Render then branches on that state: loading → "Loading…", error → message,
otherwise → the data.

**Controlled input:** the code editor is a `<textarea>` whose `value={code}` comes
from state and whose `onChange` calls `setCode(...)`. React is the single source
of truth for what's in the box — that's a "controlled component."

---

## 3. The submit round-trip (the whole app in one action)

1. User edits the `<textarea>` → `code` state updates on each keystroke.
2. User clicks **Submit** → `handleSubmit` sets `submitting = true`.
3. `api.submit({ problemId, sourceCode })` does `POST /api/submissions`.
4. The backend judges it (compile → run tests → verdict) and responds.
5. We store the returned submission in `result` state → React re-renders and the
   `VerdictBadge` + runtime + failing-test number appear.

So the button press crosses all four layers: **React → Express → Postgres →
execution engine → back to React.** That round-trip is the whole platform.

---

## 4. Concepts you must be able to explain

**SPA (single-page app)** — the server sends one HTML shell; JavaScript renders
pages and swaps them client-side. React Router maps URLs to components
(`<Route path="/problems/:slug" …>`) without full reloads. `<Link>` navigates
without a page refresh; `useParams()` reads the `:slug` from the URL.

**Component** — a function returning JSX (HTML-like syntax). Small, reusable, and
composable (`VerdictBadge` is used inside `ProblemDetail`).

**Props vs state** — *props* are inputs passed in from a parent (read-only, like
`<VerdictBadge verdict={...} />`). *State* is data a component owns and can change
(`useState`). Changing state re-renders; you don't mutate the DOM directly.

**`useState` / `useEffect`** — the two core Hooks. `useState` holds values across
renders; `useEffect` runs side effects (like fetching) after render, controlled
by its dependency array (`[]` = once, `[slug]` = whenever slug changes).

**`key` in lists** — when rendering a list (`problems.map(...)`), each item needs
a stable unique `key` (we use the problem id) so React can update rows efficiently.

**Why an API-client module** — centralizing `fetch` means base URL, headers, and
error handling live in one file; components stay about UI, not networking. Same
"separation of concerns" idea as the backend's model layer.

**CORS reappears** — the app runs on `:5173`, the API on `:4000` — different
origins, so the backend's `cors()` middleware (Layer 1) is what lets these calls
through.

---

## 5. Likely interview questions for this layer

- *What is React and what problem does it solve?* (declarative UI from state)
- *Difference between props and state?*
- *What does `useEffect` do? What's the dependency array for?*
- *What is a controlled component?* (the editor textarea)
- *Why does each item in a `.map()` need a `key`?*
- *How does routing work in a single-page app?*
- *Walk me through what happens from clicking Submit to seeing the verdict.*
- *Why put all API calls in one client module?*
- *How do the frontend and backend avoid a CORS error?*

---

## 6. How to run it (full stack, end to end)

Three terminals — database, backend, frontend:

```bash
# 1. PostgreSQL running + seeded (from Layer 2)
cd backend && npm install && npm run db:reset && npm run dev
#    -> API on http://localhost:4000

# 2. Frontend
cd frontend && npm install && npm run dev
#    -> app on http://localhost:5173
```

Open http://localhost:5173, pick "Sum of Two Numbers", paste a solution, Submit:

```cpp
#include <iostream>
int main(){ long long a,b; std::cin>>a>>b; std::cout<<a+b; }
```

You should see a green **Accepted** with the runtime.

---

Next layer: **Docker sandbox** (Layer 6) — run each submission inside a throwaway
container with no network and a memory cap, so hostile code can't harm the host.
