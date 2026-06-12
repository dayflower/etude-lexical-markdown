import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import LexicalMarkdownEditor from "./LexicalMarkdownEditor";

// Mirrors the controlled host wrapper used by the main browser suite.
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <LexicalMarkdownEditor
      value={value}
      onChangeDebounceMs={0}
      onChange={setValue}
    />
  );
}

// Reads the current collapsed DOM caret as { text, offset }, where `text` is the
// text content of the anchor node (or its parent for an element anchor).
function readDomCaret(): { text: string; offset: number } {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    throw new Error("no selection");
  }
  const node = selection.anchorNode;
  const text =
    node?.nodeType === Node.TEXT_NODE
      ? (node.textContent ?? "")
      : (node?.textContent ?? "");
  return { text, offset: selection.anchorOffset };
}

describe("code block caret preservation (browser)", () => {
  // REFACTOR.ja.md #1: re-tokenizing a code block must not move the caret.
  it("keeps the caret after re-highlighting on edit", async () => {
    await render(<Harness initial={"```\nabcdef\n```"} />);

    // Place the caret after "abc". Double-click selects the word and ArrowLeft
    // collapses to its start; {Home} is avoided because it is a no-op in WebKit.
    await userEvent.dblClick(page.getByText("abcdef"));
    await userEvent.keyboard("{ArrowLeft}{ArrowRight}{ArrowRight}{ArrowRight}");
    await userEvent.keyboard("X");

    // After the MarkdownCodeBlockNode transform rebuilds the highlighted
    // children, the caret should still sit right after the inserted "X".
    await vi.waitFor(() => {
      const caret = readDomCaret();
      expect(caret.text).toContain("abcXdef");
      expect(caret.offset).toBe(4);
    });
  });

  // REFACTOR.ja.md #3: typing a closing fence reassembles loose paragraphs into
  // a code block; the caret must land on the close fence it was sitting on.
  it("keeps the caret on the close fence after reassembly", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("```ts{Enter}const x = 1;{Enter}```");

    await vi.waitFor(() => {
      // A code block element now exists (the paragraphs were reassembled).
      expect(document.querySelectorAll("pre").length).toBe(1);
      const caret = readDomCaret();
      expect(caret.text).toBe("```");
      expect(caret.offset).toBe(3);
    });
  });
});
