import type { EditorThemeClasses } from "lexical";
import { describe, expect, it } from "vitest";
import { createMarkdownTheme } from "./editorConfig";

describe("createMarkdownTheme", () => {
  it("does not pollute Object.prototype via __proto__ keys", () => {
    // A theme parsed from untrusted JSON could carry a __proto__ payload.
    const malicious = JSON.parse(
      '{"__proto__": {"polluted": "yes"}}',
    ) as EditorThemeClasses;

    createMarkdownTheme(undefined, malicious);

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("ignores forbidden keys but still merges normal nested slots", () => {
    const theme = JSON.parse(
      '{"constructor": {"hacked": true}, "heading": {"h1": "title"}, "text": {"bold": "strong"}}',
    ) as EditorThemeClasses;

    const result = createMarkdownTheme(undefined, theme) as Record<
      string,
      Record<string, unknown>
    >;

    expect(result.heading.h1).toBe("title");
    expect(result.text.bold).toBe("strong");
    expect(({} as Record<string, unknown>).hacked).toBeUndefined();
  });

  it("layers classNames then theme over the base codeHighlight tokens", () => {
    const result = createMarkdownTheme({ heading: { h1: "from-classnames" } }, {
      heading: { h1: "from-theme" },
    } as EditorThemeClasses) as Record<string, Record<string, unknown>>;

    expect(result.heading.h1).toBe("from-theme");
    expect(result.codeHighlight).toBeDefined();
  });
});
