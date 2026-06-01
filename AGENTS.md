# AGENTS.md

Guidance for AI agents. For end-user/API documentation, see [README.md](README.md).

## Project overview

- Headless, fully controlled Markdown editor React component built on
  [Lexical](https://lexical.dev/).
- Edits Markdown as rich text while keeping a plain Markdown string in sync via
  `@lexical/markdown`.
- Entry point: [src/index.ts](src/index.ts). Main component:
  [src/LexicalMarkdownEditor.tsx](src/LexicalMarkdownEditor.tsx).

## Commands

```sh
npm run check         # Biome lint + format check (run before committing)
npm run fix           # Biome auto-fix and format
npm test              # both Vitest projects once
npm run test:unit     # round-trip transformer tests (Node, headless Lexical)
npm run test:browser  # interaction tests (real Chrome via Playwright)
npm run dev:vanilla   # run an example app
```

- Type-checking runs via `tsc -b` (invoked by `build:*`); no standalone
  typecheck script.

## Architecture

`src/` is organized by responsibility:

- `config/` — editor assembly, feature flags, transformer wiring.
- `nodes/` — custom Lexical nodes + helpers.
- `transformers/` — `@lexical/markdown` transformers.
- `plugins/` — React plugins (`*.tsx`) + behavior helpers (`*.ts`).
- `hooks/` — editor-behavior hooks.
- `constants.ts` — `NODE_TYPES`, `DATA_ATTR`.

Invariants to respect:

- Fully controlled: `value` in, debounced `onChange` out. External `value`
  changes only re-parse when they don't match what the editor last emitted, so
  the controlled loop never fights the user's selection.
- Lexical nodes can't be (un)registered after init, so changing the enabled
  `features` set re-mounts the editor.
- Markdown ↔ Lexical conversion must round-trip
  (`$convertFromMarkdownString` → `$convertToMarkdownString` reproduces input).
- `$`-prefixed Lexical functions run only inside `editor.update()`/`.read()`.

## Testing

- Tests are colocated in `src/`; the filename suffix selects the Vitest project:
  - `*.test.ts` → unit (Node, no DOM, transformer round-trips).
  - `*.browser.test.tsx` → browser (real `contentEditable`/Selection).
- The browser project uses the system-installed Chrome (`channel: "chrome"`), so
  no `playwright install` is needed.
- Add a round-trip test for transformer changes; a browser test for interaction
  behavior.
- See [notes/DEVELOP.md](notes/DEVELOP.md) for more detail.

## Conventions

- Biome formats/lints ([biome.json](biome.json)); run `npm run fix` before
  committing.
- Code, comments, and docs in English.
- Keep the public API surface in [src/index.ts](src/index.ts).
- Commit titles: English, single line; blank line, then a `Co-Authored-By` trailer.
