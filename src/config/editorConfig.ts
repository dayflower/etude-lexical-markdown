import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import type { EditorThemeClasses } from "lexical";
import {
  DEFAULT_MARKDOWN_FEATURES,
  type MarkdownFeatureFlags,
} from "./features";
import { createMarkdownNodes } from "./nodes";

export function createMarkdownTheme(): EditorThemeClasses {
  return {
    text: {
      bold: "lexical-md__bold",
      italic: "lexical-md__italic",
      strikethrough: "lexical-md__strikethrough",
      code: "lexical-md__inline-code",
    },
    heading: {
      h1: "lexical-md__h1",
      h2: "lexical-md__h2",
      h3: "lexical-md__h3",
      h4: "lexical-md__h4",
      h5: "lexical-md__h5",
      h6: "lexical-md__h6",
    },
    quote: "lexical-md__quote",
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
  features?: MarkdownFeatureFlags;
}

export function createInitialConfig({
  namespace,
  onError,
  theme,
  features = DEFAULT_MARKDOWN_FEATURES,
}: CreateInitialConfigParams): InitialConfigType {
  return {
    namespace,
    nodes: createMarkdownNodes(features),
    theme: theme ?? createMarkdownTheme(),
    onError: onError ?? defaultOnError,
  };
}

function defaultOnError(error: Error): void {
  console.error(error);
}
