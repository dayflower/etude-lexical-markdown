// Lexical node `type` strings. These are persisted in serialized editor state,
// so the string values must stay stable for backward compatibility even though
// they happen to look like the legacy CSS class names.
export const NODE_TYPES = {
  LINK: "markdown-link",
  LINK_URL: "markdown-link-url",
  LINK_LABEL: "markdown-link-label",
  CODE_BLOCK: "markdown-code-block",
  CODE_FENCE: "markdown-code-fence",
} as const;

// Stable `data-*` attribute hooks the editor always emits. Behavioral code
// (focus tracking, click delegation, mode switching) and host CSS target these
// instead of class names, so visual styling can be left entirely to the
// `classNames` prop. `FOCUSED` / `MARKUP_MODE` are state markers toggled at
// runtime; the rest are structural markers set in each node's `createDOM`.
export const DATA_ATTR = {
  LINK: "data-markdown-link",
  LINK_URL: "data-markdown-link-url",
  LINK_LABEL: "data-markdown-link-label",
  CODE_BLOCK: "data-markdown-code-block",
  CODE_FENCE: "data-markdown-code-fence",
  FOCUSED: "data-focused",
  MARKUP_MODE: "data-markdown-markup-mode",
} as const;
