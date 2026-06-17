# etude-lexical-markdown

A headless, controlled Markdown editor component built on
[Lexical](https://lexical.dev/). It edits Markdown as rich text and keeps a
plain Markdown string in sync, parsing and serializing through
`@lexical/markdown` with a curated set of transformers. The component ships no
CSS of its own — styling is left entirely to the host application.

## Distribution

This component is not published to npm, and there are no plans to publish it.
It is meant to be copied into your project and adapted: real use cases tend to
require fine-grained changes at the source level, so vendoring the code gives you
the control that a versioned package would get in the way of. You are free to
take the source into your own projects under the terms of the [LICENSE](LICENSE).

The package-style imports shown below assume you have vendored the code under a
local module name (rename it to whatever suits your project).

## Usage

`LexicalMarkdownEditor` is fully controlled: pass the current Markdown as
`value` and receive edits through `onChange`.

```tsx
import { useState } from "react";
import { LexicalMarkdownEditor } from "etude-lexical-markdown";

export function Example() {
  const [markdown, setMarkdown] = useState("# Hello\n\nStart typing…");

  return (
    <LexicalMarkdownEditor
      value={markdown}
      onChange={setMarkdown}
      placeholder="Write some Markdown…"
    />
  );
}
```

The editor parses `value` into a Lexical tree on mount and whenever an external
`value` change does not match what the editor last emitted, so the controlled
loop never fights the user's selection. `onChange` is debounced (100 ms by
default; configurable via `onChangeDebounceMs`).

### Code highlighting

Prism grammars are not bundled. Register them in the host app via side-effect
imports and pass them through `prismLanguages` (or rely on Prism's global
registry):

```tsx
import Prism from "prismjs";
import "prismjs/components/prism-typescript";

<LexicalMarkdownEditor
  value={markdown}
  onChange={setMarkdown}
  prismLanguages={{ typescript: Prism.languages.typescript }}
  languageAliases={{ ts: "typescript" }}
/>;
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | — | Controlled Markdown source. |
| `onChange` | `(markdown: string) => void` | — | Called with the serialized Markdown after edits (debounced). |
| `namespace` | `string` | `"LexicalMarkdownEditor"` | Lexical editor namespace. |
| `placeholder` | `ReactNode` | — | Placeholder shown while empty. |
| `ariaPlaceholder` | `string` | `""` | `aria-placeholder` for the content-editable. |
| `className` | `string` | — | Class applied to the `ContentEditable`. |
| `rootClassName` | `string` | — | Extra class on the wrapper `div` (alongside `lexical-md`). |
| `classNames` | `MarkdownClassNames` | — | Curated class names merged into the Lexical theme (see Styling). |
| `theme` | `EditorThemeClasses` | — | Raw Lexical theme override, deep-merged on top of `classNames`. |
| `contentEditableProps` | `Partial<ContentEditableProps>` | — | Extra props forwarded to `ContentEditable` (except `placeholder`). |
| `onChangeDebounceMs` | `number` | `100` | Debounce window for `onChange`. `0` emits synchronously. |
| `prismLanguages` | `PrismLanguages` | — | Prism grammars for code highlighting. |
| `languageAliases` | `LanguageAliases` | — | Fence-language → grammar-key aliases, merged with built-in defaults. |
| `features` | `Partial<MarkdownFeatureFlags>` | all on except `horizontalRule` | Toggle individual Markdown syntax features. |
| `blockquoteExitOnEmptyEnter` | `boolean` | `true` | Whether Enter on an empty quoted line exits the blockquote. |
| `editorRef` | `Ref<LexicalEditor>` | — | Receives the underlying Lexical editor instance (see [HTML output](#html-output)). |

### HTML output

The editor is Markdown-first, but every node implements Lexical's `exportDOM`,
so you can render the current content to semantic HTML. Pass an `editorRef` to
reach the editor instance and call `getEditorHtml`, a thin wrapper around the
standard [`$generateHtmlFromNodes`](https://lexical.dev/docs/packages/lexical-html)
that handles the required `editor.read()`:

```tsx
import { useRef } from "react";
import { getEditorHtml, LexicalMarkdownEditor } from "etude-lexical-markdown";
import type { LexicalEditor } from "lexical";

