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
    codeHighlight: {
      atrule: "token atrule",
      attr: "token attr",
      "attr-name": "token attr-name",
      "attr-value": "token attr-value",
      boolean: "token boolean",
      builtin: "token builtin",
      cdata: "token cdata",
      char: "token char",
      "class-name": "token class-name",
      comment: "token comment",
      constant: "token constant",
      deleted: "token deleted",
      doctype: "token doctype",
      entity: "token entity",
      function: "token function",
      important: "token important",
      inserted: "token inserted",
      keyword: "token keyword",
      namespace: "token namespace",
      number: "token number",
      operator: "token operator",
      prolog: "token prolog",
      property: "token property",
      punctuation: "token punctuation",
      regex: "token regex",
      selector: "token selector",
      string: "token string",
      symbol: "token symbol",
      tag: "token tag",
      url: "token url",
      variable: "token variable",
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
