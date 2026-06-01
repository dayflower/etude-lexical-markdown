import { createHeadlessEditor } from "@lexical/headless";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  type Transformer,
} from "@lexical/markdown";
import type { LexicalEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { DEFAULT_MARKDOWN_FEATURES } from "./config/features";
import { createMarkdownNodes } from "./config/nodes";
import { createMarkdownTransformers } from "./transformers";

// Enable every feature so a single editor instance covers all transformers.
const FEATURES = { ...DEFAULT_MARKDOWN_FEATURES, horizontalRule: true };
const TRANSFORMERS: Array<Transformer> = createMarkdownTransformers(FEATURES);

function createEditor(): LexicalEditor {
  return createHeadlessEditor({
    namespace: "round-trip-test",
    nodes: [...createMarkdownNodes(FEATURES)],
    onError: (error) => {
      throw error;
    },
  });
}

/**
 * Parses `markdown` into a Lexical tree and serializes it straight back,
 * returning the result. A faithful set of transformers yields the input
 * unchanged.
 */
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

describe("markdown round-trip", () => {
  const cases: Array<[name: string, markdown: string]> = [
    ["plain paragraph", "Hello world"],
    [
      "multiple paragraphs",
      "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
    ],
    ["heading h1", "# Heading 1"],
    ["heading h3", "### Heading 3"],
    ["bold (star)", "This is **bold** text"],
    ["italic (star)", "This is *italic* text"],
    ["bold italic", "This is ***bold italic*** text"],
    ["strikethrough", "This is ~~struck~~ text"],
    ["inline code", "This is `code` text"],
    ["unordered list", "- one\n- two\n- three"],
    ["ordered list", "1. one\n2. two\n3. three"],
    ["task list (unchecked)", "- [ ] todo item"],
    ["task list (checked)", "- [x] done item"],
    ["blockquote", "> quoted line"],
    ["link", "See [the label](https://example.com) here"],
    ["code block", "```js\nconsole.log(1);\n```"],
    ["code block without language", "```\nplain text\n```"],
    ["code block multiline", "```ts\nconst a = 1;\nconst b = 2;\n```"],
    ["horizontal rule", "above\n\n---\n\nbelow"],
    [
      "mixed document",
      [
        "# Title",
        "",
        "A paragraph with **bold**, *italic* and `code`.",
        "",
        "- first item",
        "- second item",
        "",
        "> a quote",
        "",
        "```js",
        "const x = 1;",
        "```",
      ].join("\n"),
    ],
  ];

  for (const [name, markdown] of cases) {
    it(`preserves ${name}`, () => {
      expect(roundTrip(markdown)).toBe(markdown);
    });
  }
});

// Inputs that intentionally do not round-trip identically. @lexical/markdown
// models a plain bullet list and a GFM task list as distinct ListNode types, so
// adjacent plain and task items split into two lists and serialize with a blank
// line between them. These assertions lock in that documented behavior.
describe("markdown known divergences", () => {
  it("splits adjacent plain and task list items into separate lists", () => {
    expect(roundTrip("- plain item\n- [ ] task item")).toBe(
      "- plain item\n\n- [ ] task item",
    );
  });
});
