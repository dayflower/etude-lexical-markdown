import {
  $createListItemNode,
  $createListNode,
  $isListNode,
  type ListNode,
} from "@lexical/list";
import type { ElementTransformer } from "@lexical/markdown";
import { ORDERED_LIST, UNORDERED_LIST } from "@lexical/markdown";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  type HeadingTagType,
  QuoteNode,
} from "@lexical/rich-text";
import {
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
  type TextNode,
} from "lexical";
import {
  DEFAULT_MARKDOWN_FEATURES,
  type MarkdownFeatureFlags,
} from "../config/features";

const HEADING_MARKER = /^(#{1,6})\s/;
const ORDERED_LIST_MARKER = /^(\d{1,})\.\s/;
const QUOTE_MARKER = /^>\s/;
const UNORDERED_LIST_MARKER = /^[-*+]\s/;

// Which nested block markers the blockquote recognizes on import / when typed
// inside a quote. Gated by the editor's feature flags so we never create nodes
// (HeadingNode, ListNode, ...) that were not registered with the editor.
function resolveBlockMarkers(features: MarkdownFeatureFlags) {
  return {
    heading: features.heading,
    list: features.list,
    quote: features.blockquote,
  };
}

export function createBlockquoteTransformer(
  features: MarkdownFeatureFlags = DEFAULT_MARKDOWN_FEATURES,
): ElementTransformer {
  return {
    dependencies: [QuoteNode],
    export: (node, exportChildren) => {
      if (!$isQuoteNode(node)) {
        return null;
      }

      return exportQuoteNode(node, exportChildren);
    },
    regExp: QUOTE_MARKER,
    replace: (parentNode, children, _match, isImport) => {
      const quoteNode = $createQuoteNode();
      quoteNode.append(...createBlocksFromMarkdownChildren(children, features));

      if (isImport) {
        const previousNode = parentNode.getPreviousSibling();

        if ($isQuoteNode(previousNode)) {
          appendBlocksToQuote(previousNode, quoteNode.getChildren());
          parentNode.remove();
          return;
        }
      }

      parentNode.replace(quoteNode);

      if (!isImport) {
        quoteNode.selectStart();
      }
    },
    type: "element",
  };
}

export function transformBlockquoteChildMarkdown(
  parentNode: ElementNode,
  anchorNode: TextNode,
  anchorOffset: number,
  features: MarkdownFeatureFlags = DEFAULT_MARKDOWN_FEATURES,
): boolean {
  if (parentNode.getFirstChild() !== anchorNode) {
    return false;
  }

  const quoteNode = parentNode.getParent();

  if (
    !$isQuoteNode(quoteNode) ||
    anchorNode.getTextContent()[anchorOffset - 1] !== " "
  ) {
    return false;
  }

  const textContent = anchorNode.getTextContent();
  const match = getBlockMarkerMatch(textContent, features);

  if (match === null || match[0].length !== anchorOffset) {
    return false;
  }

  const nextSiblings = anchorNode.getNextSiblings();
  const [markerNode, remainderNode] = anchorNode.splitText(anchorOffset);
  const content = remainderNode
    ? [remainderNode, ...nextSiblings]
    : nextSiblings;
  const replacementBlocks = createBlocksFromMarkdownChildren(
    [$createTextNode(match[0]), ...content],
    features,
  );

  markerNode.remove();
  parentNode.replace(replacementBlocks[0]);
  let previousBlock = replacementBlocks[0];

  for (const block of replacementBlocks.slice(1)) {
    previousBlock.insertAfter(block);
    previousBlock = block;
  }

  replacementBlocks[0].selectStart();
  return true;
}

function exportQuoteNode(
  quoteNode: QuoteNode,
  exportChildren: (node: ElementNode) => string,
): string {
  const childMarkdown = quoteNode
    .getChildren()
    .map((child) => exportBlockNode(child, exportChildren))
    .filter((value) => value !== null)
    .join("\n");

  return childMarkdown
    .split("\n")
    .map((line) => (line.length === 0 ? ">" : `> ${line}`))
    .join("\n");
}

function exportBlockNode(
  node: LexicalNode,
  exportChildren: (node: ElementNode) => string,
): string | null {
  if ($isQuoteNode(node)) {
    return exportQuoteNode(node, exportChildren);
  }

  if ($isHeadingNode(node)) {
    const level = Number(node.getTag().slice(1));
    return `${"#".repeat(level)} ${exportChildren(node)}`;
  }

  if ($isListNode(node)) {
    const transformer =
      node.getListType() === "number" ? ORDERED_LIST : UNORDERED_LIST;
    return transformer.export(node, exportChildren);
  }

  if ($isParagraphNode(node) || $isElementNode(node)) {
    return exportChildren(node);
  }

  return node.getTextContent();
}

function createBlocksFromMarkdownChildren(
  children: LexicalNode[],
  features: MarkdownFeatureFlags,
): ElementNode[] {
  const markers = resolveBlockMarkers(features);
  const markerText = getChildrenText(children);

  if (markers.heading && HEADING_MARKER.test(markerText)) {
    const match = markerText.match(HEADING_MARKER);
    const heading = $createHeadingNode(
      `h${match?.[1].length ?? 1}` as HeadingTagType,
    );
    heading.append(...removeTextPrefix(children, match?.[0].length ?? 0));
    return [heading];
  }

  if (markers.list && UNORDERED_LIST_MARKER.test(markerText)) {
    return [
      createListBlock(
        "bullet",
        removeTextPrefix(
          children,
          markerText.match(UNORDERED_LIST_MARKER)?.[0].length ?? 0,
        ),
      ),
    ];
  }

  if (markers.list && ORDERED_LIST_MARKER.test(markerText)) {
    const match = markerText.match(ORDERED_LIST_MARKER);
    return [
      createListBlock(
        "number",
        removeTextPrefix(children, match?.[0].length ?? 0),
        Number(match?.[1] ?? 1),
      ),
    ];
  }

  if (markers.quote && QUOTE_MARKER.test(markerText)) {
    const quote = $createQuoteNode();
    quote.append(
      ...createBlocksFromMarkdownChildren(
        removeTextPrefix(
          children,
          markerText.match(QUOTE_MARKER)?.[0].length ?? 0,
        ),
        features,
      ),
    );
    return [quote];
  }

  const paragraph = $createParagraphNode();
  paragraph.append(...children);
  return [paragraph];
}

function createListBlock(
  listType: "bullet" | "number",
  children: LexicalNode[],
  start = 1,
): ListNode {
  const list = $createListNode(listType, start);
  const listItem = $createListItemNode();
  listItem.append(...children);
  list.append(listItem);
  return list;
}

function appendBlocksToQuote(quoteNode: QuoteNode, blocks: LexicalNode[]) {
  const previousBlock = quoteNode.getLastChild();
  const nextBlock = blocks[0];

  if (
    $isListNode(previousBlock) &&
    $isListNode(nextBlock) &&
    previousBlock.getListType() === nextBlock.getListType()
  ) {
    previousBlock.append(...nextBlock.getChildren());
    blocks.shift();
  }

  quoteNode.append(...blocks);
}

function getBlockMarkerMatch(
  textContent: string,
  features: MarkdownFeatureFlags,
): RegExpMatchArray | null {
  const markers = resolveBlockMarkers(features);

  return (
    (markers.heading ? textContent.match(HEADING_MARKER) : null) ??
    (markers.list ? textContent.match(UNORDERED_LIST_MARKER) : null) ??
    (markers.list ? textContent.match(ORDERED_LIST_MARKER) : null) ??
    (markers.quote ? textContent.match(QUOTE_MARKER) : null)
  );
}

function getChildrenText(children: LexicalNode[]): string {
  return children.map((child) => child.getTextContent()).join("");
}

function removeTextPrefix(
  children: LexicalNode[],
  prefixLength: number,
): LexicalNode[] {
  let remainingLength = prefixLength;
  const strippedChildren: LexicalNode[] = [];

  for (const child of children) {
    if (remainingLength === 0) {
      strippedChildren.push(child);
      continue;
    }

    if ($isTextNode(child)) {
      const text = child.getTextContent();

      if (text.length <= remainingLength) {
        removeIfAttached(child);
        remainingLength -= text.length;
        continue;
      }

      child.setTextContent(text.slice(remainingLength));
      remainingLength = 0;
      strippedChildren.push(child);
      continue;
    }

    if ($isLineBreakNode(child)) {
      remainingLength -= 1;
      removeIfAttached(child);
      continue;
    }

    strippedChildren.push(child);
  }

  return strippedChildren;
}

function removeIfAttached(node: LexicalNode) {
  if (node.isAttached()) {
    node.remove();
  }
}
