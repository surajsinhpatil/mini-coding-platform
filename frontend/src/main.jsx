// main.jsx
// -----------------------------------------------------------------------------
// The JavaScript ENTRY POINT of the React app (index.html points here).
// Its only job: find the empty <div id="root"> and render our React tree into
// it, wrapped in the router so pages can have their own URLs.
// -----------------------------------------------------------------------------

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import "./styles.css";

// createRoot is React 18's way to start ("mount") an app.
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode adds extra dev-time checks and warnings (no effect in production).
  <React.StrictMode>
    {/* BrowserRouter enables client-side routing using the URL bar. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
