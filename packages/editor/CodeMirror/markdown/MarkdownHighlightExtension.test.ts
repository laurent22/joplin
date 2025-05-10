import { EditorSelection, EditorState } from '@codemirror/state';

import createTestEditor from '../testUtil/createTestEditor';
import findNodesWithName from '../testUtil/findNodesWithName';
import { highlightMarkerTagName, highlightTagName } from './MarkdownHighlightExtension';

const createEditorState = async (initialText: string, expectedTags: string[]): Promise<EditorState> => {
	return (await createTestEditor(initialText, EditorSelection.cursor(0), expectedTags)).state;
};


describe('MarkdownHighlightExtension', () => {
	jest.retryTimes(2);

	it.each([
		{ // Should support single-word highlights
			text: '==highlight==',
			expectedHighlightRanges: [{ from: 0, to: '==highlight=='.length }],
			expectedMarkerRanges: [
				{ from: 0, to: 2 },
				{ from: '==highlight'.length, to: '==highlight=='.length },
			],
		},
		{ // Should support multi-word highlights
			text: '==highlight test==',
			expectedHighlightRanges: [{ from: 0, to: '==highlight test=='.length }],
			expectedMarkerRanges: [
				{ from: 0, to: 2 },
				{ from: '==highlight test'.length, to: '==highlight test=='.length },
			],
		},
		{ // Should support within-word highlights
			text: 'test==ing==',
			expectedHighlightRanges: [{ from: 'test'.length, to: 'test==ing=='.length }],
		},
		{ // Should not highlight if just one =
			text: 'test==ing=',
			expectedHighlightRanges: [],
		},
		{ // Should not highlight within code
			text: '`==highlight test==`',
			expectedHighlightRanges: [],
			expectedMarkerRanges: [],
		},
		{ // Should highlight across line breaks
			text: '==highlight\ntest== test',
			expectedHighlightRanges: [{ from: 0, to: '==highlight\ntest=='.length }],
		},
		{ // Should not highlight across paragraph breaks
			text: '==highlight\n\ntest== test',
			expectedHighlightRanges: [],
			expectedMarkerRanges: [],
		},
	])('should parse inline highlights (case %#: %j)', async ({ text, expectedHighlightRanges, expectedMarkerRanges }) => {
		const expectedNodes: string[] = [];
		if (expectedHighlightRanges.length) {
			expectedNodes.push(highlightTagName);
		}
		if (expectedMarkerRanges?.length) {
			expectedNodes.push(highlightMarkerTagName);
		}

		const editor = await createEditorState(text, expectedNodes);

		const highlightNodes = findNodesWithName(editor, highlightTagName);
		expect(highlightNodes).toMatchObject(expectedHighlightRanges);

		if (expectedMarkerRanges) {
			const markerNodes = findNodesWithName(editor, highlightMarkerTagName);
			expect(markerNodes).toMatchObject(expectedMarkerRanges);
		}
	});
});
