import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { DATA_ATTR } from "./constants";
import LexicalMarkdownEditor from "./LexicalMarkdownEditor";

const LINK_SELECTOR = `[${DATA_ATTR.LINK}]`;

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

function linkEl(): HTMLElement | null {
  return page
    .getByRole("textbox")
    .element()
    .querySelector(LINK_SELECTOR) as HTMLElement | null;
}

describe("MarkdownLink (browser)", () => {
  it("opens the URL on cmd/ctrl+click", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    await render(<Harness initial="[example](https://example.com)" />);

    const el = await vi.waitFor(() => {
      const found = linkEl();
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

  it("opens the URL on cmd+shift+click", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    await render(<Harness initial="[example](https://example.com)" />);

    const el = await vi.waitFor(() => {
      const found = linkEl();
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });

    el.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        metaKey: true,
        shiftKey: true,
      }),
    );

    expect(openSpy).toHaveBeenCalledWith(
      "https://example.com",
      "_blank",
      "noopener,noreferrer",
    );
    openSpy.mockRestore();
  });

  it("suppresses the caret-moving mousedown default on a modifier click, so the link stays rendered", async () => {
    await render(<Harness initial="[example](https://example.com)" />);

    const el = await vi.waitFor(() => {
      const found = linkEl();
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });

    const mousedown = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
    });
    el.dispatchEvent(mousedown);

    // The default (caret placement into the link) is prevented, so it never
    // breaks to source.
    expect(mousedown.defaultPrevented).toBe(true);
    expect(el.hasAttribute(DATA_ATTR.FOCUSED)).toBe(false);

    // A plain mousedown is left alone for normal editing.
    const plainMouseDown = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(plainMouseDown);
    expect(plainMouseDown.defaultPrevented).toBe(false);
  });

  it("breaks to markdown source on a plain click, without opening", async () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
    await render(<Harness initial="[example](https://example.com)" />);

    const el = await vi.waitFor(() => {
      const found = linkEl();
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    // Rendered (unfocused) link has no focus marker yet.
    expect(el.hasAttribute(DATA_ATTR.FOCUSED)).toBe(false);

    await userEvent.click(el);

    // The caret lands inside the link, which marks it focused (source shown).
    await vi.waitFor(() =>
      expect(linkEl()?.hasAttribute(DATA_ATTR.FOCUSED)).toBe(true),
    );
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it("exposes the URL as a tooltip while rendered, and strips it once focused", async () => {
    await render(<Harness initial="[example](https://example.com)" />);

    const el = await vi.waitFor(() => {
      const found = linkEl();
      expect(found).not.toBeNull();
      return found as HTMLElement;
    });
    // Unfocused: the destination is offered as a native tooltip.
    expect(el.getAttribute("title")).toBe("https://example.com");

    await userEvent.click(el);

    // Focused: the literal source is visible, so the tooltip is removed.
    await vi.waitFor(() => {
      const found = linkEl() as HTMLElement;
      expect(found.hasAttribute(DATA_ATTR.FOCUSED)).toBe(true);
      expect(found.hasAttribute("title")).toBe(false);
    });
  });

  describe('linkClickBehavior="open"', () => {
    // A genuine click: mousedown then click at (about) the same point.
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
      return { x, y };
    }

    async function renderOpen() {
      await render(
        <Harness
          initial="[example](https://example.com)"
          linkClickBehavior="open"
        />,
      );
      return vi.waitFor(() => {
        const found = linkEl();
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
    }

    it("opens the URL on a plain click without breaking it to source", async () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const el = await renderOpen();

      // The caret-moving mousedown default is suppressed, so the link never
      // becomes focused — opening behaves like edit mode's cmd/ctrl+click.
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const mousedown = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
      });
      el.dispatchEvent(mousedown);
      expect(mousedown.defaultPrevented).toBe(true);
      el.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          detail: 1,
          clientX: x,
          clientY: y,
        }),
      );

      expect(openSpy).toHaveBeenCalledWith(
        "https://example.com",
        "_blank",
        "noopener,noreferrer",
      );
      // It stays rendered (unfocused), never dropping into the edit/source view.
      expect(el.hasAttribute(DATA_ATTR.FOCUSED)).toBe(false);
      await vi.waitFor(() =>
        expect(linkEl()?.hasAttribute(DATA_ATTR.FOCUSED)).toBe(false),
      );
      openSpy.mockRestore();
    });

    it("edits on cmd/ctrl+click instead of opening", async () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const el = await renderOpen();

      clickAt(el, { ctrlKey: true });

      await vi.waitFor(() =>
        expect(linkEl()?.hasAttribute(DATA_ATTR.FOCUSED)).toBe(true),
      );
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

    it("does not open when text is selected across the link", async () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      const el = await renderOpen();

      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection?.removeAllRanges();
      selection?.addRange(range);

      clickAt(el);

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

    it("arms the pointer cursor by default (data-mod-pressed set without a modifier)", async () => {
      await render(
        <Harness
          initial="[example](https://example.com)"
          linkClickBehavior="open"
        />,
      );
      const root = page.getByRole("textbox").element() as HTMLElement;

      // Open mode hints a pointer by default; the modifier (edit) clears it.
      await vi.waitFor(() =>
        expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(true),
      );
      window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true }));
      expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(false);
      window.dispatchEvent(new KeyboardEvent("keyup", { metaKey: false }));
      expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(true);
    });
  });

  it("marks the root with data-mod-pressed while a modifier is held", async () => {
    await render(<Harness initial="[example](https://example.com)" />);
    const root = page.getByRole("textbox").element() as HTMLElement;

    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(false);

    window.dispatchEvent(new KeyboardEvent("keydown", { metaKey: true }));
    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keyup", { metaKey: false }));
    expect(root.hasAttribute(DATA_ATTR.MOD_PRESSED)).toBe(false);
  });
});
