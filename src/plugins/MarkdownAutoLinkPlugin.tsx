import { $isCodeHighlightNode } from "@lexical/code-core";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_LOW,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  KEY_ENTER_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  TextNode,
} from "lexical";
import { useEffect } from "react";
import { DATA_ATTR } from "../constants";
import {
  $createMarkdownAutoLinkNode,
  $isMarkdownAutoLinkNode,
  MarkdownAutoLinkNode,
} from "../nodes/MarkdownAutoLinkNode";
import { $isMarkdownCodeBlockNode } from "../nodes/MarkdownCodeBlockNode";
import {
  $isMarkdownLinkLabelNode,
  $isMarkdownLinkNode,
  $isMarkdownLinkUrlNode,
} from "../nodes/MarkdownLinkNode";

// Detect a single bare URL in a text run. The `(?<!\S)` boundary keeps
// `foohttps://x` from matching mid-word; trailing punctuation stays in the URL
// (`\S+`) and is left to the host to live with, mirroring the design.
const AUTO_LINK_MATCH_REGEX = /(?<!\S)([A-Za-z][A-Za-z0-9+.-]*:\/\/\S+)/;
// Re-validate that a node's whole text is still a single URL. Anchored, so no
// leading boundary is needed.
const AUTO_LINK_FULL_MATCH_REGEX = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/\S+$/;

function $unwrapMarkdownAutoLinkNode(node: MarkdownAutoLinkNode): void {
  const textNode = $createTextNode(node.getTextContent());
  // Carry the caret over to the replacement so an edit that breaks the URL (and
  // thus unwraps it) does not lose the selection or make the caret jump.
  const selection = $getSelection();
  let caretOffset: number | null = null;
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const child = node.getFirstChild();
    if (child && selection.anchor.key === child.getKey()) {
      caretOffset = selection.anchor.offset;
    }
  }
  node.replace(textNode);
  if (caretOffset !== null) textNode.select(caretOffset, caretOffset);
}

function $validateAutoLink(parent: MarkdownAutoLinkNode): void {
  if (!AUTO_LINK_FULL_MATCH_REGEX.test(parent.getTextContent())) {
    $unwrapMarkdownAutoLinkNode(parent);
  }
}

function shouldSkip(node: TextNode, parent: LexicalNode | null): boolean {
  // These TextNode subclasses already belong to a richer structure.
  if (
    $isMarkdownLinkUrlNode(node) ||
    $isMarkdownLinkLabelNode(node) ||
    $isCodeHighlightNode(node)
  ) {
    return true;
  }
  if (
    $isMarkdownLinkNode(parent) ||
    $isMarkdownAutoLinkNode(parent) ||
    $isMarkdownCodeBlockNode(parent)
  ) {
    return true;
  }
  // Inline code spans should stay literal.
  if (node.hasFormat("code")) return true;
  return false;
}

function useNodeTransforms(editor: LexicalEditor): void {
  useEffect(() => {
    const cleanups: Array<() => void> = [];

    // Detection + re-validation on plain text.
    cleanups.push(
      editor.registerNodeTransform(TextNode, (node) => {
        const parent = node.getParent();
        if ($isMarkdownAutoLinkNode(parent)) {
          $validateAutoLink(parent);
          return;
        }
        if (shouldSkip(node, parent)) return;

        const text = node.getTextContent();
        const match = AUTO_LINK_MATCH_REGEX.exec(text);
        if (!match) return;

        const selection = $getSelection();

        const startIndex = match.index;
        // Defensive: a URL right after `](` is the URL half of an explicit
        // `[label](url)` still in plain-text form; let MarkdownLinkPlugin claim
        // it instead of decorating it as a bare URL.
        if (text.slice(0, startIndex).endsWith("](")) return;

        const url = match[1];
        const endIndex = startIndex + url.length;

        // Defer while the caret is still on the URL: the user is actively typing
        // the address, so wrapping now would replace the caret's node and lose
        // the selection. Decoration lands once a separator pushes the caret past
        // the URL (or for non-interactive content like a loaded value, where
        // there is no caret here).
        if (
          $isRangeSelection(selection) &&
          selection.isCollapsed() &&
          selection.anchor.key === node.getKey() &&
          selection.anchor.offset >= startIndex &&
          selection.anchor.offset <= endIndex
        ) {
          return;
        }

        let urlTextNode: typeof node;
        if (startIndex === 0) {
          [urlTextNode] = node.splitText(endIndex);
        } else {
          [, urlTextNode] = node.splitText(startIndex, endIndex);
        }

        const autoLinkNode = $createMarkdownAutoLinkNode();
        autoLinkNode.append($createTextNode(url));
        urlTextNode.replace(autoLinkNode);
      }),
    );

    // Structural re-validation: catches child merges/splits the TextNode
    // transform above might miss.
    cleanups.push(
      editor.registerNodeTransform(MarkdownAutoLinkNode, (node) => {
        $validateAutoLink(node);
      }),
    );

    return () =>
      cleanups.forEach((fn) => {
        fn();
      });
  }, [editor]);
}

