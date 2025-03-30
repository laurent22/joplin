// Search for $s and $$s in markdown and mark the regions between them as math.
//
// Text between single $s is marked as InlineMath and text between $$s is marked
// as BlockMath.

import { tags, Tag } from '@lezer/highlight';

// Extend the existing markdown parser
import {
	MarkdownConfig, InlineContext,
} from '@lezer/markdown';

const equalsSignCharcode = 61;
const backslashCharcode = 92;

export const highlightTagName = 'Highlight';
export const highlightMarkerTagName = 'HighlightMarker';

export const highlightTag = Tag.define();
export const highlightMarkerTag = Tag.define(tags.meta);

// Markdown extension for recognizing highlighting
const HighlightConfig: MarkdownConfig = {
	defineNodes: [
		{
			name: highlightTagName,
			style: highlightTag,
		},
		{
			name: highlightMarkerTagName,
			style: highlightMarkerTag,
		},
	],
	parseInline: [{
		name: highlightTagName,
		after: 'InlineCode',

		parse(cx: InlineContext, current: number, pos: number): number {
			const nextCharCode = cx.char(pos + 1);
			if (current !== equalsSignCharcode
					|| nextCharCode !== equalsSignCharcode) {
				return -1;
			}

			const nextNextCharCode = cx.char(pos + 2);
			// Don't match if there's a space directly after the '='
			if (/\s/.exec(String.fromCharCode(nextNextCharCode))) {
				return -1;
			}

			const start = pos;
			const end = cx.end;
			let escaped = false;

			pos ++;

			// Scan ahead for the next '=='
			for (; pos < end && (escaped || cx.slice(pos, pos + 2) !== '=='); pos++) {
				if (!escaped && cx.char(pos) === backslashCharcode) {
					escaped = true;
				} else {
					escaped = false;
				}
			}

			// Don't match if the ending '=' is preceded by a space.
			const prevChar = String.fromCharCode(cx.char(pos - 1));
			if (/\s/.exec(prevChar)) {
				return -1;
			}

			// It isn't highlighted if there's no ending '=='
			if (pos === end) {
				return -1;
			}

			// Advance to just after the ending '=='
			pos += 2;

			// Add the nodes
			const startMarkerElem = cx.elt(highlightMarkerTagName, start, start + 2);
			const endMarkerElem = cx.elt(highlightMarkerTagName, pos - 2, pos);
			const highlightElem = cx.elt(highlightTagName, start, pos, [startMarkerElem, endMarkerElem]);
			cx.addElement(highlightElem);

			return pos + 1;
		},
	}],
};

const MarkdownHighlightExtension: MarkdownConfig[] = [
	HighlightConfig,
];
export default MarkdownHighlightExtension;
