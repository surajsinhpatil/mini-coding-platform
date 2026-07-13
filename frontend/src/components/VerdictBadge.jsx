// components/VerdictBadge.jsx
// -----------------------------------------------------------------------------
// A small presentational component: given a verdict string, show a colored pill.
// "Presentational" = it has no logic of its own; it just renders whatever prop
// it's given. Reusable anywhere a verdict needs to be displayed.
// -----------------------------------------------------------------------------

// Map each verdict to a CSS modifier class (colors live in styles.css).
const CLASS_BY_VERDICT = {
  Accepted: "verdict--ok",
  "Wrong Answer": "verdict--bad",
  "Time Limit Exceeded": "verdict--warn",
  "Runtime Error": "verdict--bad",
  "Compilation Error": "verdict--bad",
  Pending: "verdict--pending",
};

export default function VerdictBadge({ verdict }) {
  const modifier = CLASS_BY_VERDICT[verdict] || "verdict--pending";
  return <span className={`verdict ${modifier}`}>{verdict}</span>;
}
