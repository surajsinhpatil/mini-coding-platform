// App.jsx
// -----------------------------------------------------------------------------
// The top-level component. It draws the shared header and defines the ROUTES:
// which URL renders which page component. React Router swaps the page in place
// without a full page reload (a "single-page app").
// -----------------------------------------------------------------------------

import { Routes, Route, Link } from "react-router-dom";

import ProblemList from "./pages/ProblemList.jsx";
import ProblemDetail from "./pages/ProblemDetail.jsx";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        {/* Link is React Router's <a>: it changes the URL without reloading. */}
        <Link to="/" className="brand">&lt;/&gt; Mini Coding Platform</Link>
      </header>

      <main className="app-main">
        <Routes>
          {/* "/"                -> the catalog of problems */}
          <Route path="/" element={<ProblemList />} />
          {/* "/problems/two-sum" -> that problem + code editor. :slug is a param. */}
          <Route path="/problems/:slug" element={<ProblemDetail />} />
          {/* anything else -> a simple not-found message */}
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
}
