import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DATA_ATTR } from "./constants";
import LexicalMarkdownEditor from "./LexicalMarkdownEditor";

const AUTO_LINK_SELECTOR = `[${DATA_ATTR.AUTO_LINK}]`;

function Harness({
  initial = "",
  onChange,
  linkClickBehavior,
}: {
  initial?: string;
  onChange?: (markdown: string) => void;
  linkClickBehavior?: "edit" | "open";
}) {
  const [value, setValue] = useState(initial);
  return (
    <LexicalMarkdownEditor
      value={value}
      onChangeDebounceMs={0}
      linkClickBehavior={linkClickBehavior}
      onChange={(markdown) => {
        setValue(markdown);
        onChange?.(markdown);
      }}
    />
  );
}

function autoLinkEl(): HTMLElement | null {
  return page
    .getByRole("textbox")
    .element()
    .querySelector(AUTO_LINK_SELECTOR) as HTMLElement | null;
}

describe("MarkdownAutoLink (browser)", () => {
  it("does not decorate while typing, then decorates on a trailing space", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("https://example.com");
    // Still being typed: no separator yet, so it stays plain text.
    expect(autoLinkEl()).toBeNull();

    await userEvent.keyboard(" ");
    await vi.waitFor(() =>
      expect(autoLinkEl()?.textContent).toBe("https://example.com"),
    );
  });

  it("keeps following text out of the decoration after a separator", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("see https://example.com here");

    await vi.waitFor(() => {
      expect(autoLinkEl()?.textContent).toBe("https://example.com");
      expect(page.getByRole("textbox").element().textContent).toBe(
        "see https://example.com here",
      );
    });
  });

  it("decorates the URL when Enter ends its line", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("https://example.com/");
    // No separator yet, so the URL is still plain text.
    expect(autoLinkEl()).toBeNull();

    await userEvent.keyboard("{Enter}second line");

    await vi.waitFor(() => {
      expect(autoLinkEl()?.textContent).toBe("https://example.com/");
      expect(page.getByRole("textbox").element().textContent).toContain(
        "second line",
      );
    });
  });

  // Regression: Enter with no follow-up typing. WebKit defers the block split to
  // a later input event, so the Enter-time `markDirty` alone runs while the
  // caret is still on the URL and the transform defers; the decoration only
  // lands because useEnterDecoration re-marks the node on the next macrotask.
  it("decorates the URL when Enter ends its line with no follow-up typing", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("https://example.com/");
    expect(autoLinkEl()).toBeNull();

    await userEvent.keyboard("{Enter}");

    await vi.waitFor(() => {
      expect(autoLinkEl()?.textContent).toBe("https://example.com/");
    });
  });

  it("decorates a URL after a space is inserted before it", async () => {
    await render(<Harness />);

    const url = "https://example.com/";
    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard(url);
    // No separator yet, so the URL is still plain text.
    expect(autoLinkEl()).toBeNull();

    // Move to the line start and insert a leading space; that separator triggers
    // it. ArrowLeft is used over {Home} because {Home} is a no-op in WebKit.
    await userEvent.keyboard(`${"{ArrowLeft}".repeat(url.length)} `);

    await vi.waitFor(() => {
      expect(autoLinkEl()?.textContent).toBe("https://example.com/");
      expect(page.getByRole("textbox").element().textContent).toBe(
        " https://example.com/",
      );
    });
  });

  it("unwraps the decoration when the text stops being a URL", async () => {
    await render(<Harness initial="https://example.com" />);

    // The initial parse decorates the bare URL.
    await vi.waitFor(() => expect(autoLinkEl()).not.toBeNull());

    // Clear everything and type plain words: nothing left to decorate.
    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("{End}");
    await userEvent.keyboard("{Backspace}".repeat(25));
    await vi.waitFor(() => expect(autoLinkEl()).toBeNull());

    await userEvent.keyboard("just words");
    await vi.waitFor(() => {
      expect(autoLinkEl()).toBeNull();
      expect(page.getByRole("textbox").element().textContent).toBe(
        "just words",
      );
    });
  });

  it("decorates a loaded bare URL and grows its href as it is extended", async () => {
    await render(<Harness initial="https://example.co" />);

    // A loaded value has no caret on the URL, so it decorates immediately.
    await vi.waitFor(() => expect(autoLinkEl()).not.toBeNull());

    // Typing more of the address at its end extends the decoration in place.
    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("{End}m/path");
    await vi.waitFor(() =>
      expect(autoLinkEl()?.textContent).toBe("https://example.com/path"),
    );
  });

  it("opens the URL on cmd/ctrl+click", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    await render(<Harness initial="https://example.com" />);

    const el = await vi.waitFor(() => {
      const found = autoLinkEl();
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });

    el.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));

    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  describe('linkClickBehavior="open"', () => {
    function clickAt(el: HTMLElement, opts: MouseEventInit = {}) {
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      el.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          cancelable: true,
          clientX: x,
          clientY: y,
          ...opts,
        }),
      );
      el.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          detail: 1,
          clientX: x,
          clientY: y,
          ...opts,
        }),
      );
    }

    async function renderOpen() {
      await render(
        <Harness initial="https://example.com" linkClickBehavior="open" />,
      );
      return vi.waitFor(() => {
        const found = autoLinkEl();
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
    }

    it("opens the URL on a plain click", async () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const el = await renderOpen();

      clickAt(el);

      expect(openSpy).toHaveBeenCalledWith(
        "https://example.com",
        "_blank",
        "noopener,noreferrer",
      );
      openSpy.mockRestore();
    });

    it("does not open on cmd/ctrl+click (edits instead)", async () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const el = await renderOpen();

      clickAt(el, { ctrlKey: true });

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it("does not open when the pointer was dragged past the threshold", async () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const el = await renderOpen();

      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      el.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y }),
      );
      el.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          detail: 1,
          clientX: x + 40,
          clientY: y,
        }),
      );

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it("does not open on a double click", async () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const el = await renderOpen();

      clickAt(el, { detail: 2 });

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });

  it("marks the root with data-mod-pressed while a modifier is held", async () => {
    await render(<Harness initial="https://example.com" />);
    const root = page.getByRole("textbox").element() as HTMLElement;

    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true }));
    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keyup", { metaKey: false }));
    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(false);

    // A blur clears the attribute even when the releasing keyup is missed.
    window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true }));
    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(true);
    window.dispatchEvent(new Event("blur"));
    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(false);
  });
});
