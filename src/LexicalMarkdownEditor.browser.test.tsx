import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import LexicalMarkdownEditor from "./LexicalMarkdownEditor";

// Controlled wrapper mirroring how a host app drives the editor: it owns the
// markdown state and feeds edits back in, so the controlled <-> onChange loop is
// exercised the same way it would be in production.
function Harness({
  initial = "",
  debounce = 0,
  onChange,
}: {
  initial?: string;
  debounce?: number;
  onChange?: (markdown: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <LexicalMarkdownEditor
      value={value}
      onChangeDebounceMs={debounce}
      onChange={(markdown) => {
        setValue(markdown);
        onChange?.(markdown);
      }}
    />
  );
}

describe("LexicalMarkdownEditor (browser)", () => {
  it("renders an initial heading as rich content", async () => {
    await render(<Harness initial="# Hello" />);

    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Hello");
  });

  it("emits markdown through onChange as the user types", async () => {
    const onChange = vi.fn();
    await render(<Harness onChange={onChange} />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("hello world");

    await vi.waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith("hello world"),
    );
  });

  it("applies the heading markdown shortcut while typing", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("# Heading");

    await expect
      .element(page.getByRole("heading", { level: 1 }))
      .toHaveTextContent("Heading");
  });
});
