// Public API entry for etude-lexical-markdown.

export {
  createInitialConfig,
  createMarkdownTheme,
} from "./config/editorConfig";
export {
  DEFAULT_MARKDOWN_FEATURES,
  type MarkdownFeatureFlags,
  resolveMarkdownFeatures,
} from "./config/features";
export { createMarkdownNodes } from "./config/nodes";
export {
  CODE_BLOCK_TRANSFORMER,
  createMarkdownShortcutTransformers,
  createMarkdownTransformers,
  HORIZONTAL_RULE_TRANSFORMER,
  LINK_TRANSFORMER,
  MARKDOWN_SHORTCUT_TRANSFORMERS,
  MARKDOWN_TRANSFORMERS,
} from "./config/transformers";
export { CSS_CLASSES } from "./constants";
export type {
  EditorMode,
  LexicalMarkdownEditorProps,
} from "./LexicalMarkdownEditor";
export { default as LexicalMarkdownEditor } from "./LexicalMarkdownEditor";

export {
  $appendCodeBlockChildren,
  $createEmptyMarkdownCodeBlockNode,
  $createMarkdownCodeBlockNode,
  $createMarkdownCodeFenceNode,
  $isMarkdownCodeBlockNode,
  $isMarkdownCodeFenceNode,
  MarkdownCodeBlockNode,
  MarkdownCodeFenceNode,
} from "./nodes/MarkdownCodeBlockNode";

export {
  $createMarkdownLinkLabelNode,
  $createMarkdownLinkNode,
  $createMarkdownLinkUrlNode,
  $isMarkdownLinkLabelNode,
  $isMarkdownLinkNode,
  $isMarkdownLinkUrlNode,
  MarkdownLinkLabelNode,
  MarkdownLinkNode,
  MarkdownLinkUrlNode,
} from "./nodes/MarkdownLinkNode";

export { default as CheckListShortcutPlugin } from "./plugins/CheckListShortcutPlugin";

export type {
  LanguageAliases,
  PrismLanguages,
} from "./plugins/CodeHighlightingPlugin";
export { default as CodeHighlightingPlugin } from "./plugins/CodeHighlightingPlugin";

export { default as ControlledValuePlugin } from "./plugins/ControlledValuePlugin";
export { default as InitialValuePlugin } from "./plugins/InitialValuePlugin";
export { default as MarkdownCodeBlockPlugin } from "./plugins/MarkdownCodeBlockPlugin";
export { default as MarkdownLinkPlugin } from "./plugins/MarkdownLinkPlugin";
export { default as ModeClassPlugin } from "./plugins/ModeClassPlugin";
export { default as OnChangePlugin } from "./plugins/OnChangePlugin";
