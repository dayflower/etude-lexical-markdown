import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { CSS_CLASSES } from "../constants";
import type { EditorMode } from "../LexicalMarkdownEditor";

interface Props {
  mode: EditorMode;
}

export default function ModeClassPlugin({ mode }: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const apply = (root: HTMLElement | null): void => {
      if (!root) return;
      if (mode === "source") {
        root.classList.add(CSS_CLASSES.SOURCE_MODE);
      } else {
        root.classList.remove(CSS_CLASSES.SOURCE_MODE);
      }
    };

    apply(editor.getRootElement());

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) {
        prevRootElement.classList.remove(CSS_CLASSES.SOURCE_MODE);
      }
      apply(rootElement);
    });
  }, [editor, mode]);

  return null;
}
