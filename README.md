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

### Modes

`mode` toggles between `"rich"` (default) and `"markup"`. It only sets the
`data-markdown-markup-mode` attribute on the root element — host CSS decides how
to render the markup-revealing state. The set of nodes and plugins is identical
in both modes.

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
| `mode` | `"rich" \| "markup"` | `"rich"` | Toggles the `data-markdown-markup-mode` root attribute. |
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

### Supported Markdown features

`MarkdownFeatureFlags` keys: `heading`, `list`, `taskList`, `link`, `codeBlock`,
`inlineCode`, `bold`, `italic`, `strikethrough`, `blockquote` (all `true` by
default) and `horizontalRule` (`false` by default). Changing the enabled set
re-mounts the underlying editor, since Lexical cannot register/unregister nodes
after initialization.

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
  `OnChangePlugin`, `ModeClassPlugin`, `ListBehaviorPlugin`,
  `BlockquoteBehaviorPlugin`, `CheckListShortcutPlugin`.
- **Constants** — `NODE_TYPES`, `DATA_ATTR`.
- **Types** — `LexicalMarkdownEditorProps`, `EditorMode`,
  `MarkdownFeatureFlags`, `MarkdownClassNames`, `MarkdownTheme`,
  `PrismLanguages`, `LanguageAliases`.

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
