import {
  $convertFromMarkdownString,
  type Transformer,
} from "@lexical/markdown";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";

interface Props {
  value: string;
  transformers: Array<Transformer>;
}

export default function InitialValuePlugin({
  value,
  transformers,
}: Props): null {
  const [editor] = useLexicalComposerContext();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    editor.update(
      () => {
        $convertFromMarkdownString(value, transformers);
      },
      { tag: "lexical-markdown:initial" },
    );
  }, [editor, value, transformers]);

  return null;
}
