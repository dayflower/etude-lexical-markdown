import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-python";
import "prismjs/components/prism-markup";
import { useState } from "react";
import type { EditorMode, MarkdownFeatureFlags } from "../src";
import { LexicalMarkdownEditor } from "../src";

const INITIAL_MARKDOWN = `# Heading 1

## Heading 2

A paragraph with **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

Visit [Lexical](https://lexical.dev) for more information.

Another paragraph to verify line breaks.

> A blockquote line.
> Continues on the next line.

---

- bullet item
- another bullet item
  - nested bullet item

1. ordered item
2. second ordered item

- [ ] todo item
- [x] done item

\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;

const PRISM_LANGUAGES = {
  javascript: Prism.languages.javascript,
  typescript: Prism.languages.typescript,
  jsx: Prism.languages.jsx,
  tsx: Prism.languages.tsx,
  css: Prism.languages.css,
  json: Prism.languages.json,
  bash: Prism.languages.bash,
  python: Prism.languages.python,
  markup: Prism.languages.markup,
};

type StyleVariant = "tailwind" | "vanilla";

const FEATURE_KEYS: ReadonlyArray<keyof MarkdownFeatureFlags> = [
  "heading",
  "list",
  "taskList",
  "link",
  "codeBlock",
  "inlineCode",
  "bold",
  "italic",
  "strikethrough",
  "blockquote",
  "horizontalRule",
];

const DEFAULT_FEATURES: MarkdownFeatureFlags = {
  heading: true,
  list: true,
  taskList: true,
  link: true,
  codeBlock: true,
  inlineCode: true,
  bold: true,
  italic: true,
  strikethrough: true,
  blockquote: true,
  horizontalRule: true,
};

function App() {
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [mode, setMode] = useState<EditorMode>("rich");
  const [styleVariant, setStyleVariant] = useState<StyleVariant>("tailwind");
  const [features, setFeatures] =
    useState<MarkdownFeatureFlags>(DEFAULT_FEATURES);
  const [blockquoteExitOnEmptyEnter, setBlockquoteExitOnEmptyEnter] =
    useState(true);

  const toggleFeature = (key: keyof MarkdownFeatureFlags) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main
      className={`max-w-5xl mx-auto mt-10 p-4 style-variant-${styleVariant}`}
    >
      <header className="mb-4">
        <h1 className="text-2xl font-bold">etude-lexical-markdown</h1>
        <p className="text-sm text-gray-500">
          Phase 4: features toggle / horizontal rule / markup markers / 2 style
          variants
        </p>
      </header>

      <div className="mb-3 flex flex-wrap gap-4 items-center text-sm">
        <div className="flex gap-3 items-center">
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
              value="markup"
              checked={mode === "markup"}
              onChange={() => setMode("markup")}
            />
            markup
          </label>
        </div>

        <div className="flex gap-3 items-center">
          <span className="text-gray-600">Style:</span>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="style"
              value="tailwind"
              checked={styleVariant === "tailwind"}
              onChange={() => setStyleVariant("tailwind")}
            />
            tailwind
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="style"
              value="vanilla"
              checked={styleVariant === "vanilla"}
              onChange={() => setStyleVariant("vanilla")}
            />
            vanilla
          </label>
        </div>
      </div>

      <details className="mb-3 text-sm">
        <summary className="cursor-pointer text-gray-700">
          Features ({FEATURE_KEYS.filter((k) => features[k]).length}/
          {FEATURE_KEYS.length} enabled)
        </summary>
        <div className="mt-2 flex flex-wrap gap-3">
          {FEATURE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={features[key]}
                onChange={() => toggleFeature(key)}
              />
              {key}
            </label>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={blockquoteExitOnEmptyEnter}
              onChange={() => setBlockquoteExitOnEmptyEnter((prev) => !prev)}
            />
            blockquoteExitOnEmptyEnter
          </label>
        </div>
      </details>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 mb-1">Rich editor</p>
          <div className="relative border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 ring-blue-400">
            <LexicalMarkdownEditor
              value={markdown}
              onChange={setMarkdown}
              mode={mode}
              features={features}
              blockquoteExitOnEmptyEnter={blockquoteExitOnEmptyEnter}
              prismLanguages={PRISM_LANGUAGES}
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
