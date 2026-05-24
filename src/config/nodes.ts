import { CodeHighlightNode } from "@lexical/code-core";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode } from "@lexical/rich-text";
import type { Klass, LexicalNode, LexicalNodeReplacement } from "lexical";
import {
  MarkdownCodeBlockNode,
  MarkdownCodeFenceNode,
} from "../nodes/MarkdownCodeBlockNode";
import {
  MarkdownLinkLabelNode,
  MarkdownLinkNode,
  MarkdownLinkUrlNode,
} from "../nodes/MarkdownLinkNode";

export function createMarkdownNodes(): ReadonlyArray<
  Klass<LexicalNode> | LexicalNodeReplacement
> {
  return [
    HeadingNode,
    ListNode,
    ListItemNode,
    MarkdownLinkNode,
    MarkdownLinkUrlNode,
    MarkdownLinkLabelNode,
    MarkdownCodeBlockNode,
    MarkdownCodeFenceNode,
    CodeHighlightNode,
  ];
}
