import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        // Markdown <-> Lexical conversion runs through a headless editor, so no
        // DOM environment is required for the round-trip suite.
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        // Interaction-driven plugin/hook behavior needs a real contentEditable
        // and Selection API, so these run in a browser. We reuse the system
        // Google Chrome via Playwright's `channel: "chrome"` instead of the
        // bundled Chromium, so no `playwright install` step is required.
        extends: true,
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.tsx"],
          browser: {
            enabled: true,
            provider: playwright({ launchOptions: { channel: "chrome" } }),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
