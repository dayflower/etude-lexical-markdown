import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import LexicalMarkdownEditor from "./LexicalMarkdownEditor";

// Mirrors the controlled host wrapper used by the other browser suites, but also
// surfaces the emitted Markdown so assertions can inspect the round-trip output.
function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  // The emitted Markdown is exposed via an attribute (not text content) so it
  // does not collide with `getByText` lookups against the editor body.
  return (
    <>
      <LexicalMarkdownEditor
        value={value}
        onChangeDebounceMs={0}
        onChange={setValue}
      />
      <div data-testid="emitted" data-md={value} />
    </>
  );
}

// Dispatches a real paste event carrying external clipboard payloads (no
// `application/x-lexical-editor`), as a browser/other-app copy would produce.
function dispatchPaste(plain: string, html?: string): void {
  const root = document.querySelector('[contenteditable="true"]');
  if (!root) throw new Error("no contentEditable root");
  const clipboardData = new DataTransfer();
  clipboardData.setData("text/plain", plain);
  if (html !== undefined) clipboardData.setData("text/html", html);
  root.dispatchEvent(
    new ClipboardEvent("paste", { clipboardData, bubbles: true }),
  );
}

function emittedMarkdown(): string {
  return (
    document
      .querySelector('[data-testid="emitted"]')
      ?.getAttribute("data-md") ?? ""
  );
}

describe("code block external paste (browser)", () => {
  it("pastes external plain text as code content", async () => {
    await render(<Harness initial={"```\nabcdef\n```"} />);

    // Collapse the caret inside the code block (after the word).
    await userEvent.dblClick(page.getByText("abcdef"));
    await userEvent.keyboard("{ArrowRight}");

    dispatchPaste("foo\nbar", "<p>SHOULD_NOT_APPEAR</p>");

    await vi.waitFor(() => {
      const md = emittedMarkdown();
      // Still a single, intact fenced block.
      expect(document.querySelectorAll("pre[data-language]").length).toBe(1);
      // The plain text landed as code content...
      expect(md).toContain("foo");
      expect(md).toContain("bar");
      // ...and the HTML payload was ignored (no link/paragraph conversion).
      expect(md).not.toContain("SHOULD_NOT_APPEAR");
    });
  });

  it("pastes an external link as literal text inside code", async () => {
    await render(<Harness initial={"```\ncode\n```"} />);

    await userEvent.dblClick(page.getByText("code"));
    await userEvent.keyboard("{ArrowRight}");

    // MarkdownLinkPlugin would normally convert this to `[Example](...)`; inside
    // a code block it must stay literal.
    dispatchPaste(
      "https://example.com",
      '<a href="https://example.com">Example</a>',
    );

    await vi.waitFor(() => {
      const md = emittedMarkdown();
      expect(md).toContain("https://example.com");
      expect(md).not.toContain("[Example]");
    });
  });
});
