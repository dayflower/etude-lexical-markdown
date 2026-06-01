# Development

Notes for working on `etude-lexical-markdown` itself. For usage and the public
API, see [../README.md](../README.md); for a condensed agent-oriented guide, see
[../AGENTS.md](../AGENTS.md).

## Testing

Tests are split into two Vitest projects:

- **`unit`** (Node) — round-trip tests verifying that each transformer parses
  and serializes symmetrically: `$convertFromMarkdownString(md)` followed by
  `$convertToMarkdownString` reproduces the input. These run against a headless
  Lexical editor with no DOM.
- **`browser`** — interaction tests for the behavior that needs a real
  `contentEditable` and Selection API (initial render, live typing, the
  markdown-shortcut conversions, mode switching). These run in a real browser
  via Vitest browser mode. The Playwright provider is configured with
  `channel: "chrome"`, so it drives the system-installed Google Chrome and no
  `playwright install` step is required.

```sh
npm test            # run both projects once
npm run test:unit   # round-trip only (Node)
npm run test:browser # interaction only (Chrome)
npm run test:watch
```

Test files live in `src/` (colocated) and the filename suffix selects the
project: `*.test.ts` runs in Node, `*.browser.test.tsx` runs in the browser.
Cross-cutting tests that exercise the package as a whole sit at the top of
`src/` (e.g. `markdown.roundtrip.test.ts`); module-specific unit tests should be
colocated next to the module they cover.
