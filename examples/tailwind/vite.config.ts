import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Running `vite examples/tailwind` resolves this config from the root
// directory, so the Tailwind plugin is loaded with the example as the Vite
// root. (Pointing the root at this directory *without* a co-located config
// silently drops the plugins, leaving `@apply` and utilities unprocessed.)
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
