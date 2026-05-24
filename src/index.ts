// Public API entry for etude-lexical-markdown.

export {
  createInitialConfig,
  createMarkdownTheme,
} from "./config/editorConfig";
export { createMarkdownNodes } from "./config/nodes";
export { MARKDOWN_TRANSFORMERS } from "./config/transformers";
export type {
  EditorMode,
  LexicalMarkdownEditorProps,
} from "./LexicalMarkdownEditor";
export { default as LexicalMarkdownEditor } from "./LexicalMarkdownEditor";

export { default as ControlledValuePlugin } from "./plugins/ControlledValuePlugin";
export { default as InitialValuePlugin } from "./plugins/InitialValuePlugin";
export { default as OnChangePlugin } from "./plugins/OnChangePlugin";
