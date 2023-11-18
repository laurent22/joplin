import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testUtil/createTestEditor';
import { EditorView } from '@codemirror/view';

const pasteText = (editor: EditorView, text: string) => {
	const clipboardData = new DataTransfer();
	clipboardData.setData('text/plain', text);
	editor.contentDOM.dispatchEvent(new ClipboardEvent('paste', {
		clipboardData,
	}));
};

jest.retryTimes(2);

describe('fastLinksExtension', () => {
	test('should convert selection to link when pasting URLs', async () => {
		const testWithUrl = async (url: string) => {
			const initialText = 'a test';
			const editor = await createTestEditor(
				initialText,
				EditorSelection.range(2, 6), // selects "test"
				[],
			);

			pasteText(editor, url);
			const expected = `a [test](${url})`;
			expect(editor.state.doc.toString()).toBe(expected);

			// New content should be selected
			expect(editor.state.selection.ranges).toHaveLength(1);
			expect(editor.state.selection.main.from).toBe(2);
			expect(editor.state.selection.main.to).toBe(editor.state.doc.length);

			// Should replace if selection contains a URL
			pasteText(editor, `${url}`);
			expect(editor.state.doc.toString()).toBe(`a ${url}`);
		};

		await testWithUrl('http://example.com/');
		await testWithUrl('https://example.com/');
		await testWithUrl(':/someuuidhere');
	});

	test('should not convert selection to link when pasting non-urls', async () => {
		const initialText = 'Test';
		const editor = await createTestEditor(
			initialText,
			EditorSelection.range(0, initialText.length),
			[],
		);

		pasteText(editor, 'test');
		expect(editor.state.doc.toString()).toBe('test');

		const notJustAUrl = 'this https://example.com/ is not just a URL';
		pasteText(editor, notJustAUrl);
		expect(editor.state.doc.toString()).toBe(`test${notJustAUrl}`);
	});
});
