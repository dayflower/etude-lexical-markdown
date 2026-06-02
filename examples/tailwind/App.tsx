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
import type {
  EditorMode,
  MarkdownClassNames,
  MarkdownFeatureFlags,
} from "../../src";
import { LexicalMarkdownEditor } from "../../src";

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

const FEATURE_KEYS: ReadonlyArray<keyof MarkdownFeatureFlags> = [
  // Block
  "heading",
  "blockquote",
  "list",
  "taskList",
  "codeBlock",
  "horizontalRule",
  // Inline
  "bold",
  "italic",
  "strikethrough",
  "inlineCode",
  "link",
];

// Shared task-list checkbox utilities, kept as consts so the checked/unchecked
// variants stay readable. The `[&.md-nested]:*` variants suppress the checkbox
// on a wrapper <li> that only hosts a nested list (the check list still tags
// it checked/unchecked), so the nested children render a single checkbox each.
const TASK_BASE =
  "relative list-none pl-[1.5em] -ml-[1.5em] outline-none " +
  "[&.md-nested]:pl-0 [&.md-nested]:ml-0 [&.md-nested]:no-underline [&.md-nested]:text-inherit";
const TASK_BOX =
  "before:content-[''] before:absolute before:left-0 before:top-[0.25em] before:size-[1em] " +
  "before:rounded-sm before:border before:border-slate-400 before:bg-white before:cursor-pointer " +
  "[&.md-nested]:before:content-none";
const TASK_CHECK =
  "after:content-[''] after:absolute after:left-[0.32em] after:top-[0.32em] after:w-[0.36em] after:h-[0.62em] " +
  "after:rotate-45 after:cursor-pointer after:border-solid after:border-slate-800 after:border-0 after:border-r-[0.16em] after:border-b-[0.16em] " +
  "[&.md-nested]:after:content-none";

// Everything the theme can reach is styled here as Tailwind utilities — no
// stylesheet needed for typography, inline formats, lists, or even the
// task-list checkbox. The custom Markdown nodes (link, code block, code fence)
// are opted into styling through the `classNames` slots below, which inject the
// consumer-owned `md-*` hooks that editor.css targets; their pseudo-element and
// state-dependent rules (the link icon, the code-block backdrop) read more
// clearly as CSS than as stacked arbitrary variants. The tagless `<hr>` and the
// markup-mode markers also remain in editor.css. State is keyed off the
// library's `data-*` attributes (`data-focused`, `data-markdown-markup-mode`).
const CLASS_NAMES: MarkdownClassNames = {
  paragraph: "my-1",
  quote: "border-l-[3px] border-slate-300 pl-3 my-2 text-slate-600",
  heading: {
    h1: "text-3xl font-bold my-3",
    h2: "text-2xl font-bold my-3",
    h3: "text-xl font-semibold my-2",
    h4: "text-lg font-semibold my-2",
    h5: "font-semibold my-2",
    h6: "font-semibold my-2",
  },
  text: {
    bold: "font-bold",
    italic: "italic",
    strikethrough: "line-through md-strike",
    code: "bg-slate-100 rounded-sm px-1 py-[0.05em] font-mono text-[0.95em]",
  },
  list: {
    ul: "list-disc pl-6 my-1",
    ol: "list-decimal pl-6 my-1",
    listitem: "my-0.5",
    listitemUnchecked: `${TASK_BASE} ${TASK_BOX}`,
    listitemChecked: `${TASK_BASE} line-through text-slate-500 ${TASK_BOX} ${TASK_CHECK}`,
    nested: { listitem: "list-none md-nested" },
  },
  link: "md-link",
  linkUrl: "md-link-url",
  linkLabel: "md-link-label",
  codeBlock: "md-code-block",
  codeFence: "md-code-fence",
};

const DEFAULT_FEATURES: MarkdownFeatureFlags = {
  // Block
  heading: true,
  blockquote: true,
  list: true,
  taskList: true,
  codeBlock: true,
  horizontalRule: true,
  // Inline
  bold: true,
  italic: true,
  strikethrough: true,
  inlineCode: true,
  link: true,
};

function App() {
  const [markdown, setMarkdown] = useState(INITIAL_MARKDOWN);
  const [mode, setMode] = useState<EditorMode>("rich");
  const [features, setFeatures] =
    useState<MarkdownFeatureFlags>(DEFAULT_FEATURES);
  const [blockquoteExitOnEmptyEnter, setBlockquoteExitOnEmptyEnter] =
    useState(true);

  const toggleFeature = (key: keyof MarkdownFeatureFlags) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <main className="max-w-5xl mx-auto mt-10 p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">etude-lexical-markdown</h1>
        <p className="text-sm text-gray-500">Tailwind CSS styling variant</p>
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
              classNames={CLASS_NAMES}
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