function Editor() {
  const editorRef = useRef<LexicalEditor>(null);

  const exportHtml = () => {
    if (!editorRef.current) return;
    console.log(getEditorHtml(editorRef.current));
  };

  return (
    <>
      <LexicalMarkdownEditor value={value} onChange={setValue} editorRef={editorRef} />
      <button onClick={exportHtml}>Export HTML</button>
    </>
  );
}
```

`getEditorHtml(editor, selection?)` takes an optional selection to export only
the selected nodes. If you'd rather call Lexical directly, `$generateHtmlFromNodes`
from `@lexical/html` works the same way — wrap it in `editor.read(...)`.

Links export as `<a href>`, fenced code blocks as `<pre><code class="language-…">`,
and horizontal rules as `<hr>` — the Markdown syntax characters (`[`, `](`, fences)
are not included in the output.

#### Without a live editor

To render a stored Markdown string to HTML without mounting the component (e.g.
for previews or server-side rendering), use `markdownToHtml`. It uses the same
node/transformer wiring internally:

```ts
import { markdownToHtml } from "etude-lexical-markdown";

const html = markdownToHtml("# Title\n\nSee [docs](https://example.com).");
// "<h1>Title</h1><p>See <a href=\"https://example.com\">docs</a>.</p>"

// Match the editor's enabled features when they differ from the defaults:
markdownToHtml(md, { features: { horizontalRule: true } });
```

> **Note:** `markdownToHtml` (and `$generateHtmlFromNodes`) call
> `document.createElement`, so they need a DOM. In the browser this works as-is;
> in Node, install a DOM shim such as `jsdom`/`happy-dom` and expose `document`
> globally before calling.

### Supported Markdown features

Each `MarkdownFeatureFlags` key toggles one feature. Changing the enabled set
re-mounts the underlying editor, since Lexical cannot register/unregister nodes
after initialization.

| Feature | Flag | Default | Notes |
| --- | --- | --- | --- |
| Headings | `heading` | `true` | ATX-style (`#`) only. |
| Bullet / ordered lists | `list` | `true` | Nested items must indent by **4 spaces** (see below). |
| Task lists | `taskList` | `true` | `- [ ]` / `- [x]`; requires `list`. |
| Links | `link` | `true` | Inline `[label](url)` form only. |
| Auto links | `autoLink` | `true` | Decorates a bare URL (`https://…`) in place; the text stays the raw URL. cmd/ctrl+click opens it. |
| Code blocks | `codeBlock` | `true` | Fenced ` ``` `; Prism highlighting optional. |
| Inline code | `inlineCode` | `true` | `` `code` ``. |
| Bold | `bold` | `true` | `**bold**`. |
| Italic | `italic` | `true` | `*italic*`. |
| Strikethrough | `strikethrough` | `true` | `~~text~~`. |
| Blockquotes | `blockquote` | `true` | `>`; nesting supported. |
| Horizontal rules | `horizontalRule` | `false` | `---`. |

**List indentation is 4 spaces per level.** A nested item indented by only 2
spaces is parsed as a sibling at the parent level (the nesting is lost), so
`@lexical/markdown` both expects and emits 4-space indentation for sublists.

### Not supported

Some Markdown that many parsers accept is intentionally out of scope. If your
content uses these, they round-trip as plain text rather than rich nodes:

| Feature | Example |
| --- | --- |
| Tables (GFM pipe tables) | `\| a \| b \|` |
| Images | `![alt](url)` |
| Reference-style links / definitions | `[text][ref]` / `[ref]: url` |
| Footnotes | `[^1]` and its definition |
| Autolinks | bare URLs or `<https://…>` (not linkified) |
| Raw / inline HTML | passed through as literal text |
| Setext headings | underline form (`===` / `---`); use `#` instead |

## Low-level API

Applications that need full control can assemble their own `LexicalComposer`
instead of using `LexicalMarkdownEditor`. The package re-exports the building
blocks from its entry point:

- **Config helpers** — `createInitialConfig`, `createMarkdownNodes`,
  `createMarkdownTheme`, `resolveMarkdownFeatures`, `DEFAULT_MARKDOWN_FEATURES`.
- **Transformers** — `MARKDOWN_TRANSFORMERS`, `MARKDOWN_SHORTCUT_TRANSFORMERS`,
  the factories `createMarkdownTransformers` / `createMarkdownShortcutTransformers`,
  and the individual `LINK_TRANSFORMER`, `CODE_BLOCK_TRANSFORMER`,
  `HORIZONTAL_RULE_TRANSFORMER`, `createBlockquoteTransformer`.
- **Nodes** — `MarkdownLinkNode`, `MarkdownLinkUrlNode`, `MarkdownLinkLabelNode`,
  `MarkdownCodeBlockNode`, `MarkdownCodeFenceNode`, with their `$create*` /
  `$is*` helpers.
- **Plugins** — `MarkdownLinkPlugin`, `MarkdownCodeBlockPlugin`,
  `CodeHighlightingPlugin`, `InitialValuePlugin`, `ControlledValuePlugin`,
  `OnChangePlugin`, `ListBehaviorPlugin`, `BlockquoteBehaviorPlugin`,
  `CheckListShortcutPlugin`.
- **Constants** — `NODE_TYPES`, `DATA_ATTR`.
- **Types** — `LexicalMarkdownEditorProps`, `MarkdownFeatureFlags`,
  `MarkdownClassNames`, `MarkdownTheme`, `PrismLanguages`, `LanguageAliases`.

## Styling

The editor emits no class names of its own. Two stable hooks are available:

- **`data-markdown-*` attributes** (always present) identify structural and
  state markers — `data-markdown-link`, `data-markdown-link-url`,
  `data-markdown-link-label`, `data-markdown-auto-link`,
  `data-markdown-code-block`, `data-markdown-code-fence`, the focus state
  `data-focused`, and `data-mod-pressed` (set on the root while a cmd/ctrl
  modifier is held, mirroring the cmd/ctrl+click that opens an auto-linked URL —
  use it to show a pointer cursor on a hovered URL, e.g.
  `[data-mod-pressed] [data-markdown-auto-link]:hover { cursor: pointer; }`).
  Target these
  from host CSS. The names are exported as `DATA_ATTR`. (Markup mode's
  `data-markdown-markup-mode` is set by the host, not the library — see
  [Markup mode](#markup-mode).)
- **The `classNames` prop** (`MarkdownClassNames`) injects decorative classes
  onto both Lexical built-in nodes and the custom Markdown nodes (`link`,
  `linkUrl`, `linkLabel`, `autoLink`, `codeBlock`, `codeFence`); slots left
  undefined emit
  no class.

The `examples/vanilla` example styles via the `data-markdown-*` attributes,
while `examples/tailwind` injects utility classes through `classNames`.

Node `type` strings are exported separately as `NODE_TYPES` (these are
persisted in serialized state and are independent of styling).

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

### Markup mode

Both examples also show how to optionally reveal the raw Markdown syntax (`#`,
`**`, …) alongside the rendered text. This is purely a CSS decoration the host
adds in its own stylesheet — there is no prop for it. Add `::before`/`::after`
rules gated by a `data-markdown-markup-mode` attribute, then toggle that
attribute on any element wrapping the editor (its descendant selectors reach the
editor's content). The editor's nodes and plugins are identical regardless, so
toggling it never re-parses or disturbs the selection — copy the toggle from
either example.

## Development

For working on this component — the test suites and contribution notes — see
[notes/DEVELOP.md](notes/DEVELOP.md).

## Predecessor etudes

This component is the culmination of a series of focused Lexical etudes:

- <https://github.com/dayflower/etude-lexical-markdown-link>
- <https://github.com/dayflower/etude-lexical-markdown-blockquote>
- <https://github.com/dayflower/etude-lexical-code-block>

## License

[MIT](LICENSE)
