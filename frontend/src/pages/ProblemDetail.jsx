// pages/ProblemDetail.jsx
// -----------------------------------------------------------------------------
// The heart of the UI: shows one problem, provides a code editor, and submits
// the code to the backend to be judged — then shows the verdict.
//
// Two async interactions:
//   1. on mount: load the problem (statement + sample tests) by its slug.
//   2. on Submit: POST the code, wait for the judge, display the result.
// -----------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api/client.js";
import VerdictBadge from "../components/VerdictBadge.jsx";

// A blank C++ template the user starts from.
const STARTER_CODE = `#include <iostream>
using namespace std;

int main() {
    // Read input from standard input (cin),
    // then print your answer to standard output (cout).

    return 0;
}
`;

export default function ProblemDetail() {
  // useParams reads the ":slug" segment from the URL (e.g. "sum-of-two-numbers").
  const { slug } = useParams();

  const [problem, setProblem] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // The editor's text is "controlled" React state: the textarea shows `code`,
  // and typing updates `code`.
  const [code, setCode] = useState(STARTER_CODE);

  // Submission state.
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);       // the judged submission
  const [submitError, setSubmitError] = useState(null);

  // Load the problem when the page opens (and again if the slug changes).
  useEffect(() => {
    api
      .getProblem(slug)
      .then(setProblem)
      .catch((err) => setLoadError(err.message));
  }, [slug]);

  // Runs when the user clicks "Submit".
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const submission = await api.submit({ problemId: problem.id, sourceCode: code });
      setResult(submission);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) return <p className="error">Could not load problem: {loadError}</p>;
  if (!problem) return <p>Loading…</p>;

  return (
    <div className="problem-detail">
      {/* ---- Left: the statement -------------------------------------- */}
      <section className="statement">
        <h1>
          {problem.title}{" "}
          <span className={`difficulty difficulty--${problem.difficulty.toLowerCase()}`}>
            {problem.difficulty}
          </span>
        </h1>

        {/* The description is markdown text from the DB. We render it as
            preformatted text to keep dependencies minimal; swapping in a
            markdown renderer (react-markdown) is a drop-in upgrade. */}
        <pre className="markdown">{problem.description}</pre>

        {problem.samples?.length > 0 && (
          <div className="samples">
            <h3>Sample tests</h3>
            {problem.samples.map((s) => (
              <div key={s.ordinal} className="sample">
                <div>
                  <strong>Input</strong>
                  <pre>{s.input}</pre>
                </div>
                <div>
                  <strong>Expected output</strong>
                  <pre>{s.expected_output}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Right: the editor + submit ------------------------------- */}
      <section className="editor-panel">
        <label className="editor-label">Your C++ solution</label>
        {/* A plain <textarea> is the simplest real editor. A syntax-highlighting
            editor (Monaco / CodeMirror) is an easy later upgrade. */}
        <textarea
          className="editor"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Judging…" : "Submit"}
        </button>

        {submitError && <p className="error">{submitError}</p>}

        {/* The verdict panel appears once we have a result. */}
        {result && (
          <div className="result">
            <div className="result-head">
              <VerdictBadge verdict={result.verdict} />
              {result.runtime_ms != null && (
                <span className="result-meta">{result.runtime_ms} ms</span>
              )}
              {result.failed_test != null && (
                <span className="result-meta">failed on test #{result.failed_test}</span>
              )}
            </div>
            {result.detail && <pre className="result-detail">{result.detail}</pre>}
          </div>
        )}
      </section>
    </div>
  );
}
