import {
  $createListItemNode,
  $createListNode,
  $isListItemNode,
  $isListNode,
  type ListItemNode,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getSelection,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  COLLABORATION_TAG,
  COMMAND_PRIORITY_HIGH,
  HISTORIC_TAG,
  KEY_BACKSPACE_COMMAND,
  type LexicalNode,
  mergeRegister,
  type ParagraphNode,
} from "lexical";
import { useEffect } from "react";

// Trailing space is the trigger. Character class limited to space/x/X so that
// generic `[abc]` link syntax cannot match.
//
// ListItem variant fires only when the list contains a single item — this
// captures the canonical `- [ ] ` typing flow (the leading `- ` was consumed
// by UNORDERED_LIST to create a fresh single-item list, then the user types
// `[ ] ` inside it). Typing `[ ] ` inside an existing multi-item list is
// intentionally left as plain bullet text.
const LIST_ITEM_PATTERN = /^\[([ xX])?\]\s/;
const PARAGRAPH_PATTERN = /^-\s?\[([ xX])?\]\s/;

// Strips the `[ ] ` / `- [ ] ` prefix from `source`, moves its remaining
// children into a fresh single-item check list, and swaps `replaceTarget` for
// that list. For a paragraph the paragraph itself is the replace target; for an
// existing (single-item) bullet list item the whole list is replaced.
function $convertToCheckList(
  source: ListItemNode | ParagraphNode,
  replaceTarget: LexicalNode,
  prefixLen: number,
  checked: boolean,
): void {
  const first = source.getFirstChild();
  if (!$isTextNode(first)) return;
  const rest = first.getTextContent().slice(prefixLen);
  if (rest) {
    first.setTextContent(rest);
  } else {
    first.remove();
  }

  const newItem = $createListItemNode(checked);
  for (const c of source.getChildren()) newItem.append(c);
  const newList = $createListNode("check");
  newList.append(newItem);
  replaceTarget.replace(newList);
  newItem.selectStart();
}

// Inverse of $convertListItem / $convertParagraph: turn a check list item back
// into a paragraph whose text begins with `- [ ]` / `- [x]`.
function $unwrapCheckItem(item: ListItemNode): void {
  const parent = item.getParent();
  if (!$isListNode(parent) || parent.getListType() !== "check") return;

  const checked = item.getChecked() ?? false;
  // Always a compact `- [ ]` / `- [x]` (no trailing space). Conceptually the
  // Backspace consumes one character from the canonical markdown source form
  // `- [ ] content` — when empty, that strips the trailing space; when content
  // follows, that strips the separating space.
  const prefixText = checked ? "- [x]" : "- [ ]";
  const cursorOffset = prefixText.length;

  const newPara = $createParagraphNode();
  const prefixNode = $createTextNode(prefixText);
  newPara.append(prefixNode);
  for (const c of item.getChildren()) newPara.append(c);

  const prev = item.getPreviousSibling();
  const next = item.getNextSibling();
  if (!prev && !next) {
    parent.replace(newPara);
  } else if (!prev) {
    parent.insertBefore(newPara);
    item.remove();
  } else if (!next) {
    parent.insertAfter(newPara);
    item.remove();
  } else {
    const tail = $createListNode("check");
    let n: ListItemNode | null = next as ListItemNode;
    while (n) {
      const nn = n.getNextSibling() as ListItemNode | null;
      tail.append(n);
      n = nn;
    }
    parent.insertAfter(newPara);
    newPara.insertAfter(tail);
    item.remove();
  }

  prefixNode.select(cursorOffset, cursorOffset);
}

function $tryUnwrapAtSelection(): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false;

  const anchor = selection.anchor;
  let item: ListItemNode | null = null;

  if (anchor.type === "text") {
    if (anchor.offset !== 0) return false;
    const node = anchor.getNode();
    const parent = node.getParent();
    if (!$isListItemNode(parent)) return false;
    if (parent.getFirstChild() !== node) return false;
    item = parent;
  } else if (anchor.type === "element") {
    if (anchor.offset !== 0) return false;
    const node = anchor.getNode();
    if (!$isListItemNode(node)) return false;
    item = node;
  } else {
    return false;
  }

  const parent = item.getParent();
  if (!$isListNode(parent) || parent.getListType() !== "check") return false;

  $unwrapCheckItem(item);
  return true;
}

export default function CheckListShortcutPlugin(): null {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(
        ({ tags, dirtyLeaves, editorState, prevEditorState }) => {
          if (tags.has(COLLABORATION_TAG) || tags.has(HISTORIC_TAG)) return;
          if (editor.isComposing()) return;

          let prevAnchorOffset = -1;
          prevEditorState.read(() => {
            const sel = $getSelection();
            if ($isRangeSelection(sel)) {
              prevAnchorOffset = sel.anchor.offset;
            }
          });

          let triggerKey: string | null = null;
          let triggerOffset = 0;

          editorState.read(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection) || !selection.isCollapsed())
              return;

            const anchorKey = selection.anchor.key;
            const anchorOffset = selection.anchor.offset;
            if (!dirtyLeaves.has(anchorKey)) return;
            // Single-character insertion only (matches registerMarkdownShortcuts).
            if (anchorOffset !== 1 && anchorOffset > prevAnchorOffset + 1)
              return;

            const anchorNode = $getNodeByKey(anchorKey);
            if (!$isTextNode(anchorNode)) return;
            if (anchorNode.getTextContent()[anchorOffset - 1] !== " ") return;

            triggerKey = anchorKey;
            triggerOffset = anchorOffset;
          });

          if (triggerKey === null) return;

          editor.update(() => {
            const node = $getNodeByKey(triggerKey as string);
            if (!$isTextNode(node)) return;
            const parent = node.getParent();
            if (!parent || parent.getFirstChild() !== node) return;

            const text = node.getTextContent();

            if ($isListItemNode(parent)) {
              const list = parent.getParent();
              if (!$isListNode(list) || list.getListType() === "check") return;
              if (list.getChildrenSize() !== 1) return;
              const m = text.match(LIST_ITEM_PATTERN);
              if (!m || m[0].length !== triggerOffset) return;
              const checked = m[1] === "x" || m[1] === "X";
              $convertToCheckList(parent, list, m[0].length, checked);
            } else if ($isParagraphNode(parent)) {
              const m = text.match(PARAGRAPH_PATTERN);
              if (!m || m[0].length !== triggerOffset) return;
              const checked = m[1] === "x" || m[1] === "X";
              $convertToCheckList(parent, parent, m[0].length, checked);
            }
          });
        },
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        (event) => {
          if (!$tryUnwrapAtSelection()) return false;
          event?.preventDefault();
          return true;
        },
        COMMAND_PRIORITY_HIGH,
      ),
    );
  }, [editor]);
  return null;
}
