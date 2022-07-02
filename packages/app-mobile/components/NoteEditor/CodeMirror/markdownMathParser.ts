/**
 * Search for $s and $$s in markdown and mark the regions between them as math.
 *
 * Text between single $s is marked as InlineMath and text between $$s is marked
 * as BlockMath.
 */

import { tags, Tag } from '@lezer/highlight';
import { parseMixed, SyntaxNodeRef, Input, NestedParse } from '@lezer/common';

// Extend the existing markdown parser
import {
	MarkdownConfig, InlineContext,
	BlockContext, Line, LeafBlock,
} from '@lezer/markdown';

// The existing stexMath parser is used to parse the text between the $s
import { stexMath } from '@codemirror/legacy-modes/mode/stex';
import { StreamLanguage } from '@codemirror/language';

const DOLLAR_SIGN_CHAR_CODE = 36;
const BACKSLASH_CHAR_CODE = 92;

// (?:[>]\s*)?: Optionally allow block math lines to start with '> '
const MATH_BLOCK_START_REGEX = /^(?:\s*[>]\s*)?\$\$/;
const MATH_BLOCK_STOP_REGEX = /\$\$\s*$/;

const TEX_LANGUAGE = StreamLanguage.define(stexMath);
const BLOCK_MATH_TAG = 'BlockMath';
const BLOCK_MATH_CONTENT_TAG = 'BlockMathContent';
const INLINE_MATH_TAG = 'InlineMath';
const INLINE_MATH_CONTENT_TAG = 'InlineMathContent';

export const mathTag = Tag.define(tags.monospace);
export const inlineMathTag = Tag.define(mathTag);

// Wraps a TeX math-mode parser. This removes [nodeTag] from the syntax tree
// and replaces it with a region handled by the sTeXMath parser.
const wrappedTeXParser = (nodeTag: string) => parseMixed(
	(node: SyntaxNodeRef, _input: Input): NestedParse => {
		if (node.name != nodeTag) {
			return null;
		}

		return {
			parser: TEX_LANGUAGE.parser,
		};
	});

// Markdown extension for recognizing inline code
const InlineMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: INLINE_MATH_TAG,
			style: inlineMathTag,
		},
		{
			name: INLINE_MATH_CONTENT_TAG,
		},
	],
	parseInline: [{
		name: INLINE_MATH_TAG,
		after: 'InlineCode',

		parse(cx: InlineContext, current: number, pos: number): number {
			const prevCharCode = pos - 1 >= 0 ? cx.char(pos - 1) : -1;
			const nextCharCode = cx.char(pos + 1);
			if (current != DOLLAR_SIGN_CHAR_CODE
					|| prevCharCode == DOLLAR_SIGN_CHAR_CODE
					|| nextCharCode == DOLLAR_SIGN_CHAR_CODE) {
				return -1;
			}

			// Don't match if there's a space directly after the '$'
			if (/\s/.exec(String.fromCharCode(nextCharCode))) {
				return -1;
			}

			let escaped = false;
			const start = pos;
			const end = cx.end;

			pos ++;

			// Scan ahead for the next '$' symbol
			for (; pos < end && (escaped || cx.char(pos) != DOLLAR_SIGN_CHAR_CODE); pos++) {
				if (!escaped && cx.char(pos) == BACKSLASH_CHAR_CODE) {
					escaped = true;
				} else {
					escaped = false;
				}
			}

			// Don't match if the ending '$' is preceded by a space.
			const prevChar = String.fromCharCode(cx.char(pos - 1));
			if (/\s/.exec(prevChar)) {
				return -1;
			}

			// It isn't a math region if there is no ending '$'
			if (pos == end) {
				return -1;
			}

			// Advance to just after the ending '$'
			pos ++;

			// Add a wraping INLINE_MATH_TAG node that contains an INLINE_MATH_CONTENT_TAG.
			// The INLINE_MATH_CONTENT_TAG node can thus be safely removed and the region
			// will still be marked as a math region.
			const contentElem = cx.elt(INLINE_MATH_CONTENT_TAG, start + 1, pos - 1);
			cx.addElement(cx.elt(INLINE_MATH_TAG, start, pos, [contentElem]));

			return pos + 1;
		},
	}],
	wrap: wrappedTeXParser(INLINE_MATH_CONTENT_TAG),
};

// Extension for recognising block code
const BlockMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: BLOCK_MATH_TAG,
			style: mathTag,
		},
		{
			name: BLOCK_MATH_CONTENT_TAG,
		},
	],
	parseBlock: [{
		name: BLOCK_MATH_TAG,
		before: 'Blockquote',
		parse(cx: BlockContext, line: Line): boolean {
			const lineLength = line.text.length;
			const delimLen = 2;

			// $$ delimiter? Start math!
			const mathStartMatch = MATH_BLOCK_START_REGEX.exec(line.text);
			if (mathStartMatch) {
				const start = cx.lineStart + mathStartMatch[0].length;
				let stop;

				let endMatch = MATH_BLOCK_STOP_REGEX.exec(
					line.text.substring(mathStartMatch[0].length)
				);

				// If the math region ends immediately (on the same line),
				if (endMatch) {
					stop = cx.lineStart + lineLength - endMatch[0].length;
				} else {
					let hadNextLine = false;

					// Otherwise, it's a multi-line block display.
					// Consume lines until we reach the end.
					do {
						hadNextLine = cx.nextLine();
						endMatch = hadNextLine ? MATH_BLOCK_STOP_REGEX.exec(line.text) : null;
					}
					while (hadNextLine && endMatch == null);

					if (hadNextLine && endMatch) {
						// Remove the ending delimiter
						stop = cx.lineStart + lineLength - endMatch[0].length;
					} else {
						stop = cx.lineStart;
					}
				}

				// Label the region. Add two labels so that one can be removed.
				const contentElem = cx.elt(BLOCK_MATH_CONTENT_TAG, start, stop);
				cx.addElement(
					cx.elt(BLOCK_MATH_TAG, start - delimLen, stop + delimLen, [contentElem])
				);

				// Don't re-process the ending delimiter (it may look the same
				// as the starting delimiter).
				cx.nextLine();

				return true;
			}

			return false;
		},
		// End paragraph-like blocks
		endLeaf(_cx: BlockContext, line: Line, _leaf: LeafBlock): boolean {
			// Leaf blocks (e.g. block quotes) end early if math starts.
			return MATH_BLOCK_START_REGEX.exec(line.text) != null;
		},
	}],
	wrap: wrappedTeXParser(BLOCK_MATH_CONTENT_TAG),
};

// Markdown configuration for block and inline math support.
const MarkdownMathExtension: MarkdownConfig[] = [
	InlineMathConfig,
	BlockMathConfig,
];

export { MarkdownMathExtension };
