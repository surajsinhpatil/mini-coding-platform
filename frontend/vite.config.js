// vite.config.js
// -----------------------------------------------------------------------------
// Vite is the build tool + dev server for the React app. In development it
// serves the app with instant hot-reload; for production `vite build` bundles
// everything into static files.
// -----------------------------------------------------------------------------

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // enables JSX + React Fast Refresh

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // the dev server URL: http://localhost:5173
  },
});
