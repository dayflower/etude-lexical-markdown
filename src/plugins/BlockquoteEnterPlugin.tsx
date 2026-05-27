import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createQuoteNode, $isQuoteNode, QuoteNode } from "@lexical/rich-text";
import {
  $createLineBreakNode,
  $createParagraphNode,
  $getSelection,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  INSERT_PARAGRAPH_COMMAND,
  KEY_BACKSPACE_COMMAND,
  type LexicalNode,
  type RangeSelection,
} from "lexical";
import { useEffect } from "react";

interface Props {
  exitOnEmptyEnter: boolean;
}

function $findAncestorQuote(node: LexicalNode): QuoteNode | null {
  let current: LexicalNode | null = node;
  while (current !== null) {
    if ($isQuoteNode(current)) return current;
    current = current.getParent();
  }
  return null;
}

function $isEmptyLineInQuote(
  quote: QuoteNode,
  selection: RangeSelection,
): boolean {
  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();

  let prevSibling: LexicalNode | null;
  let nextSibling: LexicalNode | null;

  if ($isTextNode(anchorNode)) {
    if (anchor.offset > 0) return false;
    if (anchor.offset < anchorNode.getTextContentSize()) return false;
    prevSibling = anchorNode.getPreviousSibling();
    nextSibling = anchorNode.getNextSibling();
  } else if (anchorNode === quote) {
    const children = quote.getChildren();
    prevSibling = anchor.offset > 0 ? children[anchor.offset - 1] : null;
    nextSibling =
      anchor.offset < children.length ? children[anchor.offset] : null;
  } else {
    return false;
  }

  if (prevSibling !== null && !$isLineBreakNode(prevSibling)) return false;
  if (nextSibling !== null && !$isLineBreakNode(nextSibling)) return false;
  return true;
}

// Split the blockquote at the cursor's empty line: leading content stays in
// the original quote, a new paragraph is placed after it (with the cursor),
// and any trailing lines are moved into a fresh QuoteNode after the
// paragraph. Used by both Enter (on an empty line) and Backspace (on an
// empty line) so the two operations stay in sync.
function $splitQuoteAtEmptyLine(
  quote: QuoteNode,
  selection: RangeSelection,
): boolean {
  const anchor = selection.anchor;
  const anchorNode = anchor.getNode();

  let nodeBefore: LexicalNode | null = null;
  let nodeAfter: LexicalNode | null = null;
  if (anchorNode === quote) {
    const children = quote.getChildren();
    nodeBefore =
      anchor.offset > 0 ? (children[anchor.offset - 1] ?? null) : null;
    nodeAfter =
      anchor.offset < children.length
        ? (children[anchor.offset] ?? null)
        : null;
  } else if ($isTextNode(anchorNode)) {
    nodeBefore = anchorNode.getPreviousSibling();
    nodeAfter = anchorNode.getNextSibling();
    anchorNode.remove();
  } else {
    return false;
  }

  const tailChildren: LexicalNode[] = [];
  if (nodeAfter !== null && $isLineBreakNode(nodeAfter)) {
    let n: LexicalNode | null = nodeAfter.getNextSibling();
    nodeAfter.remove();
    while (n !== null) {
      const next: LexicalNode | null = n.getNextSibling();
      tailChildren.push(n);
      n = next;
    }
  }
  if (nodeBefore !== null && $isLineBreakNode(nodeBefore)) {
    nodeBefore.remove();
  }

  const para = $createParagraphNode();
  if (quote.getChildren().length === 0) {
    quote.replace(para);
  } else {
    quote.insertAfter(para);
  }
  if (tailChildren.length > 0) {
    const tailQuote = $createQuoteNode();
    for (const c of tailChildren) tailQuote.append(c);
    para.insertAfter(tailQuote);
  }
  para.selectStart();
  return true;
}

export default function BlockquoteEnterPlugin({
  exitOnEmptyEnter,
}: Props): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      INSERT_PARAGRAPH_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const quote = $findAncestorQuote(anchorNode);
        if (quote === null) return false;

        if (
          exitOnEmptyEnter &&
          $isEmptyLineInQuote(quote, selection) &&
          $splitQuoteAtEmptyLine(quote, selection)
        ) {
          return true;
        }

        selection.insertLineBreak();
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, exitOnEmptyEnter]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const anchorNode = selection.anchor.getNode();
        const quote = $findAncestorQuote(anchorNode);
        if (quote === null) return false;

        // Only trigger when the cursor is at the start of an empty line.
        if (!$isEmptyLineInQuote(quote, selection)) return false;

        event?.preventDefault();
        return $splitQuoteAtEmptyLine(quote, selection);
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor]);

  useEffect(() => {
    // Whenever two QuoteNode siblings end up adjacent (typically because the
    // user removed an empty paragraph between them), merge them into one so
    // that the markdown emission collapses back into a single `> ...` block.
    return editor.registerNodeTransform(QuoteNode, (node) => {
      const next = node.getNextSibling();
      if (!$isQuoteNode(next)) return;
      node.append($createLineBreakNode());
      const tail = next.getChildren();
      for (const c of tail) node.append(c);
      next.remove();
    });
  }, [editor]);

  return null;
}
