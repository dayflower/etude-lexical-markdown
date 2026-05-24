import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import {
  ContentEditable,
  type ContentEditableProps,
} from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { type ReactNode, useMemo, useRef } from "react";
import { createInitialConfig } from "./config/editorConfig";
import { MARKDOWN_TRANSFORMERS } from "./config/transformers";
import ControlledValuePlugin from "./plugins/ControlledValuePlugin";
import InitialValuePlugin from "./plugins/InitialValuePlugin";
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
}

const SOURCE_MODE_CLASS = "markdown-source-mode";

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
}: LexicalMarkdownEditorProps) {
  const initialConfig = useMemo(
    () => createInitialConfig({ namespace }),
    [namespace],
  );

  const initialValueRef = useRef(value);
  const lastEmittedRef = useRef<string | null>(null);

  const rootClass = [
    "lexical-md",
    mode === "source" ? SOURCE_MODE_CLASS : null,
    rootClassName,
  ]
    .filter(Boolean)
    .join(" ");

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
    <LexicalComposer initialConfig={initialConfig}>
      <div className={rootClass}>
        <RichTextPlugin
          contentEditable={contentEditable}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <CheckListPlugin />
        <InitialValuePlugin
          value={initialValueRef.current}
          transformers={MARKDOWN_TRANSFORMERS}
        />
        <ControlledValuePlugin
          value={value}
          transformers={MARKDOWN_TRANSFORMERS}
          lastEmittedRef={lastEmittedRef}
        />
        <OnChangePlugin
          onChange={onChange}
          transformers={MARKDOWN_TRANSFORMERS}
          lastEmittedRef={lastEmittedRef}
          debounceMs={onChangeDebounceMs}
        />
      </div>
    </LexicalComposer>
  );
}
