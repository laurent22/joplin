import { tags, Tag } from '@lezer/highlight';
import { MarkdownConfig, InlineContext, MarkdownExtension } from '@lezer/markdown';

const equalsSignCharcode = 61;

export const highlightTagName = 'Highlight';
export const highlightMarkerTagName = 'HighlightMarker';

export const highlightTag = Tag.define();
export const highlightMarkerTag = Tag.define(tags.meta);

const HighlightDelimiter = { resolve: highlightTagName, mark: highlightMarkerTagName };

const isSpaceOrEmpty = (text: string) => text.match(/^\s*$/);

// Markdown extension for recognizing highlighting. This is similar to the upstream
// extension for strikethrough:
// https://github.com/lezer-parser/markdown/blob/d6f0aa095722329a0188b9c7afe207dab4835e55/src/extension.ts#L10
const highlightConfig: MarkdownConfig = {
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

		parse(cx: InlineContext, current: number, pos: number): number {
			const nextCharCode = cx.char(pos + 1);
			const nextNextCharCode = cx.char(pos + 2);
			if (current !== equalsSignCharcode || nextCharCode !== equalsSignCharcode || nextNextCharCode === equalsSignCharcode) {
				return -1;
			}

			const before = cx.slice(pos - 1, pos);
			const after = cx.slice(pos + 2, pos + 3);

			const spaceBefore = isSpaceOrEmpty(before);
			const spaceAfter = isSpaceOrEmpty(after);
			const canStart = !spaceAfter;
			const canEnd = !spaceBefore;

			if (!canStart && !canEnd) {
				return -1;
			}

			return cx.addDelimiter(
				HighlightDelimiter,
				pos, pos + 2,
				canStart,
				canEnd,
			);
		},
	}],
};

const markdownHighlightExtension: MarkdownExtension = [
	highlightConfig,
];
export default markdownHighlightExtension;
