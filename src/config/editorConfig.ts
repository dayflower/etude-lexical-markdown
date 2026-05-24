import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import type { EditorThemeClasses } from "lexical";
import { createMarkdownNodes } from "./nodes";

export function createMarkdownTheme(): EditorThemeClasses {
  return {
    list: {
      ul: "lexical-md__ul",
      ol: "lexical-md__ol",
      listitem: "lexical-md__listitem",
      listitemChecked: "lexical-md__listitem--checked",
      listitemUnchecked: "lexical-md__listitem--unchecked",
      nested: {
        listitem: "lexical-md__listitem--nested",
      },
    },
  };
}

interface CreateInitialConfigParams {
  namespace: string;
  onError?: (error: Error) => void;
  theme?: EditorThemeClasses;
}

export function createInitialConfig({
  namespace,
  onError,
  theme,
}: CreateInitialConfigParams): InitialConfigType {
  return {
    namespace,
    nodes: createMarkdownNodes(),
    theme: theme ?? createMarkdownTheme(),
    onError: onError ?? defaultOnError,
  };
}

function defaultOnError(error: Error): void {
  console.error(error);
}
