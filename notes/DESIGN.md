# Design

Design notes for `etude-lexical-markdown`: a headless, fully-controlled Markdown
editor React component built on [Lexical](https://lexical.dev/). For usage and
the public API see [../README.md](../README.md); for the agent-oriented guide see
[../AGENTS.md](../AGENTS.md); for the test setup see [DEVELOP.md](DEVELOP.md).

The component edits Markdown as rich text while keeping a plain Markdown string
in sync through `@lexical/markdown` transformers. The hard constraint underneath
almost every decision below is that the conversion must **round-trip**:
`$convertFromMarkdownString(md)` followed by `$convertToMarkdownString` has to
reproduce `md`. Most of the implementation cost went into the places where a
straight Lexical-to-Markdown mapping is not enough to hold that invariant while
also feeling natural to type into.

`src/` is split by responsibility: `config/` assembles the editor and wires
features/transformers, `nodes/` defines custom Lexical nodes and traversal
helpers, `transformers/` holds the `@lexical/markdown` transformers, `plugins/`
holds React plugins (`*.tsx`) plus their behavior helpers (`*.ts`), `hooks/`
holds editor-behavior hooks, and `constants.ts` centralizes `NODE_TYPES`,
`UPDATE_TAGS`, and `DATA_ATTR`.

## Editor assembly and the controlled loop

[src/LexicalMarkdownEditor.tsx](../src/LexicalMarkdownEditor.tsx) builds the
`LexicalComposer` and conditionally mounts each plugin based on the resolved
feature set (see [src/LexicalMarkdownEditor.tsx:170-220](../src/LexicalMarkdownEditor.tsx#L170-L220)).
Being *fully controlled* — `value` string in, debounced `onChange` string out —
is the part that fights Lexical the hardest, because naive controlled wiring
re-parses on every parent render and destroys the user's selection, or loops
forever (export → onChange → new value prop → import → update → export …).

Three plugins cooperate through a shared `lastEmittedRef`
([src/LexicalMarkdownEditor.tsx:154](../src/LexicalMarkdownEditor.tsx#L154)) and
the `UPDATE_TAGS` defined in [src/constants.ts:14](../src/constants.ts#L14):

- **`InitialValuePlugin`** imports the initial `value` exactly once, tagging the
  update with `UPDATE_TAGS.INITIAL`. That tag is *not* suppressed downstream, so
  the initial import emits one `onChange` whose only job is to seed
  `lastEmittedRef` with the canonical serialization of the initial value.
- **`ControlledValuePlugin`** re-imports a new `value` only when it differs from
  `lastEmittedRef.current`. When the incoming value equals what the editor last
  emitted, the import is skipped entirely, so a parent re-render with the same
  string never resets the caret. Its own import is tagged `UPDATE_TAGS.CONTROLLED`.
- **`OnChangePlugin`** registers an update listener that ignores
  `UPDATE_TAGS.CONTROLLED` updates (those came *from* the prop, re-emitting them
  would loop), debounces (default 100ms), re-exports, and calls `onChange` only
  when the result differs from `lastEmittedRef.current` — updating the ref at the
  same time.

Splitting "initial" from "controlled" keeps each plugin's condition trivial
instead of threading a "have we mounted yet?" flag through one combined plugin.

## Feature flags force a remount

The `features` prop toggles individual Markdown syntaxes
([src/config/features.ts](../src/config/features.ts)). Changing the enabled set
changes which Lexical nodes are registered
([src/config/nodes.ts](../src/config/nodes.ts)) and which transformers/plugins
are active — but **Lexical cannot register or unregister nodes after a composer
is initialized.** So `composerKey`
([src/LexicalMarkdownEditor.tsx:149-152](../src/LexicalMarkdownEditor.tsx#L149-L152))
folds the resolved features into a JSON string used as the `LexicalComposer`
`key`, forcing a full remount when features change. Styling props (`classNames`,
`theme`) deliberately stay *out* of that key, so changing appearance does not
blow away editor state.

## Markdown transformers: layering and ordering

[src/transformers/index.ts](../src/transformers/index.ts) assembles the
transformer list, and the order is load-bearing
([src/transformers/index.ts:33-62](../src/transformers/index.ts#L33-L62)):
multiline element (code block) → element (heading, blockquote, lists, horizontal
rule) → text-format (bold, italic, strikethrough, inline code) → text-match
(link). If the link text-match ran earlier it would swallow the inner markup of
`[**bold**](url)` before the bold transformer ever saw it.

`createMarkdownShortcutTransformers`
([src/transformers/index.ts:76-86](../src/transformers/index.ts#L76-L86)) is the
subset fed to `MarkdownShortcutPlugin`. It deliberately **excludes**
`LINK_TRANSFORMER`, `CODE_BLOCK_TRANSFORMER`, `CHECK_LIST`, and
`HORIZONTAL_RULE_TRANSFORMER`, because each of those needs richer
keystroke/exit/click behavior than the generic shortcut plugin offers, and is
driven by a dedicated plugin instead.

[src/markdown.roundtrip.test.ts](../src/markdown.roundtrip.test.ts) locks the
round-trip contract per transformer, and also pins the one documented
*divergence*: `@lexical/markdown` models a plain bullet list and a GFM task list
as distinct `ListNode` types, so adjacent plain/task items split into two lists
with a blank line between them
([src/markdown.roundtrip.test.ts:97-107](../src/markdown.roundtrip.test.ts#L97-L107)).
This is a Lexical limitation, not a bug in our transformers, and the test keeps
it from silently changing.

## Inline links as a five-node tree

Lexical's stock link stores just a URL and a rendered label. To let the user
edit the *literal* `[label](url)` markup inline, an inline link is modeled as
five nodes:

```
MarkdownLinkNode  ( isInline() )
  ├─ "["
  ├─ MarkdownLinkLabelNode( label )
  ├─ "]("
  ├─ MarkdownLinkUrlNode( url )
  └─ ")"
```

([src/nodes/MarkdownLinkNode.ts](../src/nodes/MarkdownLinkNode.ts)). The two
TextNode subclasses are generated from one factory so the brackets/label/url are
independently editable and styleable. `MarkdownLinkNode` caches `__url`/`__label`
and **export reads from that cache, not from scanning the children** — scanning a
half-edited tree (e.g. the user just backspaced into the `]`) would corrupt the
serialized Markdown.

[src/transformers/linkTransformer.ts](../src/transformers/linkTransformer.ts)
uses two regexps: an unanchored one for import (match `[label](url)` anywhere)
and a `$`-anchored one for live shortcut detection (only fire on a completed
pattern at the end of a text node, so typing mid-pattern doesn't misfire).
[src/plugins/MarkdownLinkPlugin.tsx](../src/plugins/MarkdownLinkPlugin.tsx) adds
the behavioral glue: convert matching text into a link node, demote orphaned
child nodes back to plain text, reroute text typed at the end of a link so it
lands *after* the `)` instead of breaking the markup, exit on Escape, a
two-stage focus/click model (click an unfocused link to focus it, click again to
open it), and converting pasted `<a>` HTML into Markdown.

## Code blocks: a structured container over raw text

This is the most involved subsystem.
[src/nodes/MarkdownCodeBlockNode.ts](../src/nodes/MarkdownCodeBlockNode.ts)
defines a `MarkdownCodeBlockNode` (element) plus a `MarkdownCodeFenceNode`
(editable fence text) with a canonical child layout:

```
[ openFence, lineBreak, content?, lineBreak, content?, …, closeFence ]
```

The line break immediately after the open fence is *structural* and never part
of the user's code, which is the central invariant behind `getCodeText()`
([src/nodes/MarkdownCodeBlockNode.ts:104](../src/nodes/MarkdownCodeBlockNode.ts#L104))
and `hasTrailingLineBreak()`
([src/nodes/MarkdownCodeBlockNode.ts:136](../src/nodes/MarkdownCodeBlockNode.ts#L136)).
The Markdown transformer must also strip the empty strings `@lexical/markdown`
frames the fenced content with, or every imported block grows phantom blank
lines ([src/transformers/codeBlockTransformer.ts](../src/transformers/codeBlockTransformer.ts)).

What made it hard:

- **Caret math across a heterogeneous tree.** Fences, line breaks, and Prism
  highlight nodes mean the caret cannot be tracked as a simple offset. Unwrapping
  a block to paragraphs, reassembling paragraphs into a block, and re-highlighting
  all map the point-based selection into linear *line/column* coordinates and back
  ([src/nodes/codeBlockOps.ts](../src/nodes/codeBlockOps.ts),
  [src/plugins/CodeHighlightingPlugin.tsx](../src/plugins/CodeHighlightingPlugin.tsx)).
- **Be permissive, then repair.** Rather than blocking invalid edits, the editor
  lets them happen and reconciles afterward: normalize the canonical layout on
  blur ([useCodeBlockNormalizeOnBlur](../src/hooks/useCodeBlockNormalizeOnBlur.ts)),
  unwrap to paragraphs when the fences no longer validate
  ([useCodeBlockValidationOnEdit](../src/hooks/useCodeBlockValidationOnEdit.ts)),
  reassemble paragraphs back into a block once the fences line up again
  ([useReassembleCodeBlock](../src/hooks/useReassembleCodeBlock.ts)), and drop
  empty blocks ([useRemoveEmptyCodeBlock](../src/hooks/useRemoveEmptyCodeBlock.ts)).
  Normalizing only on blur (not on every keystroke) avoids destroying the caret
  while the user is typing inside the block.
- **Highlighting without losing the caret.**
  [CodeHighlightingPlugin](../src/plugins/CodeHighlightingPlugin.tsx) re-tokenizes
  with Prism on each edit, swaps in fresh highlight children only when they
  actually differ, and restores the caret to the same absolute offset afterward.
  Prism grammars arrive via props (`prismLanguages`) because grammar registration
  is a side-effect import that a library shouldn't force on its host.
- **Escaping the block.** Enter/Escape/Arrow/Backspace each get a hook
  ([useInsertParagraphBehavior](../src/hooks/useInsertParagraphBehavior.ts),
  [useEscapeKeyBehavior](../src/hooks/useEscapeKeyBehavior.ts),
  [useArrowKeyExitBehavior](../src/hooks/useArrowKeyExitBehavior.ts),
  [useBackspaceKeyBehavior](../src/hooks/useBackspaceKeyBehavior.ts)) so the caret
  can leave a block at its edges instead of getting trapped, with exact position
  predicates in [src/nodes/cursorPredicates.ts](../src/nodes/cursorPredicates.ts).

## Blockquotes holding nested block containers

A quote can contain headings, lists, code blocks, and nested quotes, so it can't
be flattened to a single prefixed line.
[src/transformers/blockquoteTransformer.ts](../src/transformers/blockquoteTransformer.ts)
exports a quote by recursively exporting each child block and then prefixing
*every* produced line with `> ` (blank lines become a bare `>`). On import it
merges adjacent quotes, merges adjacent same-type lists, and carries open/close
code-fence state across quoted lines.

A subtle detail is the two markers: import uses `QUOTE_BLOCK_REGEXP` (`/^>\s?/`,
matches a bare `>`) while the typing shortcut uses `QUOTE_MARKER` (`/^>\s/`,
requires the space)
([src/transformers/blockquoteTransformer.ts:44-52](../src/transformers/blockquoteTransformer.ts#L44-L52)).
Importing bare `>` lines as real empty paragraphs is what makes the line-start
typing checks work later.

`transformBlockquoteChildMarkdown`
([src/transformers/blockquoteTransformer.ts](../src/transformers/blockquoteTransformer.ts),
driven from [src/plugins/BlockquoteBehaviorPlugin.tsx](../src/plugins/BlockquoteBehaviorPlugin.tsx))
converts block markers typed *inside* a quote (`# `, `- `, `> `, `[ ] `) into the
matching nested block — recursively and gated on which features are enabled.
[src/plugins/blockquoteBehavior.ts](../src/plugins/blockquoteBehavior.ts) and
[src/plugins/listBehavior.ts](../src/plugins/listBehavior.ts) handle the
structural editing: exiting a quote on an empty-line Enter while moving trailing
quoted blocks into a fresh quote, Backspace unwrapping or merging quotes, and
exiting a quoted list while preserving the remaining items in a trailing list.

## Markup mode without touching the model

[src/plugins/ModeClassPlugin.tsx](../src/plugins/ModeClassPlugin.tsx) toggles the
`DATA_ATTR.MARKUP_MODE` attribute ([src/constants.ts:31](../src/constants.ts#L31))
on the root element and nothing else. The `EditorState` is always the rich tree;
"markup mode" is purely a CSS concern keyed off that attribute, so switching
modes never re-parses or disturbs selection.

In the same spirit,
[src/hooks/registerFocusClassListener.ts](../src/hooks/registerFocusClassListener.ts)
(shared by links and code blocks) sets/clears `data-focused` directly on DOM
nodes from an update listener instead of going through React state, keeping focus
styling off the render path.

## Implementation notes

Areas that needed more than a straight Lexical mapping:

- **Controlled loop vs. selection.** A shared `lastEmittedRef` plus
  `UPDATE_TAGS.CONTROLLED`/`INITIAL` form a two-part guard: skip re-import when
  the prop equals the last emit (preserves caret), and skip emit on
  controlled-origin updates (breaks the loop).
- **Feature changes remount.** Lexical can't (un)register nodes post-init, so the
  feature set is baked into the composer `key`; styling changes are kept out of
  it to avoid needless remounts.
- **Inline links are a five-node tree.** Preserving editable `[label](url)` markup
  requires explicit bracket/label/url nodes, and export must read cached
  `__url`/`__label` rather than scan a possibly half-edited subtree.
- **Code-block caret mapping.** Unwrap, reassemble, and re-highlight all convert
  the caret between Lexical points and line/column coordinates because the block's
  children are a mix of fences, line breaks, and highlight nodes.
- **Permissive-then-repair code blocks.** Invalid edits are allowed and then
  normalized on blur, unwrapped on validation failure, or reassembled from
  paragraphs — normalizing only on blur so editing never eats the caret.
- **Highlight without caret loss.** Prism re-tokenization swaps children only when
  they differ and restores the caret to the same offset; grammars come from props
  so the library carries no side-effect imports.
- **Recursive blockquote export.** Nested blocks are exported then re-prefixed
  line by line (blank lines → bare `>`), and import/typing use different `>`
  markers so bare quoted lines import as real empty paragraphs.
- **Transformer order is fragile.** Multiline → element → text-format → text-match;
  the link text-match must come last or it eats inline markup inside link labels.
- **Markup mode stays out of the model.** It is a single root data attribute plus
  CSS, never an `EditorState` change.
- **Horizontal rules bridge two worlds.** `---` is editable text in Markdown but a
  non-editable decorator node in Lexical;
  [HorizontalRulePlugin](../src/plugins/HorizontalRulePlugin.tsx) converts on
  Enter / caret leaving the line and unwraps back to text on re-entry, normalizing
  `***`/`___` to `---` on round-trip.
