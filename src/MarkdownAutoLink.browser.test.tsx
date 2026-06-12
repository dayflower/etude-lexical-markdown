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

function autoLinkEl(): HTMLElement | null {
  return page
    .getByRole("textbox")
    .element()
    .querySelector(AUTO_LINK_SELECTOR) as HTMLElement | null;
}

describe("MarkdownAutoLink (browser)", () => {
  it("decorates a bare URL as it is typed, no separator needed", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("https://example.com");

    await vi.waitFor(() => {
      const el = autoLinkEl();
      expect(el).not.toBeNull();
      expect(el?.textContent).toBe("https://example.com");
    });
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

  it("keeps the decoration when Enter ends the URL's line", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("https://example.com/");
    await vi.waitFor(() => expect(autoLinkEl()).not.toBeNull());

    await userEvent.keyboard("{Enter}second line");

    await vi.waitFor(() => {
      expect(autoLinkEl()?.textContent).toBe("https://example.com/");
      expect(page.getByRole("textbox").element().textContent).toContain(
        "second line",
      );
    });
  });

  it("decorates a URL after a space is inserted before it", async () => {
    await render(<Harness />);

    await userEvent.click(page.getByRole("textbox"));
    await userEvent.keyboard("https://example.com/");
    await vi.waitFor(() => expect(autoLinkEl()).not.toBeNull());

    // Go to the line start and insert a leading space; the URL stays decorated.
    await userEvent.keyboard("{Home} ");

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
});
