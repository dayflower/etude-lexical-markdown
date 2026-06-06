import { createHeadlessEditor } from "@lexical/headless";
import { $generateHtmlFromNodes } from "@lexical/html";
import { $convertFromMarkdownString } from "@lexical/markdown";
import {
  type MarkdownFeatureFlags,
  resolveMarkdownFeatures,
} from "./config/features";
import { createMarkdownNodes } from "./config/nodes";
import { createMarkdownTransformers } from "./transformers";

export interface MarkdownToHtmlOptions {
  /**
   * Toggle individual Markdown syntax features, matching
   * `LexicalMarkdownEditor`'s `features` prop. Omitted keys fall back to
   * defaults (everything except `horizontalRule`).
   */
  features?: Partial<MarkdownFeatureFlags>;
  /**
   * Lexical editor namespace for the throwaway headless editor.
   */
  namespace?: string;
}

/**
 * Renders a Markdown string to semantic HTML without a live editor.
 *
 * It spins up a headless Lexical editor with the same node/transformer wiring
 * `LexicalMarkdownEditor` uses, parses the Markdown, and serializes it through
 * the standard `$generateHtmlFromNodes`. Links become `<a href>`, fenced code
 * becomes `<pre><code class="language-…">`, and so on.
 *
 * Requires a DOM: `$generateHtmlFromNodes` calls `document.createElement`. In
 * the browser this works out of the box; in Node, install a DOM shim such as
 * `jsdom`/`happy-dom` and expose `document` globally before calling.
 */
export function markdownToHtml(
  markdown: string,
  options?: MarkdownToHtmlOptions,
): string {
  const features = resolveMarkdownFeatures(options?.features);
  const editor = createHeadlessEditor({
    namespace: options?.namespace ?? "markdownToHtml",
    nodes: [...createMarkdownNodes(features)],
    onError: (error) => {
      throw error;
    },
  });
  const transformers = createMarkdownTransformers(features);

  editor.update(
    () => {
      $convertFromMarkdownString(markdown, transformers);
    },
    { discrete: true },
  );

  let html = "";
  editor.read(() => {
    html = $generateHtmlFromNodes(editor);
  });
  return html;
}
