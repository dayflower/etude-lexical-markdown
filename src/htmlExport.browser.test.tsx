import { createHeadlessEditor } from "@lexical/headless";
import { $generateHtmlFromNodes } from "@lexical/html";
import {
  $convertFromMarkdownString,
  type Transformer,
} from "@lexical/markdown";
import type { LexicalEditor } from "lexical";
import { describe, expect, it } from "vitest";
import { DEFAULT_MARKDOWN_FEATURES } from "./config/features";
import { createMarkdownNodes } from "./config/nodes";
import { markdownToHtml } from "./markdownToHtml";
import { createMarkdownTransformers } from "./transformers";

// Enable every feature so a single editor instance covers all custom nodes.
const FEATURES = { ...DEFAULT_MARKDOWN_FEATURES, horizontalRule: true };
const TRANSFORMERS: Array<Transformer> = createMarkdownTransformers(FEATURES);

function createEditor(): LexicalEditor {
  return createHeadlessEditor({
    namespace: "html-export-test",
    nodes: [...createMarkdownNodes(FEATURES)],
    onError: (error) => {
      throw error;
    },
  });
}

// Parses `markdown` into a Lexical tree and serializes it to HTML via the
// standard `$generateHtmlFromNodes`, exercising each custom node's exportDOM.
function toHtml(markdown: string): string {
  const editor = createEditor();
  editor.update(
    () => {
      $convertFromMarkdownString(markdown, TRANSFORMERS);
    },
    { discrete: true },
  );
  let html = "";
  editor.read(() => {
    html = $generateHtmlFromNodes(editor);
  });
  return html;
}

describe("$generateHtmlFromNodes (browser)", () => {
  it("exports a Markdown link as a semantic anchor", () => {
    const html = toHtml("[label](https://example.com)");
    expect(html).toContain('<a href="https://example.com">label</a>');
    // The literal Markdown syntax must not leak into the output.
    expect(html).not.toContain("](");
    expect(html).not.toContain("data-url");
  });

  it("exports a fenced code block as <pre><code> with a language class", () => {
    const html = toHtml("```ts\nconst x = 1;\n```");
    expect(html).toContain('<pre><code class="language-ts">const x = 1;');
    // Fences must not leak into the exported body.
    expect(html).not.toContain("```");
  });

  it("omits the language class for an unlabeled code block", () => {
    const html = toHtml("```\nplain\n```");
    expect(html).toContain("<pre><code>plain");
    expect(html).not.toContain("language-");
  });

  it("exports a horizontal rule as <hr>", () => {
    const html = toHtml("---");
    expect(html).toContain("<hr>");
  });
});

describe("markdownToHtml (browser)", () => {
  it("renders Markdown to semantic HTML without a live editor", () => {
    const html = markdownToHtml(
      "# Title\n\nSee [docs](https://example.com).\n\n```ts\nconst x = 1;\n```",
    );
    // Plain text nodes are wrapped by Lexical's default exportDOM, so match the
    // heading loosely; the custom-node output is exact.
    expect(html).toMatch(/<h1>.*Title.*<\/h1>/);
    expect(html).toContain('<a href="https://example.com">docs</a>');
    expect(html).toContain('<pre><code class="language-ts">const x = 1;');
  });

  it("honors the features option", () => {
    // With links disabled, the link syntax stays as plain text rather than <a>.
    const html = markdownToHtml("[label](https://example.com)", {
      features: { link: false },
    });
    expect(html).not.toContain("<a ");
    expect(html).toContain("[label](https://example.com)");
  });
});
