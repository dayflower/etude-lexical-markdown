import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { DATA_ATTR } from "../constants";
import type { EditorMode } from "../LexicalMarkdownEditor";

interface Props {
  mode: EditorMode;
}

export default function ModeClassPlugin({ mode }: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const apply = (root: HTMLElement | null): void => {
      if (!root) return;
      if (mode === "markup") {
        root.setAttribute(DATA_ATTR.MARKUP_MODE, "");
      } else {
        root.removeAttribute(DATA_ATTR.MARKUP_MODE);
      }
    };

    apply(editor.getRootElement());

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) {
        prevRootElement.removeAttribute(DATA_ATTR.MARKUP_MODE);
      }
      apply(rootElement);
    });
  }, [editor, mode]);

  return null;
}
