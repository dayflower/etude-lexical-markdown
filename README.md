# etude-lexical-markdown

## Examples

Two self-contained examples live under [`examples/`](examples/), one per
styling approach:

- `examples/vanilla` — styled with plain CSS, no utility framework.
- `examples/tailwind` — styled with Tailwind CSS theme tokens.

Run either one:

```sh
npm run dev:vanilla
npm run dev:tailwind
```

Production builds: `npm run build:vanilla` / `npm run build:tailwind`.

## Styling

The editor emits no class names of its own. Two stable hooks are available:

- **`data-markdown-*` attributes** (always present) identify structural and
  state markers — `data-markdown-link`, `data-markdown-link-url`,
  `data-markdown-link-label`, `data-markdown-code-block`,
  `data-markdown-code-fence`, the focus state `data-focused`, and the
  root-level `data-markdown-markup-mode`. Target these from host CSS. The names
  are exported as `DATA_ATTR`.
- **The `classNames` prop** (`MarkdownClassNames`) injects decorative classes
  onto both Lexical built-in nodes and the custom Markdown nodes (`link`,
  `linkUrl`, `linkLabel`, `codeBlock`, `codeFence`); slots left undefined emit
  no class.

The `examples/vanilla` example styles via the `data-markdown-*` attributes,
while `examples/tailwind` injects utility classes through `classNames`.

Node `type` strings are exported separately as `NODE_TYPES` (these are
persisted in serialized state and are independent of styling).
