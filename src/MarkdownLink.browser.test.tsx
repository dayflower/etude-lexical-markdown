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
}: {
  initial?: string;
  onChange?: (markdown: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <LexicalMarkdownEditor
      value={value}
      onChangeDebounceMs={0}
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
