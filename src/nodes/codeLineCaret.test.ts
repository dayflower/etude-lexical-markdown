import { createHeadlessEditor } from "@lexical/headless";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  type LexicalEditor,
} from "lexical";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MARKDOWN_FEATURES } from "../config/features";
import { createMarkdownNodes } from "../config/nodes";
import {
  $flatTextAnchorOffset,
  $selectCollapsedClamped,
  $splitChildrenIntoLines,
  $sumTextContentSize,
} from "./codeLineCaret";
import {
  $appendCodeBlockChildren,
  $createMarkdownCodeBlockNode,
} from "./MarkdownCodeBlockNode";

const FEATURES = { ...DEFAULT_MARKDOWN_FEATURES, codeBlock: true };

function createEditor(): LexicalEditor {
  return createHeadlessEditor({
    namespace: "code-line-caret-test",
    nodes: [...createMarkdownNodes(FEATURES)],
    onError: (error) => {
      throw error;
    },
  });
}

// Maps each grouped line to the concatenated text of its nodes, so assertions
// read as the visual lines.
function linesToText(
  lines: ReturnType<typeof $splitChildrenIntoLines>,
): string[] {
  return lines.map((line) => line.map((n) => n.getTextContent()).join(""));
}

describe("codeLineCaret primitives", () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor();
  });

  describe("$sumTextContentSize", () => {
    it("adds the rendered size of each node, line breaks included", () => {
      editor.update(
        () => {
          const block = $createMarkdownCodeBlockNode("ts");
          $appendCodeBlockChildren(block, "```ts", ["ab", "cde"], "```");
          $getRoot().clear().append(block);
          // [open(5), lb(1), ab(2), lb(1), cde(3), lb(1), close(3)]
          expect($sumTextContentSize(block.getChildren())).toBe(16);
          expect($sumTextContentSize(block.getChildren().slice(0, 3))).toBe(8);
        },
        { discrete: true },
      );
    });
  });

  describe("$splitChildrenIntoLines", () => {
    it("groups fence-inclusive lines from index 0", () => {
      editor.update(
        () => {
          const block = $createMarkdownCodeBlockNode("ts");
          $appendCodeBlockChildren(block, "```ts", ["foo", "bar"], "```");
          $getRoot().clear().append(block);
          const children = block.getChildren();
          const lines = $splitChildrenIntoLines(children, 0, children.length);
          expect(linesToText(lines)).toEqual(["```ts", "foo", "bar", "```"]);
        },
        { discrete: true },
      );
    });

    it("treats the first content child as line 0 when skipping the fence", () => {
      editor.update(
        () => {
          const block = $createMarkdownCodeBlockNode("ts");
          $appendCodeBlockChildren(block, "```ts", ["foo", "", "bar"], "```");
          $getRoot().clear().append(block);
          const children = block.getChildren();
          // from = 2 skips the open fence (0) and structural line break (1);
          // to = length - 1 excludes the close fence. The line break that
          // precedes the close fence yields a trailing empty line, which the
          // restore path never indexes (it matches the original #3 bounds).
          const lines = $splitChildrenIntoLines(
            children,
            2,
            children.length - 1,
          );
          expect(linesToText(lines)).toEqual(["foo", "", "bar", ""]);
        },
        { discrete: true },
      );
    });
  });

  describe("$flatTextAnchorOffset", () => {
    it("sums preceding sibling sizes plus the in-node offset", () => {
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const a = $createTextNode("ab");
          const b = $createTextNode("cde");
          paragraph.append(a, b);
          $getRoot().clear().append(paragraph);
          expect($flatTextAnchorOffset(paragraph, b, 2)).toBe(4);
          expect($flatTextAnchorOffset(paragraph, a, 1)).toBe(1);
        },
        { discrete: true },
      );
    });

    it("returns null for an anchor outside the container", () => {
      editor.update(
        () => {
          const p1 = $createParagraphNode().append($createTextNode("x"));
          const p2 = $createParagraphNode();
          const orphan = $createTextNode("y");
          p2.append(orphan);
          $getRoot().clear().append(p1, p2);
          expect($flatTextAnchorOffset(p1, orphan, 0)).toBeNull();
        },
        { discrete: true },
      );
    });
  });

  describe("$selectCollapsedClamped", () => {
    it("clamps the offset to the node size", () => {
      editor.update(
        () => {
          const paragraph = $createParagraphNode();
          const text = $createTextNode("abc");
          paragraph.append(text);
          $getRoot().clear().append(paragraph);
          $selectCollapsedClamped(text, 99);
          const selection = $getSelection();
          if (!$isRangeSelection(selection)) throw new Error("no selection");
          expect(selection.anchor.offset).toBe(3);
          expect(selection.isCollapsed()).toBe(true);
        },
        { discrete: true },
      );
    });
  });
});