// A bare URL has no closing delimiter, so typed characters at the end of a
// decoration naturally extend the URL — which is what we want while the user is
// still typing the address. The one exception is a separator (whitespace):
// letting it flow into the decoration would force an unwrap/re-wrap churn and
// misplace the caret. Eject leading-whitespace insertions to a sibling after
// the decoration so the URL ends cleanly and the caret lands outside it.
function useSeparatorEjection(editor: LexicalEditor): void {
  useEffect(() => {
    const removeCommandListener = editor.registerCommand(
      CONTROLLED_TEXT_INSERTION_COMMAND,
      (payload) => {
        const text =
          typeof payload === "string" ? payload : (payload as InputEvent).data;
        if (!text || !/^\s/.test(text)) return false;

        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed())
          return false;

        const anchor = selection.anchor;
        const anchorNode = anchor.getNode();
        if (!$isTextNode(anchorNode)) return false;

        const parent = anchorNode.getParent();
        if (!$isMarkdownAutoLinkNode(parent)) return false;
        if (anchor.offset !== anchorNode.getTextContentSize()) return false;

        const nextSibling = parent.getNextSibling();
        if ($isTextNode(nextSibling)) {
          const current = nextSibling.getTextContent();
          nextSibling.setTextContent(text + current);
          nextSibling.select(text.length, text.length);
        } else {
          const newNode = $createTextNode(text);
          parent.insertAfter(newNode);
          newNode.select(text.length, text.length);
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      removeCommandListener();
    };
  }, [editor]);
}

// Decoration is deferred while the caret sits on the URL (see the TextNode
// transform). A trailing separator re-runs the transform because it edits the
// node, but pressing Enter only splits the paragraph and leaves the URL node
// untouched — so it would never decorate. Mark that node dirty on Enter (then
// let the default line break proceed) so the transform fires; by the time it
// runs the caret has moved to the new block, so the deferral no longer applies.
function useEnterDecoration(editor: LexicalEditor): void {
  useEffect(() => {
    const removeCommandListener = editor.registerCommand(
      KEY_ENTER_COMMAND,
      () => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed())
          return false;

        const anchor = selection.anchor;
        const node = anchor.getNode();
        if (!$isTextNode(node)) return false;
        if (anchor.offset !== node.getTextContentSize()) return false;

        const parent = node.getParent();
        if (shouldSkip(node, parent)) return false;
        if (!AUTO_LINK_MATCH_REGEX.test(node.getTextContent())) return false;

        node.markDirty();
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );

    return () => {
      removeCommandListener();
    };
  }, [editor]);
}

function useClickHandling(editor: LexicalEditor): void {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Editing stays the default; only cmd/ctrl+click opens the URL.
      if (!e.metaKey && !e.ctrlKey) return;
      const target = e.target as HTMLElement;
      const linkEl = target.closest(
        `[${DATA_ATTR.AUTO_LINK}]`,
      ) as HTMLElement | null;
      if (!linkEl) return;

      const url = linkEl.textContent;
      if (url) {
        e.preventDefault();
        window.open(url, "_blank", "noopener,noreferrer");
      }
    };

    const removeRootListener = editor.registerRootListener(
      (rootElement, prevRootElement) => {
        prevRootElement?.removeEventListener("click", handleClick);
        rootElement?.addEventListener("click", handleClick);
      },
    );

    return () => {
      removeRootListener();
    };
  }, [editor]);
}

export default function MarkdownAutoLinkPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useNodeTransforms(editor);
  useSeparatorEjection(editor);
  useEnterDecoration(editor);
  useClickHandling(editor);
  return null;
}
