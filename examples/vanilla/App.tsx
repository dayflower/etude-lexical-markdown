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
import type { MarkdownClassNames, MarkdownFeatureFlags } from "../../src";
import { LexicalMarkdownEditor } from "../../src";

// Markup mode is a pure CSS concern: the host toggles this attribute on a
// wrapper element and editor.css reveals the syntax markers. The library knows
// nothing about it.
type EditorMode = "rich" | "markup";
const MARKUP_MODE_ATTR = "data-markdown-markup-mode";

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

// Only the slots a semantic tag cannot identify need a class. Block elements
// (h1, blockquote, ul, …) and the inline formats that Lexical wraps in a tag
// (bold → <strong>, italic → <em>, inline code → <code>) are styled by tag in
// editor.css. Strikethrough is the one inline format without a tag, and the
// task-list states need a class to render a checkbox.
const CLASS_NAMES: MarkdownClassNames = {
  text: {
    strikethrough: "md-strike",
  },
  list: {
    listitemChecked: "md-task md-task--checked",
    listitemUnchecked: "md-task md-task--unchecked",
    nested: { listitem: "md-nested" },
  },
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
    <main className="example-main">
      <header className="example-header">
        <h1>Examples of the Lexical Markdown Editor Component</h1>
        <p className="example-subtitle">Vanilla CSS styling variant</p>
      </header>

      <div className="example-toolbar">
        <div className="example-toolbar-group">
          <span className="example-toolbar-label">Mode:</span>
          <label className="example-control">
            <input
              type="radio"
              name="mode"
              value="rich"
              checked={mode === "rich"}
              onChange={() => setMode("rich")}
            />
            rich
          </label>
          <label className="example-control">
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

      <details className="example-features">
        <summary>
          Features ({FEATURE_KEYS.filter((k) => features[k]).length}/
          {FEATURE_KEYS.length} enabled)
        </summary>
        <div className="example-features-row">
          {FEATURE_KEYS.map((key) => (
            <label key={key} className="example-control">
              <input
                type="checkbox"
                checked={features[key]}
                onChange={() => toggleFeature(key)}
              />
              {key}
            </label>
          ))}
        </div>
        <div className="example-features-row">
          <label className="example-control">
            <input
              type="checkbox"
              checked={blockquoteExitOnEmptyEnter}
              onChange={() => setBlockquoteExitOnEmptyEnter((prev) => !prev)}
            />
            blockquoteExitOnEmptyEnter
          </label>
        </div>
      </details>

      <div className="example-columns">
        <div className="example-column">
          <p className="example-column-label">Rich editor</p>
          <div
            className="example-editor"
            {...(mode === "markup" ? { [MARKUP_MODE_ATTR]: "" } : {})}
          >
            <LexicalMarkdownEditor
              value={markdown}
              onChange={setMarkdown}
              features={features}
              blockquoteExitOnEmptyEnter={blockquoteExitOnEmptyEnter}
              prismLanguages={PRISM_LANGUAGES}
              classNames={CLASS_NAMES}
              className="example-editor__content lexical-md__content"
              placeholder={
                <span className="example-editor__placeholder">
                  Start typing markdown...
                </span>
              }
              ariaPlaceholder="Start typing markdown..."
            />
          </div>
        </div>

        <div className="example-column">
          <p className="example-column-label">Markdown source</p>
          <pre className="example-source">{markdown}</pre>
        </div>
      </div>
    </main>
  );
}

export default App;
