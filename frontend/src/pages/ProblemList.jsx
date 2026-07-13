// pages/ProblemList.jsx
// -----------------------------------------------------------------------------
// The catalog page. On mount it fetches the list of problems from the API and
// renders them as links. Demonstrates the standard React data-fetching pattern:
// state for data / loading / error, filled in by an effect.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client.js";

export default function ProblemList() {
  // Three pieces of state cover every async UI: the data, a loading flag, and
  // an error message.
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // useEffect with an empty [] dependency array runs ONCE, after first render.
  // That's where side effects like data fetching go.
  useEffect(() => {
    api
      .listProblems()
      .then(setProblems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading problems…</p>;
  if (error) return <p className="error">Could not load problems: {error}</p>;

  return (
    <div>
      <h1>Problems</h1>
      <table className="problem-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th>Difficulty</th>
          </tr>
        </thead>
        <tbody>
          {problems.map((p) => (
            // React needs a stable, unique `key` per list item to update
            // efficiently. The problem id is perfect.
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>
                <Link to={`/problems/${p.slug}`}>{p.title}</Link>
              </td>
              <td>
                <span className={`difficulty difficulty--${p.difficulty.toLowerCase()}`}>
                  {p.difficulty}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
