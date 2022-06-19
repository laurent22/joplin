// Extends the lezer markdown parser to identify math regions (display and inline)
// See also https://github.com/lezer-parser/markdown/blob/main/src/extension.ts
// for the built-in extensions.
import { tags } from '@lezer/highlight';
import {
	MarkdownConfig, InlineContext,
	BlockContext, Line,
} from '@lezer/markdown';

const DOLLAR_SIGN_CHAR_CODE = 36;

const InlineMathDelim = { resolve: 'InlineMath', mark: 'InlineMathDelim' };

const InlineMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: 'InlineMath',
			style: tags.comment,
		},
		{
			name: 'InlineMathDelim',
			style: tags.processingInstruction,
		},
	],
	parseInline: [{
		name: 'InlineMath',

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
			return cx.addDelimiter(InlineMathDelim, pos, pos + 1, isOpen, isClose);
		},
	}],
};

const BlockMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: 'BlockMath',
			style: tags.comment,
		},
	],
	parseBlock: [{
		name: 'BlockMath',
		parse(cx: BlockContext, line: Line): boolean {
			const delimLength = 2;
			const stopRegex = /^.*\$\$\s*$/;
			const startRegex = /^\$\$/;
			const start = cx.lineStart;

			// Stop if we reach a $$ delimiter.
			if (startRegex.exec(line.text)) {
				// If a single-line block-display,
				if (stopRegex.exec(line.text.substring(delimLength))) {
					const elem = cx.elt('BlockMath', cx.lineStart, cx.lineStart + line.text.length);
					cx.addElement(elem);
				} else {
					// Otherwise, it's a multi-line block display.
					while (cx.nextLine() && !stopRegex.exec(line.text));

					// Mark all lines, including the ending delimiter, as math.
					const elem = cx.elt('BlockMath', start, cx.lineStart + delimLength);
					cx.addElement(elem);
				}

				// Don't re-process the ending delimiter (it may look the same
				// as the starting delimiter).
				cx.nextLine();

				return true;
			}

			return false;
		},
	}],
};


export default [InlineMathConfig, BlockMathConfig];
