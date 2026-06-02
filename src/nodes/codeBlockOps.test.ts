import { createHeadlessEditor } from "@lexical/headless";
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalEditor,
} from "lexical";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MARKDOWN_FEATURES } from "../config/features";
import { createMarkdownNodes } from "../config/nodes";
import { $unwrapMarkdownCodeBlockNode } from "./codeBlockOps";
import {
  $appendCodeBlockChildren,
  $createMarkdownCodeBlockNode,
  type MarkdownCodeBlockNode,
} from "./MarkdownCodeBlockNode";

const FEATURES = { ...DEFAULT_MARKDOWN_FEATURES, codeBlock: true };

function createEditor(): LexicalEditor {
  return createHeadlessEditor({
    namespace: "code-block-ops-test",
    nodes: [...createMarkdownNodes(FEATURES)],
    onError: (error) => {
      throw error;
    },
  });
}

// Builds a code block with the canonical child layout
//   [ openFence, lb, (highlight)?, lb, (highlight)?, ..., lb, closeFence ]
// from `codeLines`, appends it to the root, and returns its node key.
function appendCodeBlock(
  editor: LexicalEditor,
  language: string,
  codeLines: string[],
): string {
  let key = "";
  editor.update(
    () => {
      const block = $createMarkdownCodeBlockNode(language);
      $appendCodeBlockChildren(block, `\`\`\`${language}`, codeLines, "```");
      $getRoot().clear().append(block);
      key = block.getKey();
    },
    { discrete: true },
  );
  return key;
}

type ResolvedCaret = {
  // Index of the paragraph (root child) the caret landed in.
  paragraphIndex: number;
  // Text content of the paragraph the caret landed in.
  paragraphText: string;
  // Collapsed caret offset, expressed against the paragraph's text content.
  offset: number;
};

// Reads back the collapsed caret after an unwrap, normalizing text- and
// element-anchored selections into the same paragraph-relative shape.
function readCaret(editor: LexicalEditor): ResolvedCaret {
  let result: ResolvedCaret | null = null;
  editor.read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
      throw new Error("expected a collapsed range selection");
    }
    const anchor = selection.anchor;
    const node = anchor.getNode();
    const paragraph = $isTextNode(node) ? node.getParent() : node;
    if (!$isElementNode(paragraph)) {
      throw new Error("expected the caret to resolve to a paragraph");
    }
    const rootChildren = $getRoot().getChildren();
    result = {
      paragraphIndex: rootChildren.findIndex((c) => c.is(paragraph)),
      paragraphText: paragraph.getTextContent(),
      // For an element anchor on an empty paragraph the offset is a child index
      // (0); for a text anchor it is the offset within the text node.
      offset: $isTextNode(node) ? anchor.offset : 0,
    };
  });
  if (!result) throw new Error("unreachable");
  return result;
}

function unwrap(editor: LexicalEditor, blockKey: string): void {
  editor.update(
    () => {
      const block = $getRoot()
        .getChildren()
        .find((c) => c.getKey() === blockKey) as MarkdownCodeBlockNode;
      $unwrapMarkdownCodeBlockNode(block);
    },
    { discrete: true },
  );
}

describe("$unwrapMarkdownCodeBlockNode caret preservation", () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor();
  });

  // Locks down the caret-preservation contract before refactoring the shared
  // "linearize caret -> restore" logic (REFACTOR.ja.md #1). A code block with
  //   ```ts / foo / bar / ```
  // unwraps into four paragraphs: ["```ts", "foo", "bar", "```"].

  it("restores a text caret inside a middle code line", () => {
    const key = appendCodeBlock(editor, "ts", ["foo", "bar"]);
    // children: [open, lb, foo(2), lb, bar(4), lb, close]
    editor.update(
      () => {
        const block = $getRoot().getFirstChild() as MarkdownCodeBlockNode;
        const foo = block.getChildAtIndex(2);
        if ($isTextNode(foo)) foo.select(1, 1);
      },
      { discrete: true },
    );

    unwrap(editor, key);

    expect(readCaret(editor)).toEqual({
      paragraphIndex: 1,
      paragraphText: "foo",
      offset: 1,
    });
  });

  it("restores a text caret inside the open fence line", () => {
    const key = appendCodeBlock(editor, "ts", ["foo", "bar"]);
    editor.update(
      () => {
        const block = $getRoot().getFirstChild() as MarkdownCodeBlockNode;
        const open = block.getOpenFence();
        open?.select(2, 2);
      },
      { discrete: true },
    );

    unwrap(editor, key);

    expect(readCaret(editor)).toEqual({
      paragraphIndex: 0,
      paragraphText: "```ts",
      offset: 2,
    });
  });

  it("restores an element caret at the start of a middle code line", () => {
    const key = appendCodeBlock(editor, "ts", ["foo", "bar"]);
    // Element anchor at child index 2 sits between the line break and "foo",
    // i.e. the start of the second line (lineIndex 1, lineOffset 0).
    editor.update(
      () => {
        const block = $getRoot().getFirstChild() as MarkdownCodeBlockNode;
        block.select(2, 2);
      },
      { discrete: true },
    );

    unwrap(editor, key);

    const caret = readCaret(editor);
    expect(caret.paragraphIndex).toBe(1);
    expect(caret.paragraphText).toBe("foo");
    expect(caret.offset).toBe(0);
  });

  it("restores an element caret onto an empty middle line", () => {
    const key = appendCodeBlock(editor, "ts", ["foo", "", "bar"]);
    // children: [open, lb, foo, lb, lb, bar, lb, close]
    // Element anchor at child index 4 is the start of the empty third line.
    editor.update(
      () => {
        const block = $getRoot().getFirstChild() as MarkdownCodeBlockNode;
        block.select(4, 4);
      },
      { discrete: true },
    );

    unwrap(editor, key);

    const caret = readCaret(editor);
    expect(caret.paragraphIndex).toBe(2);
    expect(caret.paragraphText).toBe("");
  });
});
