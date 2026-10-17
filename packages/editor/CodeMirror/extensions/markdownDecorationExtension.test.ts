import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testing/createTestEditor';
import decoratorExtension from './markdownDecorationExtension';

jest.retryTimes(2);

describe('markdownDecorationExtension', () => {
	it('should highlight code blocks within tables', async () => {
		// Regression test for https://github.com/laurent22/joplin/issues/9477
		const editorText = `
left    | right
--------|-------
\`foo\` | bar  
		`;
		const editor = await createTestEditor(
			editorText,

			// Put the initial cursor at the start of "foo"
			EditorSelection.cursor(editorText.indexOf('foo')),

			['TableRow', 'InlineCode'],
			[decoratorExtension],
		);

		const codeBlock = editor.contentDOM.querySelector('.cm-inlineCode');

		expect(codeBlock.textContent).toBe('`foo`');
		expect(codeBlock.parentElement.classList.contains('.cm-tableRow'));
	});

	test.each([
		0,
		'before ++'.length + 1,
	])('should decorate ++insert++ spans when the caret is at %i', async cursorPos => {
		const editorText = 'before ++inserted++ after';
		const editor = await createTestEditor(
			editorText,
			EditorSelection.cursor(cursorPos),
			['Insert'],
			[decoratorExtension],
		);

		const insertSpan = editor.contentDOM.querySelector('.cm-insert');
		expect(insertSpan).not.toBeNull();
		expect(insertSpan?.textContent).toContain('inserted');
	});
	it('keeps selections visible within highlighted text', async () => {
		const editorText = 'This is ==highlighted text==';
		const highlightedText = 'highlighted';
		const highlightStart = editorText.indexOf(highlightedText);
		const editor = await createTestEditor(
			editorText,
			EditorSelection.cursor(0),
			['Highlight'],
			[decoratorExtension],
		);

		editor.dispatch({
			selection: EditorSelection.range(
				highlightStart,
				highlightStart + highlightedText.length,
			),
		});

		const selectedHighlight = editor.contentDOM.querySelector('.cm-highlighted-selected');
		expect(selectedHighlight).not.toBeNull();
		expect(selectedHighlight?.textContent).toBe(highlightedText);
	});

});
