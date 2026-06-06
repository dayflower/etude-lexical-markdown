import { createHeadlessEditor } from "@lexical/headless";
import { describe, expect, it } from "vitest";
import { createMarkdownNodes } from "./config/nodes";
import { getEditorHtml } from "./getEditorHtml";
import { markdownToHtml } from "./markdownToHtml";

// This suite runs in the Node (unit) project, where `document` is undefined, so
// it exercises the DOM guard that both HTML helpers share.
describe("HTML export DOM guard (no DOM)", () => {
  it("markdownToHtml throws a helpful error without a DOM", () => {
    expect(() => markdownToHtml("# hi")).toThrowError(/requires a DOM/);
  });

  it("getEditorHtml throws a helpful error without a DOM", () => {
    const editor = createHeadlessEditor({
      namespace: "guard-test",
      nodes: [...createMarkdownNodes()],
      onError: (error) => {
        throw error;
      },
    });
    expect(() => getEditorHtml(editor)).toThrowError(/requires a DOM/);
  });
});
