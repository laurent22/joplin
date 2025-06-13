import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testUtil/createTestEditor';
import jumpToHash from './jumpToHash';

describe('jumpToHash', () => {
	test.each([
		{
			doc: 'This is an anchor: <a id="test">Test</a>',
			expectedCursorLocation: 'This is an anchor: <a id="test">'.length,
			waitForTags: ['HTMLTag'],
		},
		{
			doc: '<div>HTML block: This is an anchor: <a id="test">Test</a></div>',
			expectedCursorLocation: '<div>HTML block: This is an anchor: <a id="test">'.length,
			waitForTags: ['HTMLBlock'],
		},
	])('should support jumping to elements with ID set to "test" (case %#)', async ({ doc: docText, expectedCursorLocation, waitForTags }) => {
		const editor = await createTestEditor(
			docText,
			EditorSelection.cursor(1),
			waitForTags,
		);
		expect(jumpToHash(editor, 'test')).toBe(true);
		const cursorPosition = editor.state.selection.main.anchor;
		expect(
			editor.state.sliceDoc(0, cursorPosition),
		).toBe(
			editor.state.sliceDoc(0, expectedCursorLocation),
		);
	});

	test('should jump to Markdown headers', async () => {
		const editor = await createTestEditor(
			'Line 1\n## Line 2',
			EditorSelection.cursor(0),
			['ATXHeading2'],
		);
		expect(jumpToHash(editor, 'line-2')).toBe(true);
		expect(editor.state.selection.main.anchor).toBe(editor.state.doc.length);
	});
});
