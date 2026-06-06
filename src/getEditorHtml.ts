import { $generateHtmlFromNodes } from "@lexical/html";
import type { BaseSelection, LexicalEditor } from "lexical";

/**
 * Serializes a live editor's current content to semantic HTML.
 *
 * A thin wrapper around the standard `$generateHtmlFromNodes` that handles the
 * required `editor.read()` so callers don't have to import `@lexical/html` or
 * remember the read wrapper. Pair it with `LexicalMarkdownEditor`'s `editorRef`
 * prop:
 *
 * ```ts
 * const html = getEditorHtml(editorRef.current);
 * ```
 *
 * Pass a `selection` to export only the selected nodes. Requires a DOM
 * (`document`); see `markdownToHtml` for the Node caveat.
 */
export function getEditorHtml(
  editor: LexicalEditor,
  selection?: BaseSelection | null,
): string {
  return editor.read(() => $generateHtmlFromNodes(editor, selection));
}
