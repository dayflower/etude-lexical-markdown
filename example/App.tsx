import { useState } from "react";
import type { EditorMode } from "../src";
import { LexicalMarkdownEditor } from "../src";

const INITIAL_MARKDOWN = `# Heading 1

## Heading 2

A paragraph with **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

Another paragraph to verify line breaks.

- bullet item
- another bullet item
  - nested bullet item

1. ordered item
2. second ordered item

- [ ] todo item
- [x] done item
`;

function App() {
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [mode, setMode] = useState<EditorMode>("rich");

  return (
    <main className="max-w-5xl mx-auto mt-10 p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">etude-lexical-markdown</h1>
        <p className="text-sm text-gray-500">
          Phase 2: + list / ordered list / GFM task list
        </p>
      </header>

      <div className="mb-3 flex gap-4 items-center text-sm">
        <span className="text-gray-600">Mode:</span>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="mode"
            value="rich"
            checked={mode === "rich"}
            onChange={() => setMode("rich")}
          />
          rich
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="mode"
            value="source"
            checked={mode === "source"}
            onChange={() => setMode("source")}
          />
          source
        </label>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-1">Rich editor</p>
          <div className="relative border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 ring-blue-400">
            <LexicalMarkdownEditor
              value={markdown}
              onChange={setMarkdown}
              mode={mode}
              className="min-h-60 p-4 outline-none lexical-md__content"
              placeholder={
                <span className="pointer-events-none absolute top-4 left-4 text-gray-400">
                  Start typing markdown...
                </span>
              }
              ariaPlaceholder="Start typing markdown..."
            />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-1">Markdown source</p>
          <pre className="border border-gray-300 rounded-lg p-4 min-h-60 bg-gray-50 font-mono text-sm whitespace-pre-wrap overflow-auto">
            {markdown}
          </pre>
        </div>
      </div>
    </main>
  );
}

export default App;
