import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import LexicalMarkdownEditor, {
  type EditorMode,
} from "./LexicalMarkdownEditor";

// Controlled wrapper mirroring how a host app drives the editor: it owns the
// markdown state and feeds edits back in, so the controlled <-> onChange loop is
// exercised the same way it would be in production.
function Harness({
  initial = "",
  mode,
  debounce = 0,
  onChange,
}: {
  initial?: string;
  mode?: EditorMode;
  debounce?: number;
  onChange?: (markdown: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <LexicalMarkdownEditor
      value={value}
      mode={mode}
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

  it("toggles the markup-mode attribute on the editable root", async () => {
    const screen = await render(<Harness initial="text" mode="rich" />);
    const textbox = page.getByRole("textbox");

    await expect
      .element(textbox)
      .not.toHaveAttribute("data-markdown-markup-mode");

    await screen.rerender(<Harness initial="text" mode="markup" />);

    await expect.element(textbox).toHaveAttribute("data-markdown-markup-mode");
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
