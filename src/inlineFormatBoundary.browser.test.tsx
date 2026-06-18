import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import LexicalMarkdownEditor from "./LexicalMarkdownEditor";

// Controlled host wrapper that also exposes the latest emitted Markdown so
// assertions can inspect the serialized round-trip output.
function Harness({
  initial = "",
  onValue,
}: {
  initial?: string;
  onValue?: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <LexicalMarkdownEditor
      value={value}
      onChangeDebounceMs={0}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

// Returns the text content of every <code> element inside the editor.
function codeTexts(): string[] {
  return Array.from(document.querySelectorAll(".lexical-md code")).map(
    (el) => el.textContent ?? "",
  );
}

describe("inline format boundary behavior (browser)", () => {
  // Reproduces the reported bug: after re-entering and leaving a code span via
  // ArrowLeft/ArrowRight, Space must be inserted as plain text, not inside the
  // code span.
  it("Space at the trailing edge of a code span is plain text", async () => {
    let latest = "";
    await render(<Harness onValue={(v) => (latest = v)} />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("`x`");
    // Return into the code span, then back to its trailing edge.
    await userEvent.keyboard("{ArrowLeft}{ArrowRight}");
    await userEvent.keyboard(" y");

    await vi.waitFor(() => {
      expect(latest).toBe("`x` y");
      // The code span content stays "x"; the space and "y" are outside it.
      expect(codeTexts()).toEqual(["x"]);
    });
  });

  // The most severe symptom: pressing Enter at the trailing edge used to keep
  // the new line in "code mode" with no way out.
  it("Enter at the trailing edge of a code span exits code mode", async () => {
    let latest = "";
    await render(<Harness onValue={(v) => (latest = v)} />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("`x`");
    await userEvent.keyboard("{ArrowLeft}{ArrowRight}");
    await userEvent.keyboard("{Enter}y");

    await vi.waitFor(() => {
      // New line is plain text, not another code span.
      expect(latest).toBe("`x`\n\ny");
      expect(codeTexts()).toEqual(["x"]);
    });
  });

  // The fix applies to all inline formats, not just code.
  it("Space at the trailing edge of bold is not bold", async () => {
    let latest = "";
    await render(<Harness onValue={(v) => (latest = v)} />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("**b**");
    await userEvent.keyboard("{ArrowLeft}{ArrowRight}");
    await userEvent.keyboard(" y");

    await vi.waitFor(() => {
      expect(latest).toBe("**b** y");
      expect(document.querySelectorAll(".lexical-md strong").length).toBe(1);
    });
  });

  // Regression guard: typing in the middle of a code span stays code.
  it("typing inside a code span stays code", async () => {
    let latest = "";
    await render(<Harness onValue={(v) => (latest = v)} />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("`abc`");
    // Move into the middle of the span (between "b" and "c").
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("X");

    await vi.waitFor(() => {
      expect(latest).toBe("`abXc`");
      expect(codeTexts()).toEqual(["abXc"]);
    });
  });
});
