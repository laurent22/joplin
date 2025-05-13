// Search for $s and $$s in markdown and mark the regions between them as math.
//
// Text between single $s is marked as InlineMath and text between $$s is marked
// as BlockMath.

import { tags, Tag } from '@lezer/highlight';
import { parseMixed, SyntaxNodeRef, Input, NestedParse, ParseWrapper } from '@lezer/common';

// Extend the existing markdown parser
import {
	MarkdownConfig, InlineContext,
	BlockContext, Line, LeafBlock,
} from '@lezer/markdown';

// The existing stexMath parser is used to parse the text between the $s
import { stexMath } from '@codemirror/legacy-modes/mode/stex';
import { StreamLanguage } from '@codemirror/language';

const dollarSignCharcode = 36;
const backslashCharcode = 92;

// (?:[>]\s*)?: Optionally allow block math lines to start with '> '
const mathBlockStartRegex = /^(?:\s*[>]\s*)?\$\$/;
const mathBlockEndRegex = /\$\$\s*$/;

const texLanguage = StreamLanguage.define(stexMath);
export const blockMathTagName = 'BlockMath';
export const blockMathContentTagName = 'BlockMathContent';
export const inlineMathTagName = 'InlineMath';
export const inlineMathContentTagName = 'InlineMathContent';

export const mathTag = Tag.define(tags.monospace);
export const inlineMathTag = Tag.define(mathTag);

// Wraps a TeX math-mode parser. This removes [nodeTag] from the syntax tree
// and replaces it with a region handled by the sTeXMath parser.
//
// @param nodeTag Name of the nodes to replace with regions parsed by the sTeX parser.
// @returns a wrapped sTeX parser.
const wrappedTeXParser = (nodeTag: string): ParseWrapper => {
	return parseMixed((node: SyntaxNodeRef, _input: Input): NestedParse => {
		if (node.name !== nodeTag) {
			return null;
		}

		return {
			parser: texLanguage.parser,
		};
	});
};

// Markdown extension for recognizing inline code
const InlineMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: inlineMathTagName,
			style: inlineMathTag,
		},
		{
			name: inlineMathContentTagName,
		},
	],
	parseInline: [{
		name: inlineMathTagName,
		after: 'InlineCode',

		parse(cx: InlineContext, current: number, pos: number): number {
			const prevCharCode = pos - 1 >= 0 ? cx.char(pos - 1) : -1;
			const nextCharCode = cx.char(pos + 1);
			if (current !== dollarSignCharcode
					|| prevCharCode === dollarSignCharcode
					|| nextCharCode === dollarSignCharcode) {
				return -1;
			}

			// Don't match if there's a space directly after the '$'
			if (/\s/.exec(String.fromCharCode(nextCharCode))) {
				return -1;
			}

			const start = pos;
			const end = cx.end;
			let escaped = false;

			pos ++;

			// Scan ahead for the next '$' symbol
			for (; pos < end && (escaped || cx.char(pos) !== dollarSignCharcode); pos++) {
				if (!escaped && cx.char(pos) === backslashCharcode) {
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
			if (pos === end) {
				return -1;
			}

			// Advance to just after the ending '$'
			pos ++;

			// Add a wraping inlineMathTagName node that contains an inlineMathContentTagName.
			// The inlineMathContentTagName node can thus be safely removed and the region
			// will still be marked as a math region.
			const contentElem = cx.elt(inlineMathContentTagName, start + 1, pos - 1);
			cx.addElement(cx.elt(inlineMathTagName, start, pos, [contentElem]));

			return pos + 1;
		},
	}],
	wrap: wrappedTeXParser(inlineMathContentTagName),
};

// Extension for recognising block code
const BlockMathConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: blockMathTagName,
			style: mathTag,
		},
		{
			name: blockMathContentTagName,
		},
	],
	parseBlock: [{
		name: blockMathTagName,
		before: 'Blockquote',
		parse(cx: BlockContext, line: Line): boolean {
			const delimLen = 2;

			// $$ delimiter? Start math!
			const mathStartMatch = mathBlockStartRegex.exec(line.text);
			if (mathStartMatch) {
				const start = cx.lineStart + mathStartMatch[0].length;
				let stop;

				let endMatch = mathBlockEndRegex.exec(
					line.text.substring(mathStartMatch[0].length),
				);

				// If the math region ends immediately (on the same line),
				if (endMatch) {
					const lineLength = line.text.length;
					stop = cx.lineStart + lineLength - endMatch[0].length;
				} else {
					let hadNextLine = false;

					// Otherwise, it's a multi-line block display.
					// Consume lines until we reach the end.
					do {
						hadNextLine = cx.nextLine();
						endMatch = hadNextLine ? mathBlockEndRegex.exec(line.text) : null;
					}
					while (hadNextLine && endMatch === null);

					if (hadNextLine && endMatch) {
						const lineLength = line.text.length;

						// Remove the ending delimiter
						stop = cx.lineStart + lineLength - endMatch[0].length;
					} else {
						stop = cx.lineStart;
					}
				}
				const lineEnd = cx.lineStart + line.text.length;

				// Label the region. Add two labels so that one can be removed.
				const contentElem = cx.elt(blockMathContentTagName, start, stop);
				const containerElement = cx.elt(
					blockMathTagName,
					start - delimLen,

					// Math blocks don't need ending delimiters, so ensure we don't
					// include text that doesn't exist.
					Math.min(lineEnd, stop + delimLen),

					// The child of the container element should be the content element
					[contentElem],
				);
				cx.addElement(containerElement);

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
			return mathBlockStartRegex.exec(line.text) !== null;
		},
	}],
	wrap: wrappedTeXParser(blockMathContentTagName),
};

// Markdown configuration for block and inline math support.
const MarkdownMathExtension: MarkdownConfig[] = [
	InlineMathConfig,
	BlockMathConfig,
];

export default MarkdownMathExtension;
