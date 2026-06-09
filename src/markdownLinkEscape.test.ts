import { describe, expect, it } from "vitest";
import {
  escapeLinkLabel,
  escapeLinkUrl,
  unescapeMarkdown,
} from "./markdownLinkEscape";

describe("escapeLinkLabel", () => {
  it("escapes brackets and backslashes", () => {
    expect(escapeLinkLabel("[test]")).toBe("\\[test\\]");
    expect(escapeLinkLabel("a\\b")).toBe("a\\\\b");
  });

  it("leaves plain text untouched", () => {
    expect(escapeLinkLabel("the label")).toBe("the label");
  });

  it("leaves parentheses untouched (label only cares about brackets)", () => {
    expect(escapeLinkLabel("foo (bar)")).toBe("foo (bar)");
  });
});

describe("escapeLinkUrl", () => {
  it("escapes parentheses and backslashes", () => {
    expect(escapeLinkUrl("https://example.com/foo_(bar)")).toBe(
      "https://example.com/foo_\\(bar\\)",
    );
    expect(escapeLinkUrl("a\\b")).toBe("a\\\\b");
  });

  it("leaves brackets untouched (url only cares about parentheses)", () => {
    expect(escapeLinkUrl("https://example.com/[x]")).toBe(
      "https://example.com/[x]",
    );
  });
});

describe("unescapeMarkdown", () => {
  it("reverses escapeLinkLabel", () => {
    expect(unescapeMarkdown(escapeLinkLabel("[test]"))).toBe("[test]");
  });

  it("reverses escapeLinkUrl", () => {
    const url = "https://example.com/foo_(bar)";
    expect(unescapeMarkdown(escapeLinkUrl(url))).toBe(url);
  });

  it("decodes any backslash escape to its literal character", () => {
    expect(unescapeMarkdown("a\\\\b")).toBe("a\\b");
    expect(unescapeMarkdown("plain")).toBe("plain");
  });
});
