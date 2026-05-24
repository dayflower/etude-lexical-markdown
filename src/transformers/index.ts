import {
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  CHECK_LIST,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  ORDERED_LIST,
  STRIKETHROUGH,
  type Transformer,
  UNORDERED_LIST,
} from "@lexical/markdown";
import { CODE_BLOCK_TRANSFORMER } from "./codeBlockTransformer";
import { LINK_TRANSFORMER } from "./linkTransformer";

export { CODE_BLOCK_TRANSFORMER } from "./codeBlockTransformer";
export { LINK_TRANSFORMER } from "./linkTransformer";

// Order matters: the multiline element transformer (code block) needs to be
// evaluated against block-level lines first; element transformers (heading,
// lists) match line-based regexps; text-format and text-match transformers
// (bold, italic, link) operate inside inline text.
export const MARKDOWN_TRANSFORMERS: Array<Transformer> = [
  CODE_BLOCK_TRANSFORMER,
  HEADING,
  CHECK_LIST,
  UNORDERED_LIST,
  ORDERED_LIST,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
  INLINE_CODE,
  LINK_TRANSFORMER,
];
