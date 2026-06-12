import { createHeadlessEditor } from "@lexical/headless";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type Transformer,
} from "@lexical/markdown";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type LexicalEditor,
} from "lexical";
import { describe, expect, it } from "vitest";
import { DEFAULT_MARKDOWN_FEATURES } from "./config/features";
import { createMarkdownNodes } from "./config/nodes";
import { $createMarkdownAutoLinkNode } from "./nodes/MarkdownAutoLinkNode";
import { createMarkdownTransformers } from "./transformers";

const FEATURES = { ...DEFAULT_MARKDOWN_FEATURES, autoLink: true };
const TRANSFORMERS: Array<Transformer> = createMarkdownTransformers(FEATURES);

function createEditor(): LexicalEditor {
  return createHeadlessEditor({
    namespace: "auto-link-round-trip-test",
    nodes: [...createMarkdownNodes(FEATURES)],
    onError: (error) => {
      throw error;
    },
  });
}

function roundTrip(markdown: string): string {
  const editor = createEditor();
  let output = "";
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    },
    { discrete: true },
  );
  editor.read(() => {
    output = $convertToMarkdownString(TRANSFORMERS);
  });
  return output;
}

/**
 * Builds a paragraph that wraps `url` in a MarkdownAutoLinkNode (the shape the
 * plugin produces at runtime) and serializes it back to Markdown.
 */
function exportDecoratedUrl(url: string): string {
  const editor = createEditor();
  let output = "";
  editor.update(
    () => {
      const root = $getRoot();
      root.clear();
      const paragraph = $createParagraphNode();
      const autoLink = $createMarkdownAutoLinkNode();
      autoLink.append($createTextNode(url));
      paragraph.append(autoLink);
      root.append(paragraph);
    },
    { discrete: true },
  );
  editor.read(() => {
    output = $convertToMarkdownString(TRANSFORMERS);
  });
  return output;
}

describe("auto link round-trip", () => {
  it("re-emits a decorated URL as the raw URL", () => {
    expect(exportDecoratedUrl("https://example.com")).toBe(
      "https://example.com",
    );
  });

  it("keeps trailing punctuation inside the decorated URL", () => {
    expect(exportDecoratedUrl("https://example.com/path?q=1).")).toBe(
      "https://example.com/path?q=1).",
    );
  });

  it("leaves an explicit link untouched (no double decoration)", () => {
    expect(roundTrip("See [label](https://example.com) here")).toBe(
      "See [label](https://example.com) here",
    );
  });

  it("round-trips a bare URL as plain text without a plugin", () => {
    expect(roundTrip("Visit https://example.com today")).toBe(
      "Visit https://example.com today",
    );
  });
});
