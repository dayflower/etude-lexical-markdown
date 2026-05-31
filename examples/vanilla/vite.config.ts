import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The vanilla example is intentionally Tailwind-free: only the React plugin
// is needed. Running `vite examples/vanilla` picks up this config because Vite
// resolves the config from the root directory.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
});
