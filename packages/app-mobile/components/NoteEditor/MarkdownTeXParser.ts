// Extends the lezer markdown parser to identify math regions (display and inline)
// See also https://github.com/lezer-parser/markdown/blob/main/src/extension.ts
// for the built-in extensions.
import { tags } from '@lezer/highlight';
import { parseMixed, SyntaxNodeRef, Input, NestedParse } from '@lezer/common';
import {
	MarkdownConfig, InlineContext,
	BlockContext, Line, LeafBlock,
} from '@lezer/markdown';
import { stexMath } from '@codemirror/legacy-modes/mode/stex';
import { StreamLanguage } from '@codemirror/language';

const DOLLAR_SIGN_CHAR_CODE = 36;
const MATH_BLOCK_START_REGEX = /^\$\$/;
const MATH_BLOCK_STOP_REGEX = /^.*\$\$\s*$/;

const TEX_LANGUAGE = StreamLanguage.define(stexMath);
const BLOCK_MATH_TAG = 'BlockMath';
const INLINE_MATH_TAG = 'InlineMath';

const InlineMathDelim = { resolve: INLINE_MATH_TAG, mark: 'InlineMathDelim' };

// Wraps a TeX math-mode parser
const wrappedTeXParser = (nodeTag: string) => parseMixed(
	(node: SyntaxNodeRef, _input: Input): NestedParse => {
		if (node.name != nodeTag) {
			return null;
		}

		return {
			parser: TEX_LANGUAGE.parser,
		};
	});

const InlineMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: INLINE_MATH_TAG,
			style: tags.comment,
		},
		{
			name: 'InlineMathDelim',
			style: tags.processingInstruction,
		},
	],
	parseInline: [{
		name: INLINE_MATH_TAG,
		after: 'InlineCode',

		parse(cx: InlineContext, next: number, pos: number): number {
			const prevCharCode = pos - 1 >= 0 ? cx.char(pos - 1) : -1;
			const nextCharCode = cx.char(pos + 1);
			if (next != DOLLAR_SIGN_CHAR_CODE
					|| prevCharCode == DOLLAR_SIGN_CHAR_CODE
					|| nextCharCode == DOLLAR_SIGN_CHAR_CODE) {
				return -1;
			}

			// $ delimiters are both opening and closing delimiters
			const isOpen = true;
			const isClose = true;
			cx.addDelimiter(InlineMathDelim, pos, pos + 1, isOpen, isClose);
			return pos + 1;
		},
	}],
	wrap: wrappedTeXParser(INLINE_MATH_TAG),
};

const BlockMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: BLOCK_MATH_TAG,
			style: tags.comment,
		},
	],
	parseBlock: [{
		name: BLOCK_MATH_TAG,
		before: 'FencedCode',
		parse(cx: BlockContext, line: Line): boolean {
			const delimLength = 2;
			const start = cx.lineStart;

			// $$ delimiter? Start math!
			if (MATH_BLOCK_START_REGEX.exec(line.text)) {
				// If the math region ends immediately (on the same line),
				if (MATH_BLOCK_STOP_REGEX.exec(line.text.substring(delimLength))) {
					const elem = cx.elt(
						BLOCK_MATH_TAG, cx.lineStart, cx.lineStart + line.text.length);
					cx.addElement(elem);
				} else {
					let hadNextLine = false;
					// Otherwise, it's a multi-line block display.
					// Consume lines until we reach the end.
					do {
						hadNextLine = cx.nextLine();
					}
					while (hadNextLine && !MATH_BLOCK_STOP_REGEX.exec(line.text));

					let stop;

					// Only include the ending delimiter if it exists
					if (hadNextLine) {
						stop = cx.lineStart + delimLength;
					} else {
						stop = cx.lineStart;
					}

					// Mark all lines in the block as math.
					const elem = cx.elt(BLOCK_MATH_TAG, start, stop);
					cx.addElement(elem);
				}

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
	wrap: wrappedTeXParser(BLOCK_MATH_TAG),
};


export default [InlineMathConfig, BlockMathConfig];
