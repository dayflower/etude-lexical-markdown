import {
  $handleListInsertParagraph,
  $isListItemNode,
  $isListNode,
  type ListItemNode,
} from "@lexical/list";
import { $isQuoteNode } from "@lexical/rich-text";
import {
  $copyNode,
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  type LexicalNode,
  type RangeSelection,
} from "lexical";

type ListSelectionContext = {
  listItemNode: ListItemNode;
  selection: RangeSelection;
};

function getCollapsedListSelection(): ListSelectionContext | null {
  const selection = $getSelection();

  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const listItemNode = getNearestListItemNode(selection.anchor.getNode());

  if (listItemNode === null || !isOrderedOrUnorderedListItem(listItemNode)) {
    return null;
  }

  return {
    listItemNode,
    selection,
  };
}

function getNearestListItemNode(node: LexicalNode): ListItemNode | null {
  let currentNode: LexicalNode | null = node;

  while (currentNode !== null) {
    if ($isListItemNode(currentNode)) {
      return currentNode;
    }

    currentNode = currentNode.getParent();
  }

  return null;
}

function isOrderedOrUnorderedListItem(listItemNode: ListItemNode): boolean {
  const listNode = listItemNode.getParent();

  if (!$isListNode(listNode)) {
    return false;
  }

  const listType = listNode.getListType();
  return listType === "bullet" || listType === "number";
}

function isTopLevelListItem(listItemNode: ListItemNode): boolean {
  return listItemNode.getIndent() === 0;
}

function isEmptyListItem(listItemNode: ListItemNode): boolean {
  return listItemNode.getTextContent().trim() === "";
}

function isSelectionAtListItemStart(
  selection: RangeSelection,
  listItemNode: ListItemNode,
): boolean {
  const anchorNode = selection.anchor.getNode();

  if (anchorNode.is(listItemNode)) {
    return selection.anchor.offset === 0;
  }

  if (selection.anchor.offset !== 0) {
    return false;
  }

  return anchorNode.is(listItemNode.getFirstDescendant());
}

export function handleListEnter(event: KeyboardEvent | null): boolean {
  if (event?.shiftKey) {
    return false;
  }

  const context = getCollapsedListSelection();

  if (
    context === null ||
    !isTopLevelListItem(context.listItemNode) ||
    !isEmptyListItem(context.listItemNode)
  ) {
    return false;
  }

  const handled =
    exitQuoteListAtEmptyItem(context.listItemNode) ||
    $handleListInsertParagraph();

  if (handled) {
    event?.preventDefault();
  }

  return handled;
}

function exitQuoteListAtEmptyItem(listItemNode: ListItemNode): boolean {
  const listNode = listItemNode.getParent();

  if (!$isListNode(listNode)) {
    return false;
  }

  const quoteNode = listNode.getParent();

  if (!$isQuoteNode(quoteNode)) {
    return false;
  }

  const paragraph = $createParagraphNode();
  paragraph.setDirection(quoteNode.getDirection());

  const trailingListItems = listItemNode.getNextSiblings();
  listNode.insertAfter(paragraph);

  if (trailingListItems.length > 0) {
    const trailingList = $copyNode(listNode);
    trailingList.append(...trailingListItems);
    paragraph.insertAfter(trailingList);
  }

  listItemNode.remove();

  if (listNode.isEmpty()) {
    listNode.remove();
  }

  paragraph.selectStart();
  return true;
}

export function handleListShiftTab(event: KeyboardEvent): boolean {
  if (!event.shiftKey) {
    return false;
  }

  const context = getCollapsedListSelection();

  if (
    context === null ||
    !isTopLevelListItem(context.listItemNode) ||
    !isSelectionAtListItemStart(context.selection, context.listItemNode)
  ) {
    return false;
  }

  const { listItemNode } = context;
  const listNode = listItemNode.getParentOrThrow();
  const paragraph = $createParagraphNode();
  paragraph.setDirection(listNode.getDirection());
  listItemNode.replace(paragraph, true);
  paragraph.selectStart();

  event.preventDefault();
  return true;
}
