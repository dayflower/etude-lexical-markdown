import { HeadingNode } from "@lexical/rich-text";
import type { Klass, LexicalNode, LexicalNodeReplacement } from "lexical";

export function createMarkdownNodes(): ReadonlyArray<
  Klass<LexicalNode> | LexicalNodeReplacement
> {
  return [HeadingNode];
}
