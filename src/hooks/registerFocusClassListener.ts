import type { LexicalEditor, NodeKey } from "lexical";
import { CSS_CLASSES } from "../constants";

// Toggles the shared `is-focused` class on the DOM elements matching `selector`
// based on the node keys returned by `$collectKeys` (evaluated against the
// current selection). Used by both the link and code-block plugins to highlight
// the block the caret currently sits in.
export function registerFocusClassListener(
  editor: LexicalEditor,
  selector: string,
  $collectKeys: () => Set<NodeKey>,
): () => void {
  return editor.registerUpdateListener(({ editorState }) => {
    let focusedKeys = new Set<NodeKey>();
    editorState.read(() => {
      focusedKeys = $collectKeys();
    });

    const root = editor.getRootElement();
    if (!root) return;
    root.querySelectorAll(`.${selector}`).forEach((dom) => {
      dom.classList.remove(CSS_CLASSES.FOCUSED);
    });
    focusedKeys.forEach((key) => {
      editor.getElementByKey(key)?.classList.add(CSS_CLASSES.FOCUSED);
    });
  });
}
