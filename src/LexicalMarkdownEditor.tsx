import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import {
  ContentEditable,
  type ContentEditableProps,
} from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { type ReactNode, useMemo, useRef } from "react";
import { createInitialConfig } from "./config/editorConfig";
import {
  type MarkdownFeatureFlags,
  resolveMarkdownFeatures,
} from "./config/features";
import { createMarkdownTransformers } from "./config/transformers";
import CodeHighlightingPlugin, {
  type LanguageAliases,
  type PrismLanguages,
} from "./plugins/CodeHighlightingPlugin";
import ControlledValuePlugin from "./plugins/ControlledValuePlugin";
import InitialValuePlugin from "./plugins/InitialValuePlugin";
import MarkdownCodeBlockPlugin from "./plugins/MarkdownCodeBlockPlugin";
import MarkdownLinkPlugin from "./plugins/MarkdownLinkPlugin";
import ModeClassPlugin from "./plugins/ModeClassPlugin";
import OnChangePlugin from "./plugins/OnChangePlugin";

export type EditorMode = "rich" | "source";

export interface LexicalMarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  mode?: EditorMode;
  namespace?: string;
  ariaPlaceholder?: string;
  placeholder?: ReactNode;
  className?: string;
  rootClassName?: string;
  contentEditableProps?: Partial<
    Omit<ContentEditableProps, "placeholder" | "aria-placeholder">
  >;
  /**
   * Debounce window in ms for onChange emission. Default 100.
   */
  onChangeDebounceMs?: number;
  /**
   * Prism grammars to use for code highlighting. When omitted, the plugin
   * falls back to whatever the host application has registered globally via
   * side-effect imports (e.g. `import "prismjs/components/prism-typescript"`).
   */
  prismLanguages?: PrismLanguages;
  /**
   * Custom aliases mapping fence language identifier to grammar key. Merged
   * with the plugin's built-in defaults (`js -> javascript`, etc.).
   */
  languageAliases?: LanguageAliases;
  /**
   * Toggle individual Markdown syntax features. Omitted keys fall back to
   * defaults (everything except `horizontalRule` is enabled).
   */
  features?: Partial<MarkdownFeatureFlags>;
}

export default function LexicalMarkdownEditor({
  value,
  onChange,
  mode = "rich",
  namespace = "LexicalMarkdownEditor",
  ariaPlaceholder,
  placeholder,
  className,
  rootClassName,
  contentEditableProps,
  onChangeDebounceMs,
  prismLanguages,
  languageAliases,
  features,
}: LexicalMarkdownEditorProps) {
  const resolvedFeatures = useMemo(
    () => resolveMarkdownFeatures(features),
    [features],
  );

  const initialConfig = useMemo(
    () => createInitialConfig({ namespace, features: resolvedFeatures }),
    [namespace, resolvedFeatures],
  );

  const transformers = useMemo(
    () => createMarkdownTransformers(resolvedFeatures),
    [resolvedFeatures],
  );

  // Force re-mount of the LexicalComposer when the set of enabled features
  // (and therefore the registered nodes/plugins) changes; Lexical does not
  // support adding/removing nodes after initialization.
  const composerKey = useMemo(
    () => `${namespace}|${JSON.stringify(resolvedFeatures)}`,
    [namespace, resolvedFeatures],
  );

  const initialValueRef = useRef(value);
  const lastEmittedRef = useRef<string | null>(null);

  const rootClass = ["lexical-md", rootClassName].filter(Boolean).join(" ");

  const contentEditable =
    placeholder !== undefined ? (
      <ContentEditable
        {...contentEditableProps}
        className={className}
        aria-placeholder={ariaPlaceholder ?? ""}
        placeholder={<span>{placeholder}</span>}
      />
    ) : (
      <ContentEditable {...contentEditableProps} className={className} />
    );

  return (
    <LexicalComposer key={composerKey} initialConfig={initialConfig}>
      <div className={rootClass}>
        <RichTextPlugin
          contentEditable={contentEditable}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        {resolvedFeatures.list && <ListPlugin />}
        {resolvedFeatures.list && resolvedFeatures.taskList && (
          <CheckListPlugin />
        )}
        {resolvedFeatures.link && <MarkdownLinkPlugin />}
        {resolvedFeatures.codeBlock && <MarkdownCodeBlockPlugin />}
        {resolvedFeatures.codeBlock && (
          <CodeHighlightingPlugin
            languages={prismLanguages}
            languageAliases={languageAliases}
          />
        )}
        {resolvedFeatures.horizontalRule && <HorizontalRulePlugin />}
        <InitialValuePlugin
          value={initialValueRef.current}
          transformers={transformers}
        />
        <ControlledValuePlugin
          value={value}
          transformers={transformers}
          lastEmittedRef={lastEmittedRef}
        />
        <OnChangePlugin
          onChange={onChange}
          transformers={transformers}
          lastEmittedRef={lastEmittedRef}
          debounceMs={onChangeDebounceMs}
        />
        <ModeClassPlugin mode={mode} />
      </div>
    </LexicalComposer>
  );
}
