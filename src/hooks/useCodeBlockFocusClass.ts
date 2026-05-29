import type { LexicalEditor } from "lexical";
import { useEffect } from "react";
import { CSS_CLASSES } from "../constants";
import { $collectFocusedCodeBlockKeys } from "./focusedCodeBlockKeys";
import { registerFocusClassListener } from "./registerFocusClassListener";

export function useCodeBlockFocusClass(editor: LexicalEditor): void {
  useEffect(() => {
    return registerFocusClassListener(
      editor,
      CSS_CLASSES.CODE_BLOCK,
      $collectFocusedCodeBlockKeys,
    );
  }, [editor]);
}
