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

  it("reflects programmatic value changes, including clearing to empty", async () => {
    // A host that owns `value` and can also set it externally (history restore,
    // external load). The "load"/"clear" buttons mutate `value` without any
    // user edit, exercising the controlled import path.
    function ProgrammaticHarness() {
      const [value, setValue] = useState("");
      return (
        <>
          <button type="button" onClick={() => setValue("Some text")}>
            load
          </button>
          <button type="button" onClick={() => setValue("")}>
            clear
          </button>
          <LexicalMarkdownEditor
            value={value}
            onChangeDebounceMs={0}
            onChange={setValue}
          />
        </>
      );
    }

    await render(<ProgrammaticHarness />);

    // A real edit that nets back to empty drives lastEmittedRef to "" via
    // OnChangePlugin — the state that previously made the guard misfire.
    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("x{Backspace}");
    await vi.waitFor(() =>
      expect(page.getByRole("textbox").element().textContent).toBe(""),
    );

    // Programmatic load: arrives via controlled import, OnChangePlugin skips it.
    await userEvent.click(page.getByRole("button", { name: "load" }));
    await expect
      .element(page.getByRole("textbox"))
      .toHaveTextContent("Some text");

    // Programmatic clear back to "": must empty the editor even though the last
    // emitted markdown was also "".
    await userEvent.click(page.getByRole("button", { name: "clear" }));
    await vi.waitFor(() =>
      expect(page.getByRole("textbox").element().textContent).toBe(""),
    );
  });
});
