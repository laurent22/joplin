import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../../testing/createTestEditor';
import replaceFormatCharacters from '../replaceFormatCharacters';

describe('makeInlineReplaceExtension', () => {
	it.each([
		{ label: 'forward', selection: EditorSelection.range(2, 6), expectedSelection: { anchor: 0, head: 8 } },
		{ label: 'backward', selection: EditorSelection.range(6, 2), expectedSelection: { anchor: 8, head: 0 } },
	])('should include hidden Markdown formatting characters in a $label mouse selection', async ({
		selection, expectedSelection,
	}) => {
		const markdown = '**bold**\n';
		const editor = await createTestEditor(
			markdown,
			EditorSelection.cursor(markdown.length),
			['StrongEmphasis'],
			[replaceFormatCharacters],
		);

		editor.dom.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
		editor.dispatch({ selection });

		expect(editor.state.selection.main).toMatchObject({
			anchor: selection.anchor,
			head: selection.head,
		});

		editor.dom.ownerDocument.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));

		expect(editor.state.selection.main).toMatchObject(expectedSelection);
	});
});
